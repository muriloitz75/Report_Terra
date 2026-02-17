import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
    baseURL: API_URL
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
    async (config) => {
        const session = await getSession();
        if (session && (session as any).accessToken) {
            config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: redirecionar ao login se o backend retornar 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            await signOut({ redirect: true, callbackUrl: '/login' });
        }
        return Promise.reject(error);
    }
);

export interface KPIStats {
    total: number;
    encerrados: number;
    andamento: number;
    atrasados: number;
    by_month: { month_year: string; total: number; encerrados: number; andamento: number; atrasados: number }[];
    by_type: { type: string; count: number }[];
    by_type_delayed?: { type: string; count: number }[];
    all_statuses?: string[];
    all_types?: string[];
    available_months?: string[];
}

export interface Process {
    id: string;
    contribuinte: string;
    data_abertura: string;
    ano: string;
    status: string;
    setor_atual: string;
    tipo_solicitacao: string;
    dias_atraso_pdf: number;
    dias_atraso_calc: number;
    is_atrasado: boolean;
}

export interface PaginatedProcesses {
    data: Process[];
    total: number;
    page: number;
    pages: number;
}

export interface UploadStatus {
    status: 'idle' | 'processing' | 'completed' | 'error';
    message: string;
    processed_count: number;
    error?: string;
}

export const getUploadStatus = async (): Promise<UploadStatus> => {
    const response = await api.get('/upload/status');
    return response.data;
};

export const uploadPDF = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
        timeout: 300000 // 5 minutes timeout for large PDFs
    });
    return response.data;
};

export const getStats = async (startDate = '', endDate = ''): Promise<KPIStats> => {
    const params = { start_date: startDate, end_date: endDate };
    const response = await api.get('/stats', { params });
    return response.data;
};

export const getProcesses = async (page = 1, limit = 10, search = '', typeFilter: string[] = [], statusFilter: string[] = [], startDate = '', endDate = '', onlyDelayed = false): Promise<PaginatedProcesses> => {
    const typeParam = typeFilter.join(',');
    const statusParam = statusFilter.join(',');
    const params = { page, limit, search, type_filter: typeParam, status_filter: statusParam, start_date: startDate, end_date: endDate, only_delayed: onlyDelayed };

    const response = await api.get('/processes', { params });
    return response.data;
};

export const exportExcel = async (search = '', typeFilter: string[] = [], statusFilter: string[] = [], startDate = '', endDate = '', onlyDelayed = false): Promise<void> => {
    const typeParam = typeFilter.join(',');
    const statusParam = statusFilter.join(',');
    const params = { search, type_filter: typeParam, status_filter: statusParam, start_date: startDate, end_date: endDate, only_delayed: onlyDelayed };

    const response = await api.get('/export-excel', { params, responseType: 'blob' });

    const contentDisposition = response.headers['content-disposition'];
    const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
    const filename = filenameMatch ? filenameMatch[1] : 'Report_Terra_Processos.xlsx';

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const clearRecords = async (): Promise<{ message: string; cleared: number }> => {
    const response = await api.delete('/clear');
    return response.data;
};

export const submitFeedback = async (
    userId: string,
    reportContent: string,
    rating: 'positive' | 'negative'
): Promise<{ message: string; status: string }> => {
    const response = await api.post('/api/feedback', {
        user_id: userId,
        report_content: reportContent,
        rating: rating
    });
    return response.data;
};

export const generateReport = async (
    onChunk: (chunk: string) => void,
    search = '',
    typeFilter: string[] = [],
    statusFilter: string[] = [],
    startDate = '',
    endDate = '',
    onlyDelayed = false,
    userPrompt = ''
) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (onlyDelayed) params.append('only_delayed', 'true');
    if (userPrompt) params.append('user_prompt', userPrompt);
    if (typeFilter.length > 0) params.append('type_filter', typeFilter.join(','));
    if (statusFilter.length > 0) params.append('status_filter', statusFilter.join(','));

    // Note: We use fetch here because axios doesn't support streaming response body as easily in browser
    const session = await getSession();
    const token = (session as any)?.accessToken;
    const response = await fetch(`${API_URL}/api/generate-report?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
    }
};

export interface AdminUser {
    id: number;
    email: string;
    full_name?: string;
    role: string;
    can_generate_report: boolean;
    is_active: boolean;
    created_at: string;
}

export const getAdminUsers = async (): Promise<AdminUser[]> => {
    const response = await api.get('/admin/users');
    return response.data;
};

export const updateAdminUser = async (
    id: number,
    data: Partial<Pick<AdminUser, 'role' | 'can_generate_report' | 'is_active'>>
): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response.data;
};

export const createAdminUser = async (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    can_generate_report?: boolean;
}): Promise<AdminUser> => {
    const response = await api.post('/admin/users', data);
    return response.data;
};

export const deactivateAdminUser = async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
};

export const deleteAdminUser = async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/users/${id}/permanent`);
    return response.data;
};

// --- AUDIT ---

export interface AuditSummary {
    total_users: number;
    active_users_today: number;
    active_users_week: number;
    active_users_month: number;
    total_logins_today: number;
    total_logins_week: number;
    failed_logins_today: number;
}

export interface AuditUser {
    user_id: number;
    email: string;
    full_name?: string;
    role: string;
    is_active: boolean;
    last_login: string | null;
    login_count_7d: number;
    login_count_30d: number;
    total_processes: number;
    created_at: string;
}

export interface DailyLogin {
    date: string;
    logins: number;
    unique_users: number;
}

export interface ActivityEntry {
    action: string;
    ip_address: string | null;
    user_agent: string | null;
    timestamp: string;
}

export const getAuditSummary = async (): Promise<AuditSummary> => {
    const response = await api.get('/admin/audit/summary');
    return response.data;
};

export const getAuditUsers = async (): Promise<AuditUser[]> => {
    const response = await api.get('/admin/audit/users');
    return response.data;
};

export const getAuditActivity = async (days = 30): Promise<{ daily_logins: DailyLogin[] }> => {
    const response = await api.get('/admin/audit/activity', { params: { days } });
    return response.data;
};

export const getAuditUserHistory = async (userId: number, limit = 50): Promise<ActivityEntry[]> => {
    const response = await api.get(`/admin/audit/user/${userId}/history`, { params: { limit } });
    return response.data;
};

export const shutdownApp = async (): Promise<void> => {
    try {
        await api.post('/api/shutdown');
    } catch (e) {
        // Ignore error as server dies
    }
};

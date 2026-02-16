
import axios from 'axios';

// In production (unified deploy), use relative URL (empty string = same origin).
// In development, set NEXT_PUBLIC_API_URL=http://localhost:8000
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
    const response = await axios.get(`${API_URL}/upload/status`);
    return response.data;
};

export const uploadPDF = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };

    const response = await axios.post(`${API_URL}/upload`, formData, {
        headers,
        timeout: 300000 // 5 minutes timeout for large PDFs
    });
    return response.data;
};

export const getStats = async (startDate = '', endDate = ''): Promise<KPIStats> => {
    const params = { start_date: startDate, end_date: endDate };
    const response = await axios.get(`${API_URL}/stats`, { params });
    return response.data;
};

export const getProcesses = async (page = 1, limit = 10, search = '', typeFilter: string[] = [], statusFilter: string[] = [], startDate = '', endDate = '', onlyDelayed = false): Promise<PaginatedProcesses> => {
    const typeParam = typeFilter.join(',');
    const statusParam = statusFilter.join(',');
    const params = { page, limit, search, type_filter: typeParam, status_filter: statusParam, start_date: startDate, end_date: endDate, only_delayed: onlyDelayed };

    const response = await axios.get(`${API_URL}/processes`, { params });
    return response.data;
};

export const exportExcel = async (search = '', typeFilter: string[] = [], statusFilter: string[] = [], startDate = '', endDate = '', onlyDelayed = false): Promise<void> => {
    const typeParam = typeFilter.join(',');
    const statusParam = statusFilter.join(',');
    const params = { search, type_filter: typeParam, status_filter: statusParam, start_date: startDate, end_date: endDate, only_delayed: onlyDelayed };

    const response = await axios.get(`${API_URL}/export-excel`, { params, responseType: 'blob' });

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
    const response = await axios.delete(`${API_URL}/clear`);
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
    const response = await fetch(`${API_URL}/api/generate-report?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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

export const shutdownApp = async (): Promise<void> => {
    try {
        await axios.post(`${API_URL}/api/shutdown`);
    } catch (e) {
        // Ignore error as server dies
        console.log("Server shutdown signal sent");
    }
};

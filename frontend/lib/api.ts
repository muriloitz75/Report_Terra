
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

export const uploadPDF = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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

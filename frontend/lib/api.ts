
import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface KPIStats {
    total: number;
    encerrados: number;
    andamento: number;
    atrasados: number;
    by_month: { month_year: string; total: number; encerrados: number; andamento: number; atrasados: number }[];
    by_type: { type: string; count: number }[];
    all_statuses?: string[];
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

export const getStats = async (monthFilter = ''): Promise<KPIStats> => {
    const params = { month_filter: monthFilter };
    const response = await axios.get(`${API_URL}/stats`, { params });
    return response.data;
};

export const getProcesses = async (page = 1, limit = 10, search = '', typeFilter = '', statusFilter: string[] = [], monthFilter = '', onlyDelayed = false): Promise<PaginatedProcesses> => {
    const statusParam = statusFilter.join(',');
    const params = { page, limit, search, type_filter: typeFilter, status_filter: statusParam, month_filter: monthFilter, only_delayed: onlyDelayed };
    const response = await axios.get(`${API_URL}/processes`, { params });
    return response.data;
};

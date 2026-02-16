"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateReport as apiGenerateReport } from '@/lib/api';

interface ReportContextType {
    report: string;
    loading: boolean;
    generate: (
        search?: string,
        typeFilter?: string[],
        statusFilter?: string[],
        fromParam?: string,
        toParam?: string,
        onlyDelayed?: boolean,
        prompt?: string
    ) => Promise<void>;
    clearReport: () => void;
    setReport: (report: string) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
    const [report, setReport] = useState("");
    const [loading, setLoading] = useState(false);

    // Load saved report on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedReport = localStorage.getItem("ai_report_data");
            if (savedReport) {
                setReport(savedReport);
            }
        }
    }, []);

    // Save report when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (report) {
                localStorage.setItem("ai_report_data", report);
            } else if (report === "") {
                // If explicitly cleared (and not just initial empty state if we distinguish)
                // specific logic is handled in clearReport, but simple sync is good.
                // However, avoiding clearing localstorage on initial empty render is tricky if we don't track mounted.
                // But simplified: clearReport removes it.
            }
        }
    }, [report]);

    const generate = async (
        search = '',
        typeFilter: string[] = [],
        statusFilter: string[] = [],
        fromParam = '',
        toParam = '',
        onlyDelayed = false,
        prompt = ''
    ) => {
        setLoading(true);
        setReport("");
        localStorage.removeItem("ai_report_data");

        try {
            await apiGenerateReport(
                (chunk) => setReport(prev => prev + chunk),
                search,
                typeFilter,
                statusFilter,
                fromParam,
                toParam,
                onlyDelayed,
                prompt
            );
        } catch (error) {
            console.error(error);
            setReport("Erro ao gerar análise. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const clearReport = () => {
        setReport("");
        localStorage.removeItem("ai_report_data");
    };

    return (
        <ReportContext.Provider value={{ report, loading, generate, clearReport, setReport }}>
            {children}
        </ReportContext.Provider>
    );
}

export function useReport() {
    const context = useContext(ReportContext);
    if (context === undefined) {
        throw new Error('useReport must be used within a ReportProvider');
    }
    return context;
}

"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from "lucide-react";

interface StatisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipoSolicitacao: string | null;
    periodoInicio: string | null;
    periodoFim: string | null;
    accessToken: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 text-base">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 text-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-600 dark:text-slate-400 font-medium capitalize">{entry.name}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export function StatisticsModal({
    isOpen,
    onClose,
    tipoSolicitacao,
    periodoInicio,
    periodoFim,
    accessToken
}: StatisticsModalProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tipoSolicitacao) {
            setLoading(true);
            setError(null);

            const fetchEvolution = async () => {
                try {
                    const params = new URLSearchParams();
                    params.append('tipo_solicitacao', tipoSolicitacao);
                    if (periodoInicio) params.append('periodo_inicio', periodoInicio);
                    if (periodoFim) params.append('periodo_fim', periodoFim);

                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
                    const res = await fetch(`${apiUrl}/api/statistics/evolution?${params.toString()}`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!res.ok) {
                        throw new Error('Falha ao obter dados estatísticos');
                    }

                    const json = await res.json();

                    // Add some synthetic padding to make charts look great even with small datasets
                    const processed = json.data || [];
                    setData(processed);
                } catch (err: any) {
                    setError(err.message || 'Erro desconhecido');
                } finally {
                    setLoading(false);
                }
            };

            fetchEvolution();
        }
    }, [isOpen, tipoSolicitacao, periodoInicio, periodoFim, accessToken]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] md:w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
                <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 md:px-8 border-b border-slate-100 dark:border-slate-800/60">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600 dark:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                            Evolução Mensal
                        </DialogTitle>
                        <DialogDescription className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {tipoSolicitacao}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 md:px-8 bg-white dark:bg-slate-950">
                    <div className="w-full h-[450px]">
                        {loading ? (
                            <div className="flex h-full w-full items-center justify-center flex-col gap-4 animate-in fade-in duration-500">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Processando estatísticas no servidor...</p>
                            </div>
                        ) : error ? (
                            <div className="flex h-full w-full items-center justify-center flex-col gap-3">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                </div>
                                <span className="text-red-600 dark:text-red-400 font-medium text-center px-4">{error}</span>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex h-full w-full items-center justify-center flex-col gap-3">
                                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-full text-slate-400 dark:text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                </div>
                                <span className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Nenhum registro para o período selecionado.</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={2}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }}
                                        dy={15}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }}
                                        dx={-10}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.05)' }} />
                                    <Legend
                                        wrapperStyle={{ paddingTop: '30px', paddingBottom: '10px' }}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-700 dark:text-slate-300 font-medium ml-1.5">{value}</span>}
                                    />
                                    <Bar dataKey="Total" name="Total (Geral)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                                    <Bar dataKey="Encerrados" name="Concluídos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                                    <Bar dataKey="Andamento" name="Em Andamento" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                                    <Bar dataKey="Atrasados" name="Com Atraso" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

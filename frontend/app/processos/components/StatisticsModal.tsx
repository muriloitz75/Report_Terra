"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as htmlToImage from "html-to-image";

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
        // Detectar se é mobile
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        
        return (
            <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl ${isMobile ? 'p-2.5 max-w-[180px]' : 'p-4'}`}>
                <p className={`font-semibold text-slate-800 dark:text-slate-200 ${isMobile ? 'mb-1.5 pb-1.5 text-xs' : 'mb-3 pb-2 text-base'} border-b border-slate-100 dark:border-slate-800`}>{label}</p>
                <div className={isMobile ? 'space-y-1' : 'space-y-2'}>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className={`flex items-center justify-between ${isMobile ? 'gap-3 text-xs' : 'gap-6 text-sm'}`}>
                            <div className="flex items-center gap-1.5">
                                <div className={`rounded-full ring-1 ring-white dark:ring-slate-900 ${isMobile ? 'w-2 h-2' : 'w-3.5 h-3.5'}`} style={{ backgroundColor: entry.color }} />
                                <span className={`text-slate-600 dark:text-slate-400 ${isMobile ? 'font-medium text-[10px]' : 'font-medium capitalize'}`}>{entry.name}</span>
                            </div>
                            <span className={`font-bold text-slate-900 dark:text-slate-100 ${isMobile ? 'text-xs' : ''}`}>{entry.value}</span>
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
    const chartRef = useRef<HTMLDivElement>(null);

    const getChartBlob = async (): Promise<Blob | null> => {
        if (!chartRef.current) return null;
        const isDark = document.documentElement.classList.contains("dark");
        const backgroundColor = isDark ? "#0f172a" : "#ffffff";

        // Caminho preferencial: exportar diretamente o SVG do Recharts
        try {
            const svg = chartRef.current.querySelector("svg") as SVGSVGElement | null;
            if (svg) {
                const bbox = svg.getBoundingClientRect();
                const width = Math.ceil(bbox.width);
                const height = Math.ceil(bbox.height);
                const cloned = svg.cloneNode(true) as SVGSVGElement;
                cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                cloned.setAttribute("width", String(width));
                cloned.setAttribute("height", String(height));
                if (!cloned.getAttribute("viewBox")) {
                    cloned.setAttribute("viewBox", `0 0 ${width} ${height}`);
                }
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("width", "100%");
                rect.setAttribute("height", "100%");
                rect.setAttribute("fill", backgroundColor);
                cloned.insertBefore(rect, cloned.firstChild);

                const serialized = new XMLSerializer().serializeToString(cloned);
                const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);
                try {
                    const img = new Image();
                    img.decoding = "sync";
                    img.crossOrigin = "anonymous";
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = (e) => reject(e);
                        img.src = url;
                    });
                    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.ceil(width * ratio);
                    canvas.height = Math.ceil(height * ratio);
                    const ctx = canvas.getContext("2d");
                    if (!ctx) throw new Error("canvas-context");
                    ctx.scale(ratio, ratio);
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
                    return blob;
                } finally {
                    URL.revokeObjectURL(url);
                }
            }
        } catch {
            /* se falhar, tenta fallback abaixo */
        }

        // Fallback: html-to-image no container (evita fontes para reduzir SecurityError)
        try {
            const dataUrl = await htmlToImage.toPng(chartRef.current, {
                cacheBust: true,
                backgroundColor,
                // @ts-ignore – opção suportada em html-to-image >=1.11
                skipFonts: true
            } as any);
            const res = await fetch(dataUrl);
            return await res.blob();
        } catch {
            return null;
        }
    };

    const downloadPng = async () => {
        const blob = await getChartBlob();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "grafico-evolucao-mensal.png";
        a.click();
        URL.revokeObjectURL(url);
    };

    const shareNative = async (text: string) => {
        try {
            const blob = await getChartBlob();
            if (!blob) throw new Error("no-blob");
            const file = new File([blob], "grafico-evolucao-mensal.png", { type: "image/png" });
            const n: any = navigator;
            if (n.canShare && n.canShare({ files: [file] })) {
                await n.share({
                    files: [file],
                    title: "Evolução Mensal",
                    text
                });
                return;
            }
        } catch {
            /* fallthrough */
        }
        await downloadPng();
    };

    const composeMessage = () => {
        const titulo = "Evolução Mensal";
        const tipo = tipoSolicitacao ? ` • ${tipoSolicitacao}` : "";
        const total = data.reduce((acc, curr) => acc + (curr.Total || 0), 0);
        return `${titulo}${tipo} — Total: ${total}`;
    };

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

                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
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
            <DialogContent className="sm:max-w-[900px] w-[95vw] md:w-[85vw] lg:w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl sm:rounded-2xl border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
                <div className="flex flex-col w-full bg-white dark:bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden">
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 md:px-8 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                                <span className="truncate">Evolução Mensal</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-auto sm:ml-1 h-8 w-8"
                                    title="Compartilhar gráfico"
                                    onClick={() => shareNative(composeMessage())}
                                >
                                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                            </DialogTitle>
                            <DialogDescription className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 line-clamp-2 leading-relaxed">
                                {tipoSolicitacao}
                            </DialogDescription>
                        </DialogHeader>

                        {!loading && !error && data.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg sm:rounded-xl w-full sm:w-auto h-full min-h-[38px] sm:min-h-[42px]">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-blue-600/70 dark:text-blue-400/70 leading-none mb-0.5">Total Acumulado</span>
                                        <span className="text-base sm:text-lg font-black tracking-tight text-blue-700 dark:text-blue-400 leading-none">
                                            {data.reduce((acc, curr) => acc + (curr.Total || 0), 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 sm:p-6 md:px-8 bg-white dark:bg-slate-950">
                        <div ref={chartRef} className="w-full h-[300px] sm:h-[380px] md:h-[450px]">
                            {loading ? (
                                <div className="flex h-full w-full items-center justify-center flex-col gap-3 sm:gap-4 animate-in fade-in duration-500">
                                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-blue-600" />
                                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 text-center px-4">Processando estatísticas no servidor...</p>
                                </div>
                            ) : error ? (
                                <div className="flex h-full w-full items-center justify-center flex-col gap-2 sm:gap-3">
                                    <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    </div>
                                    <span className="text-red-600 dark:text-red-400 font-medium text-center px-4 text-xs sm:text-sm">{error}</span>
                                </div>
                            ) : data.length === 0 ? (
                                <div className="flex h-full w-full items-center justify-center flex-col gap-2 sm:gap-3">
                                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 rounded-full text-slate-400 dark:text-slate-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                    </div>
                                    <span className="text-slate-500 dark:text-slate-400 font-medium tracking-tight text-center px-4 text-xs sm:text-sm">Nenhum registro para o período selecionado.</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }} barGap={2}>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                            dy={10}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                            dx={-5}
                                            allowDecimals={false}
                                            width={30}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.05)' }} />
                                        <Legend
                                            wrapperStyle={{ paddingTop: '20px', paddingBottom: '5px', fontSize: '12px' }}
                                            iconType="circle"
                                            iconSize={10}
                                            formatter={(value) => {
                                                // Abreviar nomes no mobile
                                                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                                                const shortNames: Record<string, string> = {
                                                    'Total (Geral)': 'Total',
                                                    'Concluídos': 'Concl.',
                                                    'Em Andamento': 'Andam.',
                                                    'Com Atraso': 'Atraso'
                                                };
                                                const displayName = isMobile ? (shortNames[value] || value) : value;
                                                return <span className="text-slate-700 dark:text-slate-300 font-medium ml-1 text-xs sm:text-sm">{displayName}</span>;
                                            }}
                                        />
                                        <Bar dataKey="Total" name="Total (Geral)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={800}>
                                            <LabelList dataKey="Total" position="top" offset={8} fill="#64748b" fontSize={10} fontWeight={700} className="hidden sm:block" formatter={(v: any) => v > 0 ? v : ""} />
                                        </Bar>
                                        <Bar dataKey="Encerrados" name="Concluídos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={800}>
                                            <LabelList dataKey="Encerrados" position="top" offset={8} fill="#64748b" fontSize={10} fontWeight={700} className="hidden sm:block" formatter={(v: any) => v > 0 ? v : ""} />
                                        </Bar>
                                        <Bar dataKey="Andamento" name="Em Andamento" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={800}>
                                            <LabelList dataKey="Andamento" position="top" offset={8} fill="#64748b" fontSize={10} fontWeight={700} className="hidden sm:block" formatter={(v: any) => v > 0 ? v : ""} />
                                        </Bar>
                                        <Bar dataKey="Atrasados" name="Com Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={800}>
                                            <LabelList dataKey="Atrasados" position="top" offset={8} fill="#64748b" fontSize={10} fontWeight={700} className="hidden sm:block" formatter={(v: any) => v > 0 ? v : ""} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

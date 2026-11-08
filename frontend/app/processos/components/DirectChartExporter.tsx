"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import * as htmlToImage from "html-to-image";

interface EvolutionPoint {
    date: string;
    Total: number;
    Encerrados: number;
    Andamento: number;
    Atrasados: number;
}

const labelIfPositive = (v: unknown) => (Number(v) > 0 ? String(v) : "");

interface DirectChartExporterProps {
    tiposSolicitacao: string[];
    periodoInicio: string | null;
    periodoFim: string | null;
    accessToken: string;
    onComplete: () => void;
    onError: (errMessage: string) => void;
}

export function DirectChartExporter({
    tiposSolicitacao,
    periodoInicio,
    periodoFim,
    accessToken,
    onComplete,
    onError
}: DirectChartExporterProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartData, setChartData] = useState<EvolutionPoint[] | null>(null);

    // Callbacks em ref: o pai passa arrow functions novas a cada render, e se elas
    // fossem dependência dos efeitos a exportação recomeçaria (PNG baixado duas vezes).
    const onCompleteRef = useRef(onComplete);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onCompleteRef.current = onComplete;
        onErrorRef.current = onError;
    });

    useEffect(() => {
        let isMounted = true;

        const fetchDataAndExport = async () => {
            try {
                const params = new URLSearchParams();
                if (tiposSolicitacao && tiposSolicitacao.length > 0) {
                    params.append('tipo_solicitacao', tiposSolicitacao.join(','));
                }
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
                    throw new Error('Falha ao obter dados estatísticos para o gráfico.');
                }

                const json = await res.json();
                const data: EvolutionPoint[] = json.data || [];

                if (!isMounted) return;

                if (data.length === 0) {
                    throw new Error('Nenhum registro encontrado para gerar o gráfico.');
                }

                setChartData(data);
            } catch (err) {
                if (isMounted) {
                    onErrorRef.current((err instanceof Error && err.message) || 'Erro ao preparar o gráfico para download.');
                }
            }
        };

        fetchDataAndExport();

        return () => {
            isMounted = false;
        };
    }, [tiposSolicitacao, periodoInicio, periodoFim, accessToken]);

    // Executado quando os dados do gráfico forem carregados e renderizados no DOM offscreen
    useEffect(() => {
        if (!chartData || chartData.length === 0) return;

        let isMounted = true;

        const exportImage = async () => {
            try {
                // Aguardar renderização síncrona do Recharts sem animações
                await new Promise((r) => setTimeout(r, 400));

                if (!chartRef.current || !isMounted) return;

                const backgroundColor = "#ffffff";
                let blob: Blob | null = null;

                // 1. Tentar exportação via SVG do Recharts
                try {
                    const svg = chartRef.current.querySelector("svg") as SVGSVGElement | null;
                    if (svg) {
                        const width = 960;
                        const height = 480;
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
                            if (ctx) {
                                ctx.scale(ratio, ratio);
                                ctx.fillStyle = backgroundColor;
                                ctx.fillRect(0, 0, width, height);
                                ctx.drawImage(img, 0, 0, width, height);
                                blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
                            }
                        } finally {
                            URL.revokeObjectURL(url);
                        }
                    }
                } catch (e) {
                    console.warn("SVG export fallback:", e);
                }

                // 2. Fallback via html-to-image
                if (!blob && chartRef.current) {
                    try {
                        const dataUrl = await htmlToImage.toPng(chartRef.current, {
                            cacheBust: true,
                            backgroundColor,
                            skipFonts: true,
                            pixelRatio: 2
                        });
                        const response = await fetch(dataUrl);
                        blob = await response.blob();
                    } catch (e) {
                        console.warn("htmlToImage export fallback:", e);
                    }
                }

                if (blob) {
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    const dateStr = new Date().toISOString().split('T')[0];
                    a.download = `grafico-processos-evolucao-${dateStr}.png`;
                    a.click();
                    // Revogar só depois que o navegador iniciar o download
                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
                    onCompleteRef.current();
                } else {
                    throw new Error('Falha ao gerar a imagem PNG do gráfico.');
                }
            } catch (err) {
                if (isMounted) {
                    onErrorRef.current((err instanceof Error && err.message) || 'Erro durante a captura do gráfico.');
                }
            }
        };

        exportImage();

        return () => {
            isMounted = false;
        };
    }, [chartData]);

    if (!chartData) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: '-9999px',
                top: '0px',
                width: '960px',
                height: '480px',
                pointerEvents: 'none',
                zIndex: -9999,
                overflow: 'hidden',
                backgroundColor: '#ffffff'
            }}
        >
            <div ref={chartRef} style={{ width: '960px', height: '480px', padding: '24px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}>
                <div style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>
                            Evolução Mensal dos Processos
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                            {tiposSolicitacao.length > 0 ? tiposSolicitacao.join(", ") : "Todos os tipos"}
                        </p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '9999px' }}>
                        Report Terra
                    </span>
                </div>
                <div style={{ width: '912px', height: '380px' }}>
                    <BarChart width={912} height={380} data={chartData} margin={{ top: 25, right: 20, left: -10, bottom: 0 }} barGap={2}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                            allowDecimals={false}
                            width={30}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                            iconType="circle"
                            iconSize={10}
                        />
                        <Bar dataKey="Total" name="Total (Geral)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                            <LabelList dataKey="Total" position="top" offset={6} fill="#64748b" fontSize={10} fontWeight={700} formatter={labelIfPositive} />
                        </Bar>
                        <Bar dataKey="Encerrados" name="Concluídos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                            <LabelList dataKey="Encerrados" position="top" offset={6} fill="#64748b" fontSize={10} fontWeight={700} formatter={labelIfPositive} />
                        </Bar>
                        <Bar dataKey="Andamento" name="Em Andamento" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                            <LabelList dataKey="Andamento" position="top" offset={6} fill="#64748b" fontSize={10} fontWeight={700} formatter={labelIfPositive} />
                        </Bar>
                        <Bar dataKey="Atrasados" name="Com Atraso" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                            <LabelList dataKey="Atrasados" position="top" offset={6} fill="#64748b" fontSize={10} fontWeight={700} formatter={labelIfPositive} />
                        </Bar>
                    </BarChart>
                </div>
            </div>
        </div>
    );
}

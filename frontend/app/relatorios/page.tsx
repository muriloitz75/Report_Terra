"use client";

import { useState, useEffect, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';
import { useReport } from '@/context/ReportContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Bot, Loader2, Sparkles, Trash2, Wand2, Download, ThumbsUp, ThumbsDown } from 'lucide-react';



function RelatoriosContent() {
    const { report, loading, generate, clearReport: contextClearReport } = useReport();
    const [prompt, setPrompt] = useState("");
    const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null);

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        typeFilter: [] as string[],
        statusFilter: [] as string[],
        fromParam: '',
        toParam: '',
        onlyDelayed: false,
        loaded: false
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setFilters({
                search: params.get('search') || '',
                typeFilter: params.getAll('type'),
                statusFilter: params.getAll('status'),
                fromParam: params.get('from') || '',
                toParam: params.get('to') || '',
                onlyDelayed: params.get('delayed') === 'true',
                loaded: true
            });
        }
    }, []);

    const clearReport = () => {
        if (confirm("Deseja apagar o relatório salvo?")) {
            contextClearReport();
            setFeedbackGiven(null);
        }
    };

    const handleGenerate = async () => {
        setFeedbackGiven(null);
        await generate(
            filters.search,
            filters.typeFilter,
            filters.statusFilter,
            filters.fromParam,
            filters.toParam,
            filters.onlyDelayed,
            prompt
        );
    };

    const handleImprove = async () => {
        if (!report) return;

        const currentReport = report;

        const improvementPrompt = `CONTEXTO: O usuário solicitou uma versão MELHORADA do relatório abaixo.
        
        INSTRUÇÕES: 
        1. Atue como um Analista de Dados Sênior e Editor Chefe.
        2. Reescreva o relatório para torná-lo mais executivo, direto e perspicaz.
        3. Corrija qualquer erro gramatical ou de coesão.
        4. Melhore a formatação Markdown (use negritos, listas e títulos de forma eficaz).
        5. Mantenha os dados numéricos (se consistentes com o contexto), mas apresente-os de forma mais impactante.
        6. Adicione uma seção de "Conclusão Executiva" se não houver.

        RELATÓRIO ORIGINAL PARA MELHORAR:
        ${currentReport}`;

        setFeedbackGiven(null);
        await generate(
            filters.search,
            filters.typeFilter,
            filters.statusFilter,
            filters.fromParam,
            filters.toParam,
            filters.onlyDelayed,
            improvementPrompt
        );
    };

    const handleFeedback = async (rating: "positive" | "negative") => {
        if (!report || feedbackGiven) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: "default_user", // Hardcoded for local mode
                    report_content: report,
                    rating: rating
                })
            });

            if (response.ok) {
                setFeedbackGiven(rating);
                // Optional: Show toast
            }
        } catch (error) {
            console.error("Error sending feedback:", error);
        }
    };

    const filtersText = filters.loaded ? [
        filters.search ? `Busca: ${filters.search}` : null,
        (filters.fromParam && filters.toParam) ? `Período: ${filters.fromParam} a ${filters.toParam}` : null,
        filters.statusFilter.length ? `Status: ${filters.statusFilter.join(', ')}` : null,
        filters.typeFilter.length ? `Tipos: ${filters.typeFilter.length} selecionados` : null,
        filters.onlyDelayed ? `Apenas Atrasados: Sim` : null
    ].filter(Boolean).join(' | ') : '';

    const handleExportTxt = () => {
        if (!report) return;

        const date = new Date().toLocaleString('pt-BR');

        const officialContent = `
================================================================================
                        RELATÓRIO OFICIAL DE ANÁLISE - REPORT TERRA
================================================================================
DATA DE EMISSÃO: ${date}
SOLICITANTE: Usuário do Sistema
CONTEXTO DA ANÁLISE: ${filtersText || "Geral (Sem filtros aplicados)"}
--------------------------------------------------------------------------------

${report}

--------------------------------------------------------------------------------
Este documento foi gerado automaticamente pelo sistema Report Terra AI.
Todas as informações são baseadas nos dados disponíveis no momento da geração.
================================================================================
`.trim();

        const blob = new Blob([officialContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_analise_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Header Minimalista */}
            <header className="flex-none p-4 border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
                        <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">Agente de Relatórios</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {filtersText ? `Contexto: ${filtersText}` : "Análise Inteligente"}
                        </p>
                    </div>
                </div>
                {report && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-2 border-r pr-3 border-slate-200 dark:border-slate-700">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback("positive")}
                                disabled={!!feedbackGiven}
                                className={`h-8 w-8 px-0 ${feedbackGiven === 'positive' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-slate-400 hover:text-green-600'}`}
                                title="Gostei! (Usar como exemplo futuro)"
                            >
                                <ThumbsUp className={`w-4 h-4 ${feedbackGiven === 'positive' ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFeedback("negative")}
                                disabled={!!feedbackGiven}
                                className={`h-8 w-8 px-0 ${feedbackGiven === 'negative' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-slate-400 hover:text-red-600'}`}
                                title="Não gostei"
                            >
                                <ThumbsDown className={`w-4 h-4 ${feedbackGiven === 'negative' ? 'fill-current' : ''}`} />
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportTxt}
                            disabled={loading}
                            title="Baixar TXT"
                            className="h-8"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Exportar</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearReport}
                            className="h-8 text-slate-500 hover:text-red-500"
                            title="Limpar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative group">
                <div className="max-w-5xl mx-auto min-h-full pb-32">
                    {report ? (
                        <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
                            <CardContent className="p-8 md:p-12">
                                <article className="prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-blue-600 max-w-none break-words w-full">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            table: ({ node, ...props }) => (
                                                <div className="overflow-x-auto my-6 w-full rounded-lg border border-slate-200 dark:border-slate-800">
                                                    <table {...props} className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400" />
                                                </div>
                                            ),
                                            thead: ({ node, ...props }) => (
                                                <thead {...props} className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400" />
                                            ),
                                            th: ({ node, ...props }) => (
                                                <th {...props} className="px-6 py-3 whitespace-nowrap font-bold" />
                                            ),
                                            td: ({ node, ...props }) => (
                                                <td {...props} className="px-6 py-4 border-t border-slate-100 dark:border-slate-800" />
                                            ),
                                            pre: ({ node, ...props }) => (
                                                <div className="overflow-x-auto my-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                                    <pre {...props} className="m-0 whitespace-pre font-mono text-sm" />
                                                </div>
                                            ),
                                            code: ({ node, ...props }) => (
                                                <code {...props} className="break-words whitespace-pre-wrap font-mono text-sm bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5" />
                                            ),
                                            p: ({ node, ...props }) => (
                                                <p {...props} className="text-justify mb-4 last:mb-0 leading-relaxed" />
                                            )
                                        }}
                                    >
                                        {report}
                                    </ReactMarkdown>
                                </article>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 mt-20 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                            <div className="w-20 h-20 bg-gradient-to-tr from-purple-100 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/50 dark:ring-white/10 shadow-xl">
                                <Sparkles className="w-10 h-10 text-purple-500/80" />
                            </div>
                            <div className="space-y-2 max-w-md">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Como posso ajudar na sua análise?</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Posso analisar os {filters.typeFilter.length || 'vários'} tipos de processos{filters.statusFilter.length ? ` com status ${filters.statusFilter.join(', ')}` : ''},
                                    identificar gargalos e sugerir melhorias operacionais.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 px-4 justify-start text-left normal-case border-slate-200 hover:border-purple-300 hover:bg-purple-50 dark:border-slate-800 dark:hover:border-purple-700 dark:hover:bg-purple-900/10 transition-all group"
                                    onClick={() => setPrompt("Analise os principais motivos de atraso e sugira 3 ações corretivas.")}
                                >
                                    <div>
                                        <span className="block font-medium text-slate-700 dark:text-slate-200 mb-1 group-hover:text-purple-700 dark:group-hover:text-purple-300">Motivos de Atraso</span>
                                        <span className="text-xs text-slate-400">Identificar gargalos críticos</span>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 px-4 justify-start text-left normal-case border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/10 transition-all group"
                                    onClick={() => setPrompt("Crie um resumo executivo do desempenho deste mês comparado ao anterior.")}
                                >
                                    <div>
                                        <span className="block font-medium text-slate-700 dark:text-slate-200 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-300">Resumo Executivo</span>
                                        <span className="text-xs text-slate-400">Desempenho mensal</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Input Area - Fixed Bottom */}
            <div className="flex-none p-4 pb-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pt-10">
                <div className="max-w-5xl mx-auto relative">
                    {report && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleImprove}
                                disabled={loading}
                                className="shadow-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur border hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full px-4 h-9"
                            >
                                <Wand2 className="w-3.5 h-3.5 mr-2" />
                                Melhorar Escrita
                            </Button>
                        </div>
                    )}

                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-purple-500/50 transition-shadow">
                        <Textarea
                            placeholder="Descreva o que deseja analisar ou refinar..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                            className="w-full min-h-[60px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none py-4 pl-4 pr-14 text-sm md:text-base scrollbar-hide"
                        />
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            size="icon"
                            className="absolute right-2 bottom-2 h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 fill-white" />
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                        Report Terra AI pode cometer erros. Verifique as informações importantes.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RelatoriosPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600 dark:text-purple-400 mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Carregando contexto de análise...</p>
            </div>
        }>
            <RelatoriosContent />
        </Suspense>
    );
}

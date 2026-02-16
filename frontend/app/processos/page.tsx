"use client";

import { useState, useEffect } from 'react';
import { uploadPDF, getStats, getProcesses, exportExcel, clearRecords, PaginatedProcesses, getUploadStatus, KPIStats } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, RefreshCw, AlertCircle, Check, ListFilter, Loader2, Search, Download, FilterX, TableProperties, Trash2, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DatePickerWithRange } from "@/components/date-range-picker";
import { ModeToggle as ThemeToggle } from "@/components/mode-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function ProcessosPage() {
    const [stats, setStats] = useState<KPIStats | null>(null); // Still needed for filter options
    const [processes, setProcesses] = useState<PaginatedProcesses | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");

    // Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [onlyDelayed, setOnlyDelayed] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Helper to load filter options (stats)
    const loadStats = async () => {
        try {
            const s = await getStats();
            setStats(s);
        } catch (e) { console.error(e); }
    }

    const loadData = async () => {
        setLoading(true);
        try {
            const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

            // Load stats only if we don't have them yet (for filter options)
            if (!stats) await loadStats();

            const processesData = await getProcesses(page, 10, search, typeFilter, statusFilter, from, to, onlyDelayed);
            setProcesses(processesData);

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, search, typeFilter, statusFilter, dateRange, onlyDelayed]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploading(true);
        setUploadMessage("Enviando arquivo...");

        try {
            // 1. Send File (Returns immediately with 200/202)
            await uploadPDF(e.target.files[0]);

            // 2. Start Polling
            setUploadMessage("Processando PDF (0%)...");

            const interval = setInterval(async () => {
                try {
                    const status = await getUploadStatus();

                    if (status.status === 'processing') {
                        setUploadMessage(status.message || "Processando...");
                    } else if (status.status === 'completed') {
                        clearInterval(interval);
                        setUploadMessage("Concluído!");

                        // Refresh Data
                        setDateRange(undefined);
                        setPage(1);
                        await loadData();
                        await loadStats(); // Refresh stats for new filter options

                        // Reset UI after short delay
                        setTimeout(() => {
                            setUploading(false);
                            setUploadMessage("");
                        }, 1000);
                    } else if (status.status === 'error') {
                        clearInterval(interval);
                        setUploading(false);
                        setUploadMessage("");
                        alert(`Erro no processamento: ${status.error}`);
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 1000); // Check every 1s

        } catch (error: any) {
            setUploading(false);
            setUploadMessage("");
            if (error.response?.status === 409) {
                alert("Já existe um arquivo sendo processado. Por favor, aguarde.");
            } else {
                console.error(error);
                alert("Erro ao enviar arquivo PDF");
            }
        }
    };

    const statusOptions = stats?.all_statuses || ["ENCERRAMENTO", "ANDAMENTO", "INDEFERIDO", "DEFERIDO"];



    return (
        <div className="p-8 space-y-8 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <TableProperties className="w-8 h-8 text-blue-600" />
                        Processos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie e analise todos os registros detalhados</p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 mr-2 border-r pr-4 border-slate-200 dark:border-slate-700">
                        <ThemeToggle />
                    </div>
                    <div className="relative">
                        <Input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            id="pdf-upload"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label htmlFor="pdf-upload">
                            <Button variant="default" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white" asChild disabled={uploading}>
                                <span>
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    {uploading ? uploadMessage || "Processando..." : "Importar PDF"}
                                </span>
                            </Button>
                        </label>
                    </div>

                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    {stats && stats.total > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-1.5"
                            disabled={loading}
                            onClick={async () => {
                                if (!confirm('Tem certeza que deseja limpar todos os registros? Esta ação não pode ser desfeita.')) return;
                                try {
                                    await clearRecords();
                                    setStats(null);
                                    setProcesses(null);
                                    setPage(1);
                                } catch (error) {
                                    alert('Erro ao limpar registros');
                                }
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                            Limpar Tudo
                        </Button>
                    )}
                </div>
            </header>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Filtros de Busca
                    </CardTitle>
                    <CardDescription>Refine sua busca por data, status e outros critérios</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <Input
                                placeholder="Buscar por ID, Contribuinte ou Tipo..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full"
                            />
                        </div>

                        <div className="w-auto">
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(range) => {
                                    setDateRange(range);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="w-full md:w-64 relative">
                            {/* Type Filter */}
                            <div className="relative group">
                                <button
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => {
                                        const dd = document.getElementById('type-dropdown');
                                        const ov = document.getElementById('type-overlay');
                                        const isHidden = dd?.classList.contains('hidden');
                                        document.getElementById('status-dropdown')?.classList.add('hidden');
                                        document.getElementById('status-overlay')?.classList.add('hidden');
                                        dd?.classList.toggle('hidden');
                                        if (isHidden) ov?.classList.remove('hidden');
                                        else ov?.classList.add('hidden');
                                    }}
                                >
                                    <span className="truncate">
                                        {typeFilter.length === 0 ? "Todos os Tipos" :
                                            typeFilter.length === 1 ? typeFilter[0] :
                                                `${typeFilter.length} selecionados`}
                                    </span>
                                    <ListFilter className="h-4 w-4 opacity-50" />
                                </button>

                                <div id="type-dropdown" className="hidden absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-60 overflow-auto p-1 text-slate-900 dark:text-slate-100">
                                    <div
                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                                        onClick={() => {
                                            setTypeFilter([]);
                                            setPage(1);
                                        }}
                                    >
                                        <div className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${typeFilter.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                            {typeFilter.length === 0 && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm">Todos</span>
                                    </div>
                                    {(stats?.all_types || []).map((t) => (
                                        <div
                                            key={t}
                                            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTypeFilter(prev => {
                                                    const newFilters = prev.includes(t)
                                                        ? prev.filter(f => f !== t)
                                                        : [...prev, t];
                                                    setPage(1);
                                                    return newFilters;
                                                });
                                            }}
                                        >
                                            <div className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${typeFilter.includes(t) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                {typeFilter.includes(t) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm truncate">{t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div
                                className="fixed inset-0 z-[5] hidden"
                                id="type-overlay"
                                onClick={() => {
                                    document.getElementById('type-dropdown')?.classList.add('hidden');
                                    document.getElementById('type-overlay')?.classList.add('hidden');
                                }}
                            />
                        </div>

                        <div className="w-full md:w-64 relative">
                            {/* Status Filter */}
                            <div className="relative group">
                                <button
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => {
                                        const dd = document.getElementById('status-dropdown');
                                        const ov = document.getElementById('status-overlay');
                                        const isHidden = dd?.classList.contains('hidden');
                                        document.getElementById('type-dropdown')?.classList.add('hidden');
                                        document.getElementById('type-overlay')?.classList.add('hidden');
                                        dd?.classList.toggle('hidden');
                                        if (isHidden) ov?.classList.remove('hidden');
                                        else ov?.classList.add('hidden');
                                    }}
                                >
                                    <span className="truncate">
                                        {statusFilter.length === 0 ? "Todas as Situações" :
                                            statusFilter.length === 1 ? statusFilter[0] :
                                                `${statusFilter.length} selecionados`}
                                    </span>
                                    <ListFilter className="h-4 w-4 opacity-50" />
                                </button>

                                <div id="status-dropdown" className="hidden absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-60 overflow-auto p-1 text-slate-900 dark:text-slate-100">
                                    <div
                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                                        onClick={() => {
                                            setStatusFilter([]);
                                            setPage(1);
                                        }}
                                    >
                                        <div className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${statusFilter.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                            {statusFilter.length === 0 && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm">Todas</span>
                                    </div>
                                    {statusOptions.map((s) => (
                                        <div
                                            key={s}
                                            className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStatusFilter(prev => {
                                                    const newFilters = prev.includes(s)
                                                        ? prev.filter(f => f !== s)
                                                        : [...prev, s];
                                                    setPage(1);
                                                    return newFilters;
                                                });
                                            }}
                                        >
                                            <div className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${statusFilter.includes(s) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                {statusFilter.includes(s) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-sm truncate">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div
                                className="fixed inset-0 z-[5] hidden"
                                id="status-overlay"
                                onClick={() => {
                                    document.getElementById('status-dropdown')?.classList.add('hidden');
                                    document.getElementById('status-overlay')?.classList.add('hidden');
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <ListFilter className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">Processos Listados</span>
                            </div>
                            <div
                                className="flex items-center space-x-2 border rounded-md px-3 py-1.5 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                                onClick={() => {
                                    setOnlyDelayed(!onlyDelayed);
                                    setPage(1);
                                }}
                            >
                                <div className={`w-4 h-4 shrink-0 border rounded flex items-center justify-center ${onlyDelayed ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {onlyDelayed && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm font-medium leading-none cursor-pointer text-slate-700 dark:text-slate-300">
                                    Apenas Atrasados
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 px-3 py-1 rounded-full text-sm font-bold">
                                {processes?.total || 0} registros
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={exporting || !processes?.total}
                                onClick={async () => {
                                    setExporting(true);
                                    try {
                                        const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
                                        const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
                                        await exportExcel(search, typeFilter, statusFilter, from, to, onlyDelayed);
                                    } catch (error) {
                                        alert('Erro ao exportar arquivo Excel');
                                    } finally {
                                        setExporting(false);
                                    }
                                }}
                                className="gap-1.5"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {exporting ? 'Exportando...' : 'Exportar Excel'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200"
                                onClick={() => {
                                    setSearch('');
                                    setTypeFilter([]);
                                    setStatusFilter([]);
                                    setDateRange(undefined);
                                    setOnlyDelayed(false);
                                    setPage(1);
                                }}
                                disabled={loading}
                                title="Limpar Filtros"
                            >
                                <FilterX className="w-4 h-4" />
                                <span className="sr-only sm:not-sr-only">Limpar</span>
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-medium">N&ordm; Proc. / Ano</th>
                                    <th className="px-4 py-3 font-medium">Contribuinte</th>
                                    <th className="px-4 py-3 font-medium">Data Abertura</th>
                                    <th className="px-4 py-3 font-medium">Situa&ccedil;&atilde;o</th>
                                    <th className="px-4 py-3 font-medium">Tipo de Solicita&ccedil;&atilde;o</th>
                                    <th className="px-4 py-3 font-medium text-right">Dias Atraso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {processes?.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                ) : processes?.data.map((proc, i) => (
                                    <tr key={i} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{proc.id}</td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{proc.contribuinte}</td>
                                        <td className="px-4 py-3 text-slate-500">{proc.data_abertura}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${["ENCERRAMENTO", "DEFERIDO"].some(s => proc.status.includes(s)) ? "bg-green-100 text-green-700" :
                                                    ["INDEFERIDO", "CANCELADO"].some(s => proc.status.includes(s)) ? "bg-red-100 text-red-700" :
                                                        ["ANDAMENTO", "EM DILIGENCIA"].some(s => proc.status === s) ? "bg-blue-100 text-blue-700" :
                                                            ["RETORNO", "PENDENCIA", "SUSPENSO"].some(s => proc.status === s) ? "bg-orange-100 text-orange-700" :
                                                                "bg-gray-100 text-gray-700"}`}>
                                                {proc.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 truncate max-w-[200px] text-slate-700 dark:text-slate-200" title={proc.tipo_solicitacao}>
                                            {proc.tipo_solicitacao}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {proc.is_atrasado ? (
                                                <span className="text-red-600 font-bold flex items-center justify-end gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {proc.dias_atraso_calc} dias
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {processes && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, processes.total)} de {processes.total} resultados
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    title="Primeira página"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= processes.pages}
                                >
                                    Próxima
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(processes.pages)}
                                    disabled={page >= processes.pages}
                                    title="Última página"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

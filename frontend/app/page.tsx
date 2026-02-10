
"use client"

import { useState, useEffect } from 'react';
import { uploadPDF, getStats, getProcesses, exportExcel, KPIStats, Process, PaginatedProcesses } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, RefreshCw, AlertCircle, CheckCircle, Clock, ListFilter, Loader2, Search, Filter, BarChart3, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [processes, setProcesses] = useState<PaginatedProcesses | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState('');
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await getStats(monthFilter);
      setStats(statsData);

      console.log('DEBUG: calling getProcesses with statusFilter:', statusFilter);
      const processesData = await getProcesses(page, 10, search, typeFilter, statusFilter, monthFilter, onlyDelayed);
      setProcesses(processesData);

      if (statsData.total > 0 || statsData.available_months?.length) setDbLoaded(true);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, typeFilter, statusFilter, monthFilter, onlyDelayed]); // Reload when filters change

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setUploading(true);
    try {
      await uploadPDF(e.target.files[0]);
      // clear filters on new upload
      setMonthFilter('');
      await loadData();
      setDbLoaded(true);
    } catch (error) {
      alert("Erro ao enviar arquivo PDF");
    } finally {
      setUploading(false);
    }
  };

  const statusOptions = stats?.all_statuses || ["ENCERRAMENTO", "ANDAMENTO", "INDEFERIDO", "DEFERIDO"];
  const monthOptions = stats?.available_months || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 space-y-8 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Report Terra
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">An&aacute;lise Inteligente de Processos PDF</p>
        </div>

        <div className="flex gap-4 items-center">
          {/* Month Filter */}
          <div className="w-48">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              disabled={!dbLoaded}
            >
              <option value="">Todos os Per&iacute;odos</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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
              <Button variant="default" className="cursor-pointer" asChild disabled={uploading}>
                <span>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Processando..." : "Upload PDF"}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </header>

      {!dbLoaded && !loading && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
          <Upload className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Nenhum dado carregado</h3>
          <p className="text-slate-500 mb-4">Fa&ccedil;a upload de um arquivo PDF para come&ccedil;ar a an&aacute;lise.</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in zoom-in duration-500">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Processos</CardTitle>
              <FileText className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Registros extra&iacute;dos</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Encerrados</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.encerrados}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.encerrados / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
              <Clock className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.andamento}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.andamento / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Atrasados</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.atrasados}</div>
              <p className="text-xs text-red-500 font-medium">
                {stats.andamento > 0 ? Math.round((stats.atrasados / stats.andamento) * 100) : 0}% dos em andamento
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Evolu&ccedil;&atilde;o Temporal</CardTitle>
              <CardDescription>Entrada de Processos, Andamento e Atrasos por M&ecirc;s</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.by_month}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month_year" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="encerrados" name="Encerrados" stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="andamento" name="Em Andamento" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="atrasados" name="Atrasados (>30 dias)" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Tipos de Solicita&ccedil;&atilde;o</CardTitle>
              <CardDescription>Top 10 Categorias por Volume</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.by_type} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="type" type="category" width={150} fontSize={11} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" name="Volume" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Consulta de Processos
          </CardTitle>
          <CardDescription>Busque e filtre os registros extra&iacute;dos do PDF</CardDescription>
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
            <div className="w-full md:w-48">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos os Tipos</option>
                {stats?.by_type.map((t) => (
                  <option key={t.type} value={t.type}>{t.type}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-64 relative">
              {/* Custom Multi-Select Dropdown */}
              <div className="relative group">
                <button
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    const el = document.getElementById('status-dropdown');
                    if (el) el.classList.toggle('hidden');
                  }}
                >
                  <span className="truncate">
                    {statusFilter.length === 0 ? "Todas as Situações" :
                      statusFilter.length === 1 ? statusFilter[0] :
                        `${statusFilter.length} selecionados`}
                  </span>
                  <ListFilter className="h-4 w-4 opacity-50" />
                </button>

                {/* Dropdown Content */}
                <div id="status-dropdown" className="hidden absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-60 overflow-auto p-1">
                  <div
                    className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    onClick={() => {
                      setStatusFilter([]);
                      setPage(1);
                    }}
                  >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${statusFilter.length === 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {statusFilter.length === 0 && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">Todas</span>
                  </div>
                  {statusOptions.map((s) => (
                    <div
                      key={s}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation(); // keep open
                        setStatusFilter(prev => {
                          const newFilters = prev.includes(s)
                            ? prev.filter(f => f !== s)
                            : [...prev, s];
                          setPage(1);
                          return newFilters;
                        });
                      }}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center ${statusFilter.includes(s) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {statusFilter.includes(s) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Overlay to close on click outside (simple implementation) */}
              <div
                className="fixed inset-0 z-0 hidden"
                id="status-dropdown-overlay"
                onClick={() => {
                  document.getElementById('status-dropdown')?.classList.add('hidden');
                  document.getElementById('status-dropdown-overlay')?.classList.add('hidden');
                }}
              />
            </div>
            <div className="flex items-center space-x-2 border rounded-md px-4 py-2 bg-slate-50">
              <input
                type="checkbox"
                id="delayed-check"
                checked={onlyDelayed}
                onChange={(e) => {
                  setOnlyDelayed(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="delayed-check" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                Apenas Atrasados
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">Processos Listados</span>
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
                    await exportExcel(search, typeFilter, statusFilter, monthFilter, onlyDelayed);
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
                    <td className="px-4 py-3 font-medium">{proc.id}</td>
                    <td className="px-4 py-3">{proc.contribuinte}</td>
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
                    <td className="px-4 py-3 truncate max-w-[200px]" title={proc.tipo_solicitacao}>
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
                  Pr&oacute;xima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

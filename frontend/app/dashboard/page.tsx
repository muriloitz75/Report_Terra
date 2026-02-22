"use client";

import { useState, useEffect } from 'react';
import { getStats, KPIStats, getUploadStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle, Clock, LayoutDashboard, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Treemap } from 'recharts';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DatePickerWithRange } from "@/components/date-range-picker";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/context/PermissionsContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

import { Suspense } from 'react';

function DashboardContent() {
    const [stats, setStats] = useState<KPIStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isCheckingUpload, setIsCheckingUpload] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const { data: session, status } = useSession();
    const router = useRouter();
    const { canViewProcesses, canViewDashboard, canViewReports } = usePermissions();

    useEffect(() => {
        if (status === 'loading') return;
        if (canViewDashboard) return;
        router.replace(canViewProcesses ? "/processos" : canViewReports ? "/relatorios" : "/login");
    }, [router, status, canViewProcesses, canViewDashboard, canViewReports]);

    const loadData = async () => {
        if (isCheckingUpload || uploading) return;
        setLoading(true);
        try {
            const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

            const statsData = await getStats(from, to);
            setStats(statsData);

            if (statsData.total > 0 || statsData.available_months?.length) setDbLoaded(true);
            else setDbLoaded(false);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    // Check for ongoing background upload on mount
    useEffect(() => {
        if (status === 'loading' || !canViewDashboard) return;

        const checkUpload = async () => {
            try {
                const res = await getUploadStatus();
                if (res.status === 'processing') {
                    setUploading(true);
                }
            } catch (e) {
                console.error("Não foi possível verificar status de upload no dashboard", e);
            } finally {
                setIsCheckingUpload(false);
            }
        };
        checkUpload();
    }, [status, canViewDashboard]);

    useEffect(() => {
        loadData();
    }, [dateRange, isCheckingUpload, uploading]);

    return (
        <div className="p-8 space-y-8 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <LayoutDashboard className="w-8 h-8 text-blue-600" />
                        Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Visão Geral e Indicadores de Performance</p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="w-auto">
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className={!dbLoaded ? "opacity-50 pointer-events-none" : ""}
                        />
                    </div>
                </div>
            </header>

            {isCheckingUpload ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <Clock className="w-12 h-12 text-slate-400 mb-4 animate-spin" />
                    <h3 className="text-lg font-semibold text-slate-700">Verificando banco de dados...</h3>
                </div>
            ) : uploading ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50">
                    <RefreshCw className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
                    <h3 className="text-lg font-semibold text-slate-700">Atualização em Progresso</h3>
                    <p className="text-slate-500 mb-4">Um novo PDF está sendo processado em segundo plano. Os dados do Dashboard estarão disponíveis assim que a substituição terminar na tela de Processos.</p>
                </div>
            ) : !dbLoaded && !loading ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <FileText className="w-12 h-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">Nenhum dado encontrado</h3>
                    <p className="text-slate-500 mb-4">Vá para a seção "Processos" para importar dados.</p>
                    <Button asChild>
                        <a href="/processos">Ir para Processos</a>
                    </Button>
                </div>
            ) : null}

            {!isCheckingUpload && !uploading && stats && (
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

            {!isCheckingUpload && !uploading && stats && (
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
                                <PieChart>
                                    <Pie
                                        data={stats.by_type}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="count"
                                        nameKey="type"
                                    >
                                        {stats.by_type.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', maxWidth: '30%' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {stats.by_type_delayed && stats.by_type_delayed.length > 0 && (
                        <Card className="md:col-span-2 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-red-600">Tipos com Mais Atrasos</CardTitle>
                                <CardDescription>Top 10 Categorias de Processos Atrasados por Hierarquia</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] md:h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <Treemap
                                        data={stats.by_type_delayed.map((item: { type: string; count: number }, index: number) => ({
                                            name: item.type,
                                            size: item.count,
                                            fill: `hsl(${0 + index * 8}, ${75 - index * 2}%, ${45 + index * 2}%)`
                                        }))}
                                        dataKey="size"
                                        aspectRatio={4 / 3}
                                        content={({ x, y, width, height, name, size, fill }: any) => (
                                            <g>
                                                <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} rx={4} />
                                                {width > 60 && height > 30 && (
                                                    <>
                                                        <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600} className="drop-shadow">
                                                            {name.length > 20 ? name.substring(0, 20) + '…' : name}
                                                        </text>
                                                        <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={12} fontWeight={700}>
                                                            {size}
                                                        </text>
                                                    </>
                                                )}
                                            </g>
                                        )}
                                    >
                                        <Tooltip
                                            content={({ payload }: any) => {
                                                if (!payload?.length) return null;
                                                const { name, size } = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                                                        <p className="font-medium text-slate-800 dark:text-slate-100">{name}</p>
                                                        <p className="text-red-600 font-bold">{size} atrasados</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </Treemap>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {stats.by_type_closed_top && stats.by_type_closed_top.length > 0 && (
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-emerald-700">Ranking: Mais Encerrados</CardTitle>
                                <CardDescription>Top 10 tipos com mais encerramentos</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] md:h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.by_type_closed_top}
                                            cx="40%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={120}
                                            dataKey="count"
                                            nameKey="type"
                                            paddingAngle={2}
                                        >
                                            {stats.by_type_closed_top.map((entry, index) => (
                                                <Cell key={`cell-top-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', maxWidth: '45%', overflowY: 'auto', maxHeight: '280px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {stats.by_type_closed_bottom && stats.by_type_closed_bottom.length > 0 && (
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-700">Ranking: Menos Encerrados</CardTitle>
                                <CardDescription>Top 10 tipos com menos encerramentos</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.by_type_closed_bottom}
                                            cx="40%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={120}
                                            dataKey="count"
                                            nameKey="type"
                                            paddingAngle={2}
                                        >
                                            {stats.by_type_closed_bottom.map((entry, index) => (
                                                <Cell key={`cell-bot-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', maxWidth: '45%', overflowY: 'auto', maxHeight: '280px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10">Carregando dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

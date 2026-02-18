"use client";

import { useState, useEffect } from 'react';
import { getStats, KPIStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle, Clock, LayoutDashboard } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
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

    useEffect(() => {
        loadData();
    }, [dateRange]);

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

            {!dbLoaded && !loading && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                    <FileText className="w-12 h-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">Nenhum dado encontrado</h3>
                    <p className="text-slate-500 mb-4">Vá para a seção "Processos" para importar dados.</p>
                    <Button asChild>
                        <a href="/processos">Ir para Processos</a>
                    </Button>
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
                                <CardDescription>Top 10 Categorias de Processos Atrasados</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.by_type_delayed} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                                        <XAxis type="number" fontSize={12} />
                                        <YAxis dataKey="type" type="category" width={150} fontSize={11} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" name="Atrasados" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
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
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.by_type_closed_top} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                                        <XAxis type="number" fontSize={12} />
                                        <YAxis dataKey="type" type="category" width={180} fontSize={11} tickFormatter={(val) => val.length > 30 ? val.substring(0, 30) + '...' : val} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" name="Encerrados" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
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
                                    <BarChart data={stats.by_type_closed_bottom} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                                        <XAxis type="number" fontSize={12} />
                                        <YAxis dataKey="type" type="category" width={180} fontSize={11} tickFormatter={(val) => val.length > 30 ? val.substring(0, 30) + '...' : val} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" name="Encerrados" fill="#64748b" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
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

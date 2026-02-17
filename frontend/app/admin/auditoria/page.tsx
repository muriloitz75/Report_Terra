"use client"

import { Fragment, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Users, UserCheck, LogIn, ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import {
    getAuditSummary,
    getAuditUsers,
    getAuditActivity,
    getAuditUserHistory,
    type AuditSummary,
    type AuditUser,
    type DailyLogin,
    type ActivityEntry,
} from "@/lib/api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

function timeAgo(isoDate: string | null): string {
    if (!isoDate) return "Nunca"
    const diff = Date.now() - new Date(isoDate).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Agora"
    if (minutes < 60) return `Há ${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Há ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `Há ${days}d`
    return `Há ${Math.floor(days / 30)}m`
}

export default function AuditoriaPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const isAdmin = (session as any)?.role === "admin"

    const [summary, setSummary] = useState<AuditSummary | null>(null)
    const [users, setUsers] = useState<AuditUser[]>([])
    const [activity, setActivity] = useState<DailyLogin[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // User history expansion
    const [expandedUser, setExpandedUser] = useState<number | null>(null)
    const [userHistory, setUserHistory] = useState<ActivityEntry[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [s, u, a] = await Promise.all([
                getAuditSummary(),
                getAuditUsers(),
                getAuditActivity(30),
            ])
            setSummary(s)
            setUsers(u)
            setActivity(a.daily_logins)
        } catch (e: any) {
            setError(e?.response?.data?.detail || "Erro ao carregar dados de auditoria")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (status === "loading") return
        if (!isAdmin) {
            router.push("/dashboard")
            return
        }
        loadData()
    }, [status, isAdmin, router, loadData])

    const toggleUserHistory = async (userId: number) => {
        if (expandedUser === userId) {
            setExpandedUser(null)
            return
        }
        setExpandedUser(userId)
        setHistoryLoading(true)
        try {
            const history = await getAuditUserHistory(userId, 20)
            setUserHistory(history)
        } catch {
            setUserHistory([])
        } finally {
            setHistoryLoading(false)
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!isAdmin) return null

    const kpis = [
        { label: "Usuários Total", value: summary?.total_users ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
        { label: "Ativos Hoje", value: summary?.active_users_today ?? 0, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
        { label: "Ativos 7 dias", value: summary?.active_users_week ?? 0, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Logins Hoje", value: summary?.total_logins_today ?? 0, icon: LogIn, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
        { label: "Falhas Hoje", value: summary?.failed_logins_today ?? 0, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    ]

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Auditoria de Usuários</h1>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <Card key={kpi.label} className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
                                        <p className="text-xs text-slate-500">{kpi.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Chart */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">
                        Logins Diários - Últimos 30 dias
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activity.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                            Nenhuma atividade registrada ainda
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={activity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => {
                                        const d = new Date(v + "T00:00:00")
                                        return `${d.getDate()}/${d.getMonth() + 1}`
                                    }}
                                />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    labelFormatter={(v) => {
                                        const d = new Date(v + "T00:00:00")
                                        return d.toLocaleDateString("pt-BR")
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="logins" name="Logins" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="unique_users" name="Usuários Únicos" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">
                        Atividade por Usuário
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                                    <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Usuário</th>
                                    <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-400">Último Login</th>
                                    <th className="text-center p-3 font-medium text-slate-600 dark:text-slate-400">7 dias</th>
                                    <th className="text-center p-3 font-medium text-slate-600 dark:text-slate-400">30 dias</th>
                                    <th className="text-center p-3 font-medium text-slate-600 dark:text-slate-400">Processos</th>
                                    <th className="text-center p-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="text-center p-3 font-medium text-slate-600 dark:text-slate-400"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <Fragment key={u.user_id}>
                                        <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3">
                                                <div>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{u.email}</span>
                                                    {u.full_name && (
                                                        <span className="block text-xs text-slate-500">{u.full_name}</span>
                                                    )}
                                                    {u.role === "admin" && (
                                                        <span className="inline-block mt-0.5 text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-slate-600 dark:text-slate-400">
                                                {timeAgo(u.last_login)}
                                            </td>
                                            <td className="p-3 text-center font-mono">
                                                <span className={u.login_count_7d > 0 ? "text-green-600 font-semibold" : "text-slate-400"}>
                                                    {u.login_count_7d}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-mono">
                                                <span className={u.login_count_30d > 0 ? "text-blue-600 font-semibold" : "text-slate-400"}>
                                                    {u.login_count_30d}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                                {u.total_processes}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    u.is_active
                                                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                        : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                                }`}>
                                                    {u.is_active ? "Ativo" : "Inativo"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleUserHistory(u.user_id)}
                                                    className="h-7 w-7 p-0"
                                                >
                                                    {expandedUser === u.user_id
                                                        ? <ChevronUp className="w-4 h-4" />
                                                        : <ChevronDown className="w-4 h-4" />
                                                    }
                                                </Button>
                                            </td>
                                        </tr>
                                        {/* Expanded history */}
                                        {expandedUser === u.user_id && (
                                            <tr>
                                                <td colSpan={7} className="bg-slate-50 dark:bg-slate-900 p-4">
                                                    {historyLoading ? (
                                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                            <RefreshCw className="w-3 h-3 animate-spin" /> Carregando...
                                                        </div>
                                                    ) : userHistory.length === 0 ? (
                                                        <p className="text-slate-400 text-sm">Nenhuma atividade registrada</p>
                                                    ) : (
                                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                                            {userHistory.map((h, i) => (
                                                                <div key={i} className="flex items-center gap-4 text-xs py-1">
                                                                    <span className={`px-2 py-0.5 rounded font-medium ${
                                                                        h.action === "login"
                                                                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                                                            : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                                                    }`}>
                                                                        {h.action === "login" ? "Login" : "Falha"}
                                                                    </span>
                                                                    <span className="text-slate-500 font-mono">{h.ip_address || "—"}</span>
                                                                    <span className="text-slate-400">
                                                                        {h.timestamp ? new Date(h.timestamp).toLocaleString("pt-BR") : "—"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

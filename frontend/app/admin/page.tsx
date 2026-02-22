"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Check, X, Loader2, UserX, RefreshCw, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAdminUsers, updateAdminUser, deactivateAdminUser, deleteAdminUser, AdminUser } from '@/lib/api';

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const isAdmin = (session as any)?.role === 'admin';

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        if (!isAdmin) {
            router.replace('/');
        }
    }, [status, isAdmin, router]);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAdminUsers();
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error('[Admin] Unexpected API response:', typeof data, data);
                setError('Resposta inesperada da API. Tente recarregar.');
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } }, message?: string };
            const msg = err?.response?.data?.detail || err?.message || 'Erro desconhecido';
            setError(`Erro ao carregar usuários: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const handleTogglePermission = async (user: AdminUser) => {
        setUpdatingId(user.id);
        try {
            await updateAdminUser(user.id, { can_generate_report: !user.can_generate_report });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, can_generate_report: !u.can_generate_report } : u));
        } catch {
            setError('Erro ao atualizar permissão.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleView = async (user: AdminUser, field: 'can_view_processes' | 'can_view_dashboard' | 'can_view_reports') => {
        const current = user[field] !== false;
        setUpdatingId(user.id);
        try {
            await updateAdminUser(user.id, { [field]: !current });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, [field]: !current } : u));
        } catch {
            setError('Erro ao atualizar permissão.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleRole = async (user: AdminUser) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        setUpdatingId(user.id);
        try {
            await updateAdminUser(user.id, { role: newRole });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch {
            setError('Erro ao atualizar papel.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeactivate = async (user: AdminUser) => {
        if (!confirm(`Desativar o usuário ${user.username || user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            await deactivateAdminUser(user.id);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
        } catch {
            setError('Erro ao desativar usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleActivate = async (user: AdminUser) => {
        if (!confirm(`Reativar o usuário ${user.username || user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            await updateAdminUser(user.id, { is_active: true });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u));
        } catch {
            setError('Erro ao reativar usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteUser = async (user: AdminUser) => {
        if (!confirm(`ATENÇÃO: Excluir permanentemente o usuário ${user.username || user.email}?\n\nTodos os dados associados (processos, relatórios, atividades) serão removidos.\n\nEsta ação não pode ser desfeita.`)) return;
        setUpdatingId(user.id);
        try {
            await deleteAdminUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err?.response?.data?.detail || 'Erro ao excluir usuário permanentemente.');
        } finally {
            setUpdatingId(null);
        }
    };

    const pendingUsers = users.filter(u => (u.approval_status || 'approved') === 'pending');

    const handleApprove = async (user: AdminUser) => {
        if (!confirm(`Aprovar o cadastro de ${user.username || user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            const updated = await updateAdminUser(user.id, { approval_status: 'approved', is_active: true });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
        } catch (e) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err?.response?.data?.detail || 'Erro ao aprovar usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReject = async (user: AdminUser) => {
        if (!confirm(`Reprovar o cadastro de ${user.username || user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            const updated = await updateAdminUser(user.id, { approval_status: 'rejected', is_active: false });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
        } catch (e) {
            const err = e as { response?: { data?: { detail?: string } } };
            setError(err?.response?.data?.detail || 'Erro ao reprovar usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    if (status === 'loading' || !isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/20 p-2 rounded-lg">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Painel de Administração</h1>
                        <p className="text-sm text-slate-500">Gerencie usuários e permissões</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
                </div>
            )}

            {pendingUsers.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Solicitações de Cadastro ({pendingUsers.length})</CardTitle>
                        <CardDescription className="text-xs">Aprove ou reprove novos usuários.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{user.username || user.email}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.full_name || "Sem nome"}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApprove(user)}
                                        disabled={updatingId === user.id}
                                    >
                                        {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Aprovar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                                        onClick={() => handleReject(user)}
                                        disabled={updatingId === user.id}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Reprovar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Users Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Usuários ({users.length})</CardTitle>
                    <CardDescription className="text-xs">Clique nos toggles para alterar permissões em tempo real.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <>
                            {/* Desktop: Tabela clássica */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                            <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Usuário</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Papel</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Processos</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Dashboard</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Relatórios IA</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Gerar IA</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(users) && users.map(user => (
                                            <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-slate-100">{user.username || user.email}</p>
                                                        {user.full_name && <p className="text-xs text-slate-500">{user.full_name}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleRole(user)}
                                                        disabled={updatingId === user.id || (user.username || user.email) === (session?.user?.email)}
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${user.role === 'admin'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                                            }`}
                                                        title={(user.username || user.email) === (session?.user?.email) ? "Não é possível alterar seu próprio papel" : "Clique para alternar papel"}
                                                    >
                                                        {updatingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : user.role === 'admin' ? 'Admin' : 'Usuário'}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={(user.can_view_processes !== false) || user.role === 'admin'}
                                                        onChange={() => handleToggleView(user, 'can_view_processes')}
                                                        disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                        className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={(user.can_view_dashboard !== false) || user.role === 'admin'}
                                                        onChange={() => handleToggleView(user, 'can_view_dashboard')}
                                                        disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                        className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={(user.can_view_reports !== false) || user.role === 'admin'}
                                                        onChange={() => handleToggleView(user, 'can_view_reports')}
                                                        disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                        className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleTogglePermission(user)}
                                                        disabled={updatingId === user.id || user.role === 'admin' || user.can_view_reports === false}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${user.can_generate_report || user.role === 'admin'
                                                            ? 'bg-green-500'
                                                            : 'bg-slate-300 dark:bg-slate-600'
                                                            }`}
                                                        title={user.role === 'admin' ? 'Admins sempre têm acesso' : user.can_view_reports === false ? 'Habilite visualização primeiro' : 'Clique para alternar'}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transform transition duration-200 ease-in-out ${user.can_generate_report || user.role === 'admin' ? 'translate-x-4' : 'translate-x-0'
                                                            }`} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {((user.approval_status || 'approved') === 'pending') ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                            Pendente
                                                        </span>
                                                    ) : ((user.approval_status || 'approved') === 'rejected') ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            Reprovado
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                                            }`}>
                                                            {user.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {user.email !== session?.user?.email && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {user.is_active ? (
                                                                <button
                                                                    onClick={() => handleDeactivate(user)}
                                                                    disabled={updatingId === user.id}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                                    title="Desativar usuário"
                                                                >
                                                                    {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleActivate(user)}
                                                                    disabled={updatingId === user.id}
                                                                    className="text-slate-400 hover:text-green-500 transition-colors disabled:opacity-50"
                                                                    title="Reativar usuário"
                                                                >
                                                                    {updatingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                            {user.role !== 'admin' && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user)}
                                                                    disabled={updatingId === user.id}
                                                                    className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                                                    title="Excluir permanentemente"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile: Cards de Usuários */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {Array.isArray(users) && users.map(user => (
                                    <div key={`mob-${user.id}`} className="p-4 space-y-4 bg-white dark:bg-slate-900">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100">{user.username || user.email}</p>
                                                {user.full_name && <p className="text-xs text-slate-500">{user.full_name}</p>}
                                            </div>
                                            {((user.approval_status || 'approved') === 'pending') ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                                    Pendente
                                                </span>
                                            ) : ((user.approval_status || 'approved') === 'rejected') ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                    Reprovado
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                                                    }`}>
                                                    {user.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Toggle de Papel */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Papel do Usuário</span>
                                            <button
                                                onClick={() => handleToggleRole(user)}
                                                disabled={updatingId === user.id || (user.username || user.email) === (session?.user?.email)}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${user.role === 'admin'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {updatingId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                {user.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                                            </button>
                                        </div>

                                        {/* Permissões */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-3">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Permissões de Acesso</p>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Processos</span>
                                                <input
                                                    type="checkbox"
                                                    checked={(user.can_view_processes !== false) || user.role === 'admin'}
                                                    onChange={() => handleToggleView(user, 'can_view_processes')}
                                                    disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                    className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Dashboard</span>
                                                <input
                                                    type="checkbox"
                                                    checked={(user.can_view_dashboard !== false) || user.role === 'admin'}
                                                    onChange={() => handleToggleView(user, 'can_view_dashboard')}
                                                    disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                    className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700 dark:text-slate-300">Relatórios IA</span>
                                                <input
                                                    type="checkbox"
                                                    checked={(user.can_view_reports !== false) || user.role === 'admin'}
                                                    onChange={() => handleToggleView(user, 'can_view_reports')}
                                                    disabled={updatingId === user.id || user.role === 'admin' || user.email === (session?.user?.email)}
                                                    className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Gerar IA</span>
                                                <button
                                                    onClick={() => handleTogglePermission(user)}
                                                    disabled={updatingId === user.id || user.role === 'admin' || user.can_view_reports === false}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${user.can_generate_report || user.role === 'admin'
                                                        ? 'bg-green-500'
                                                        : 'bg-slate-300 dark:bg-slate-600'
                                                        }`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transform transition duration-200 ease-in-out ${user.can_generate_report || user.role === 'admin' ? 'translate-x-4' : 'translate-x-0'
                                                        }`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        {user.email !== session?.user?.email && (
                                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                {user.is_active ? (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        onClick={() => handleDeactivate(user)}
                                                        disabled={updatingId === user.id}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs px-2"
                                                    >
                                                        {updatingId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <UserX className="w-3 h-3 mr-1.5" />}
                                                        Desativar
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        onClick={() => handleActivate(user)}
                                                        disabled={updatingId === user.id}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 text-xs px-2"
                                                    >
                                                        {updatingId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <UserCheck className="w-3 h-3 mr-1.5" />}
                                                        Reativar
                                                    </Button>
                                                )}
                                                {user.role !== 'admin' && (
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={updatingId === user.id}
                                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

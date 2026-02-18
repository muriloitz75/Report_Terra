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
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e?.message || 'Erro desconhecido';
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
        if (!confirm(`Desativar o usuário ${user.email}?`)) return;
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
        if (!confirm(`Reativar o usuário ${user.email}?`)) return;
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
        if (!confirm(`ATENÇÃO: Excluir permanentemente o usuário ${user.email}?\n\nTodos os dados associados (processos, relatórios, atividades) serão removidos.\n\nEsta ação não pode ser desfeita.`)) return;
        setUpdatingId(user.id);
        try {
            await deleteAdminUser(user.id);
            setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erro ao excluir usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    const pendingUsers = users.filter(u => (u.approval_status || 'approved') === 'pending');

    const handleApprove = async (user: AdminUser) => {
        if (!confirm(`Aprovar o cadastro de ${user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            const updated = await updateAdminUser(user.id, { approval_status: 'approved', is_active: true });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erro ao aprovar usuário.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReject = async (user: AdminUser) => {
        if (!confirm(`Reprovar o cadastro de ${user.email}?`)) return;
        setUpdatingId(user.id);
        try {
            const updated = await updateAdminUser(user.id, { approval_status: 'rejected', is_active: false });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erro ao reprovar usuário.');
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
                                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{user.email}</p>
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                        <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Usuário</th>
                                        <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Papel</th>
                                        <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Relatórios IA</th>
                                        <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                                        <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(users) && users.map(user => (
                                        <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-100">{user.email}</p>
                                                    {user.full_name && <p className="text-xs text-slate-500">{user.full_name}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    disabled={updatingId === user.id || user.email === (session?.user?.email)}
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        user.role === 'admin'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                                    }`}
                                                    title={user.email === (session?.user?.email) ? "Não é possível alterar seu próprio papel" : "Clique para alternar papel"}
                                                >
                                                    {updatingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : user.role === 'admin' ? 'Admin' : 'Usuário'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleTogglePermission(user)}
                                                    disabled={updatingId === user.id || user.role === 'admin'}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        user.can_generate_report || user.role === 'admin'
                                                            ? 'bg-green-500'
                                                            : 'bg-slate-200 dark:bg-slate-700'
                                                    }`}
                                                    title={user.role === 'admin' ? 'Admins sempre têm acesso' : 'Clique para alternar'}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform ${
                                                        user.can_generate_report || user.role === 'admin' ? 'translate-x-4.5' : 'translate-x-0.5'
                                                    }`} style={{ transform: (user.can_generate_report || user.role === 'admin') ? 'translateX(18px)' : 'translateX(2px)' }} />
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
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        user.is_active
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCog, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { changePassword } from '@/lib/api';

export default function PerfilPage() {
    const { data: session } = useSession();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (newPassword !== confirmPassword) {
            setErrorMessage('As novas senhas não coincidem.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const resp = await changePassword(currentPassword, newPassword);
            setSuccessMessage(resp.message || 'Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Erro ao alterar senha:', error);
            const detail = error.response?.data?.detail || 'Ocorreu um erro ao tentar alterar sua senha.';
            setErrorMessage(detail);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="p-8 space-y-8 font-sans max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <UserCog className="w-8 h-8 text-blue-600" />
                        Meu Perfil
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gerencie as informações da sua conta e credenciais
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Coluna de Info Básica */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Informações</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-slate-500 text-xs">Nome de Usuário</Label>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {session?.user?.name || session?.user?.email || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <Label className="text-slate-500 text-xs">Nível de Acesso</Label>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {(session as any)?.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna Principal: Alterar Senha */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <KeyRound className="w-5 h-5 text-slate-500" />
                                Alterar Senha
                            </CardTitle>
                            <CardDescription>
                                Recomendado usar uma senha forte que você não esteja usando em outros lugares.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">

                                {successMessage && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <p className="text-sm font-medium">{successMessage}</p>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p className="text-sm font-medium">{errorMessage}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="current_password">Senha Atual</Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        placeholder="Digite sua senha atual"
                                        className="max-w-md"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <Label htmlFor="new_password">Nova Senha</Label>
                                    <Input
                                        id="new_password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        placeholder="No mínimo 6 caracteres"
                                        className="max-w-md"
                                        disabled={loading}
                                        minLength={6}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                                    <Input
                                        id="confirm_password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="Repita a nova senha"
                                        className="max-w-md"
                                        disabled={loading}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end max-w-md">
                                    <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            "Atualizar Senha"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

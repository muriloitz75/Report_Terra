"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, LogOut, Loader2, CircleAlert } from "lucide-react";
import { IDLE_TIMEOUT_KEY } from "@/lib/api";

export function IdleLockScreen() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    
    const [isLocked, setIsLocked] = useState(false);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Se não estiver logado ou estiver na página de login, não ativa a tela de descanso
    const isAuthenticated = status === "authenticated";
    const isLoginPage = pathname === "/login";

    // Função que reinicia o contador
    const resetTimer = () => {
        lastActivityRef.current = Date.now();
        
        if (timeoutTimerRef.current) {
            clearTimeout(timeoutTimerRef.current);
        }

        if (isLocked || !isAuthenticated || isLoginPage) return;

        // Recupera o timeout configurado (em minutos)
        let timeoutMinutes = 10; // Valor padrão de 10 minutos
        if (typeof window !== "undefined") {
            const savedValue = localStorage.getItem(IDLE_TIMEOUT_KEY);
            if (savedValue === "disabled") {
                return; // Desabilitado
            }
            if (savedValue) {
                const parsed = parseInt(savedValue, 10);
                if (!isNaN(parsed)) {
                    timeoutMinutes = parsed;
                }
            }
        }

        const timeoutMs = timeoutMinutes * 60 * 1000;

        timeoutTimerRef.current = setTimeout(() => {
            const timeSinceLastActivity = Date.now() - lastActivityRef.current;
            if (timeSinceLastActivity >= timeoutMs) {
                setIsLocked(true);
            } else {
                // Evento atrasado ou falso positivo, re-agenda
                resetTimer();
            }
        }, timeoutMs);
    };

    // Monitora eventos de atividade
    useEffect(() => {
        if (!isAuthenticated || isLoginPage || isLocked) {
            if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
            }
            return;
        }

        // Eventos a monitorar
        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
        
        // Registrar listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Inicializar timer
        resetTimer();

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
            if (timeoutTimerRef.current) {
                clearTimeout(timeoutTimerRef.current);
            }
        };
    }, [isAuthenticated, isLoginPage, isLocked]);

    // Reseta o timer se o timeout configurado mudar no localStorage
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === IDLE_TIMEOUT_KEY) {
                resetTimer();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    // Quando o usuário fizer login ou a página mudar, reseta o estado
    useEffect(() => {
        if (!isAuthenticated || isLoginPage) {
            setIsLocked(false);
            setPassword("");
            setError(null);
        }
    }, [isAuthenticated, isLoginPage]);

    // Desbloquear a tela
    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsLoading(true);
        setError(null);

        const username = session?.user?.email || session?.user?.name || "";

        try {
            // Valida a senha contra a rota /token diretamente no backend
            const response = await fetch("/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username, password }),
            });

            if (response.ok) {
                // Senha válida! Remove o bloqueio
                setIsLocked(false);
                setPassword("");
                setError(null);
                resetTimer();
            } else {
                setError("Senha incorreta. Tente novamente.");
            }
        } catch (err) {
            setError("Erro ao validar senha. Verifique sua conexão.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await signOut({ redirect: false });
            window.location.assign("/login");
        } catch {
            window.location.assign("/login");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md text-slate-100 animate-in fade-in duration-300">
            <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center">
                    <Lock className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Sessão Suspensa</h2>
                    <p className="text-sm text-slate-400">
                        Esta tela de descanso foi ativada por inatividade. Digite sua senha para retornar ao sistema.
                    </p>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-lg flex items-center gap-3 justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                        {(session?.user?.name || session?.user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-300">
                        {session?.user?.name || session?.user?.email || "Usuário"}
                    </span>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4 text-left">
                    <div className="space-y-2">
                        <Label htmlFor="idle-password">Senha de Acesso</Label>
                        <Input
                            id="idle-password"
                            type="password"
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white focus-visible:ring-blue-500"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                            <CircleAlert className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleLogout}
                            disabled={isLoading}
                            className="flex-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Desbloquear"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

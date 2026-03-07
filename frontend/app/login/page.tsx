"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CircleAlert, Loader2, WifiOff, FileBarChart, ArrowRight } from "lucide-react"

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [errorType, setErrorType] = useState<"auth" | "server">("auth")
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // 1. Chamar o backend /token DIRETAMENTE do navegador (via Next.js rewrite)
            const tokenRes = await fetch("/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username, password }),
                signal: AbortSignal.timeout(5000),
            })

            if (tokenRes.status === 401) {
                setError("Usuário ou senha incorretos.")
                setErrorType("auth")
                setIsLoading(false)
                return
            }

            if (tokenRes.status === 403) {
                let detail = "Acesso não autorizado."
                try {
                    const data = await tokenRes.json()
                    if (data?.detail) detail = data.detail
                } catch { }
                setError(detail)
                setErrorType("auth")
                setIsLoading(false)
                return
            }

            if (!tokenRes.ok) {
                setError("Erro no servidor. Tente novamente.")
                setErrorType("server")
                setIsLoading(false)
                return
            }

            const tokenData = await tokenRes.json()

            // 2. Token obtido com sucesso — criar sessão NextAuth
            const result = await signIn("credentials", {
                username,
                password: "__token__",
                accessToken: tokenData.access_token,
                redirect: false,
            })

            if (result?.error) {
                setError("Erro ao criar sessão. Tente novamente.")
                setErrorType("server")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch {
            setError("Servidor indisponível. Aguarde a inicialização e tente novamente.")
            setErrorType("server")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-200 dark:selection:bg-blue-900">
            {/* Esquerda: Painel Institucional Premium (Branding) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 border-r border-slate-800 text-white flex-col justify-between overflow-hidden">
                {/* Elemento de background decorativo sutil (Gradient sem exageros, aderente a guidelines) */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-black pointer-events-none" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 p-12 lg:p-16 flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 w-fit mb-8 backdrop-blur-sm">
                        <FileBarChart className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium tracking-wide text-blue-100/90 uppercase">Análise Inteligente de Processos</span>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
                        Report<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
                            Terra.
                        </span>
                    </h1>

                    <p className="text-xl text-slate-300 leading-relaxed max-w-lg font-medium opacity-90">
                        Extraia, analise e visualize dados de processos com IA. Transforme PDFs complexos em painéis gerenciais e decisões estratégicas em tempo real.
                    </p>
                </div>

                <div className="relative z-10 p-12 lg:p-16 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <p className="text-sm text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} Report Terra. Plataforma de Análise de Dados e Indicadores.
                    </p>
                </div>
            </div>

            {/* Direita: Interação do Usuário (Formulário Limpo) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                {/* Apenas no mobile: branding aparece simplificado no topo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <FileBarChart className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">Report Terra</span>
                </div>

                <div className="w-full max-w-[420px] space-y-10">
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Acessar o sistema
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-base">
                            Informe suas credenciais abaixo para continuar.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2 group">
                                <Label
                                    htmlFor="username"
                                    className="text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400"
                                >
                                    Usuário
                                </Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="digite seu usuário"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                    spellCheck={false}
                                    className="h-14 px-4 text-base bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 dark:focus-visible:ring-blue-500/30 transition-all rounded-xl shadow-sm"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400"
                                    >
                                        Senha
                                    </Label>
                                    {/* Link apenas ilustrativo no layout */}
                                    <Link tabIndex={-1} href="/recuperacao" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 outline-none focus-visible:underline">
                                        Esqueceu a senha?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="h-14 px-4 text-base bg-slate-50 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 dark:focus-visible:ring-blue-500/30 transition-all rounded-xl shadow-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex gap-3 p-4 rounded-xl border border-red-200/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="mt-0.5">
                                    {errorType === "server" ? <WifiOff className="w-5 h-5" /> : <CircleAlert className="w-5 h-5" />}
                                </div>
                                <div className="text-sm font-medium leading-tight">
                                    {error}
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.25)] transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Autenticando…</span>
                                </>
                            ) : (
                                <>
                                    <span>Entrar no fluxo</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="pt-8 text-center border-t border-slate-100 dark:border-slate-800/60">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Ainda não possui credenciais?{" "}
                            <Link href="/cadastro" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded-sm outline-none transition-colors">
                                Solicite seu cadastro
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}


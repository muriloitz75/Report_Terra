"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleAlert, Loader2, WifiOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
            //    Isso elimina o problema de chamada server-to-server do authorize
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

            // 2. Token obtido com sucesso — criar sessão NextAuth passando o token já validado
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
            setError("Servidor indisponível. Aguarde o backend iniciar e tente novamente.")
            setErrorType("server")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Report Terra</CardTitle>
                    <CardDescription className="text-center">
                        Entre com suas credenciais para acessar o sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Usuário</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="seunome"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                {errorType === "server"
                                    ? <WifiOff className="h-4 w-4" />
                                    : <CircleAlert className="h-4 w-4" />
                                }
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                "Entrar"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-gray-500">
                    <p>
                        Não tem conta?{" "}
                        <Link href="/cadastro" className="text-blue-600 hover:underline">
                            Solicite cadastro
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}

'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-red-50 text-red-900">
                    <h2 className="text-2xl font-bold mb-4">Algo deu muito errado!</h2>
                    <p className="mb-4 font-mono text-sm bg-red-100 p-4 rounded border border-red-200">
                        {error.message || "Erro desconhecido"}
                    </p>
                    <button
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        onClick={() => reset()}
                    >
                        Tentar novamente
                    </button>
                </div>
            </body>
        </html>
    )
}

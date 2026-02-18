import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req: any) => {
    const publicPaths = ["/login", "/cadastro", "/api/auth", "/token", "/health", "/auth", "/me"];
    const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

    // Redirecionar para login se: sem sessão, ou sessão expirada (sem accessToken)
    const isExpired = req.auth && (req.auth as any).expired === true
    if ((!req.auth || isExpired) && !isPublicPath) {
        const proto = req.headers.get("x-forwarded-proto") || "https"
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
        const base = host ? `${proto}://${host}` : req.nextUrl.origin
        const url = new URL("/login", base)
        return NextResponse.redirect(url)
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

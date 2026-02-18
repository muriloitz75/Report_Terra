import { auth } from "@/auth"

export default auth((req: any) => {
    const publicPaths = ["/login", "/cadastro", "/api/auth", "/token", "/health", "/auth", "/me"];
    const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

    // Redirecionar para login se: sem sessão, ou sessão expirada (sem accessToken)
    const isExpired = req.auth && (req.auth as any).expired === true
    if ((!req.auth || isExpired) && !isPublicPath) {
        const newUrl = new URL("/login", req.nextUrl.origin)
        return Response.redirect(newUrl)
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

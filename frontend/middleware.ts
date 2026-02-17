import { auth } from "@/auth"

export default auth((req: any) => { // Type 'any' for now to potential type conflicts in beta
    console.log("[Middleware] Processing request:", req.nextUrl.pathname);
    console.log("[Middleware] Auth state:", req.auth ? "authenticated" : "not authenticated");
    
    // Rotas públicas que não precisam de autenticação
    const publicPaths = ["/login", "/api/auth"];
    const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));
    
    if (!req.auth && !isPublicPath) {
        console.log("[Middleware] Redirecting to /login");
        const newUrl = new URL("/login", req.nextUrl.origin)
        return Response.redirect(newUrl)
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

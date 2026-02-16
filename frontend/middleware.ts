import { auth } from "@/auth"

export default auth((req: any) => { // Type 'any' for now to potential type conflicts in beta
    console.log("[Middleware] Processing request:", req.nextUrl.pathname);
    if (!req.auth && req.nextUrl.pathname !== "/login") {
        console.log("[Middleware] Redirecting to /login");
        const newUrl = new URL("/login", req.nextUrl.origin)
        return Response.redirect(newUrl)
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
}

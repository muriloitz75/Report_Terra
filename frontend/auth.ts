import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

function decodeJWTPayload(token: string): Record<string, any> {
    try {
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
        return payload;
    } catch {
        return {};
    }
}

// URL do backend para uso no servidor (NextAuth roda no servidor)
// Em produção Docker, o backend está em localhost:8000
// Em desenvolvimento, usa NEXT_PUBLIC_API_URL ou localhost:8000
const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
        // No cliente, usa URL relativa (proxy via Next.js rewrites)
        return '';
    }
    // No servidor, usa a URL direta do backend
    return process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 horas
    },
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                try {
                    const backendUrl = getBackendUrl();
                    const res = await fetch(`${backendUrl}/token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            username: credentials.email as string,
                            password: credentials.password as string,
                        }),
                    })

                    if (!res.ok) {
                        throw new Error("Invalid credentials")
                    }

                    const data = await res.json()
                    const payload = decodeJWTPayload(data.access_token);

                    // Return user object compatible with NextAuth
                    return {
                        id: credentials.email as string,
                        email: credentials.email as string,
                        accessToken: data.access_token,
                        role: payload.role || 'user',
                        canGenerateReport: payload.can_generate_report || false,
                    }
                } catch (error) {
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = (user as any).accessToken
                token.role = (user as any).role
                token.canGenerateReport = (user as any).canGenerateReport
            }
            return token
        },
        async session({ session, token }) {
            (session as any).accessToken = token.accessToken
            ;(session as any).role = token.role
            ;(session as any).canGenerateReport = token.canGenerateReport
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
})

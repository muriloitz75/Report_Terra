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
                accessToken: {},
            },
            authorize: async (credentials) => {
                // O login page já validou as credenciais diretamente com o backend
                // e nos passa o accessToken já obtido. Aqui só decodificamos.
                const accessToken = credentials.accessToken as string | undefined
                if (!accessToken) return null

                const payload = decodeJWTPayload(accessToken)
                if (!payload.sub) return null

                return {
                    id: payload.sub,
                    email: payload.sub,
                    accessToken,
                    role: payload.role || 'user',
                    canGenerateReport: payload.can_generate_report || false,
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
            // Validar se o token do backend ainda é válido
            if (token.accessToken) {
                try {
                    const payload = decodeJWTPayload(token.accessToken as string)
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        return { ...token, accessToken: null }
                    }
                } catch {
                    return { ...token, accessToken: null }
                }
            }
            return token
        },
        async session({ session, token }) {
            if (!token.accessToken) {
                return { ...session, expired: true }
            }
            (session as any).accessToken = token.accessToken
            ;(session as any).role = token.role
            ;(session as any).canGenerateReport = token.canGenerateReport
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
    trustHost: true,
})

"use client"

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react"
import { useEffect } from "react"
import { setAuthToken } from "@/lib/api"

function AuthTokenBridge() {
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status !== "authenticated") {
            setAuthToken(null)
            return
        }
        setAuthToken((session as any)?.accessToken ?? null)
    }, [session, status])

    return null
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
            <AuthTokenBridge />
            {children}
        </NextAuthSessionProvider>
    )
}

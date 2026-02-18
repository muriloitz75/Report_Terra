"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getMe, Me } from "@/lib/api";

type PermissionsValue = {
    me: Me | null;
    loading: boolean;
    refresh: () => Promise<void>;
    isAdmin: boolean;
    canViewProcesses: boolean;
    canViewDashboard: boolean;
    canViewReports: boolean;
    canGenerateReport: boolean;
};

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(false);
    const inflightRef = useRef(false);

    const refresh = useCallback(async () => {
        if (status !== "authenticated" || !(session as any)?.accessToken) return;
        if (inflightRef.current) return;
        inflightRef.current = true;
        setLoading(true);
        try {
            const data = await getMe();
            setMe(data);
        } finally {
            setLoading(false);
            inflightRef.current = false;
        }
    }, [session, status]);

    useEffect(() => {
        if (status !== "authenticated") {
            setMe(null);
            return;
        }
        refresh();
    }, [status, refresh]);

    useEffect(() => {
        if (status !== "authenticated") return;
        const id = setInterval(() => {
            if (typeof document !== "undefined" && document.hidden) return;
            refresh();
        }, 15000);
        return () => clearInterval(id);
    }, [status, refresh]);

    useEffect(() => {
        if (status !== "authenticated") return;
        const handler = () => refresh();
        window.addEventListener("focus", handler);
        return () => window.removeEventListener("focus", handler);
    }, [status, refresh]);

    const value = useMemo<PermissionsValue>(() => {
        const sessionIsAdmin = (session as any)?.role === "admin";
        const isAdmin = me ? me.role === "admin" : sessionIsAdmin;
        const canViewProcesses = isAdmin || (me ? me.can_view_processes : (session as any)?.canViewProcesses !== false);
        const canViewDashboard = isAdmin || (me ? me.can_view_dashboard : (session as any)?.canViewDashboard !== false);
        const canViewReports = isAdmin || (me ? me.can_view_reports : (session as any)?.canViewReports !== false);
        const canGenerateReport = isAdmin || (me ? me.can_generate_report : (session as any)?.canGenerateReport === true);
        return {
            me,
            loading,
            refresh,
            isAdmin,
            canViewProcesses,
            canViewDashboard,
            canViewReports,
            canGenerateReport,
        };
    }, [loading, me, refresh, session]);

    return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
    const ctx = useContext(PermissionsContext);
    if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
    return ctx;
}

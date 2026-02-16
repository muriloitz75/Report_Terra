"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"

export function ConditionalSidebar() {
    const pathname = usePathname()

    if (pathname === "/login") return null

    return <AppSidebar />
}

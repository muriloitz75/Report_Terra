"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TableProperties, FileText, Menu, X, LogOut, Shield } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isShutdown, setIsShutdown] = useState(false);
    const { data: session } = useSession();

    const isAdmin = (session as any)?.role === "admin";
    const userEmail = session?.user?.email || "Usuário";
    const userInitial = userEmail.charAt(0).toUpperCase();

    const handleShutdown = async () => {
        if (confirm("Deseja realmente encerrar a aplicação?")) {
            setIsShutdown(true);
            try {
                // Dynamic import to avoid SSR issues
                const { shutdownApp } = await import("@/lib/api");
                await shutdownApp();
            } catch (e) {
                console.error(e);
            }
            // Try to close window
            window.close();
        }
    };

    const links = [
        { name: "Processos", href: "/processos", icon: TableProperties },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Relatórios IA", href: "/relatorios", icon: FileText },
    ];

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            </div>

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-100 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
                ${isHovered ? "md:w-64" : "md:w-20"}
                w-64`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex flex-col h-full p-4 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-8 px-2 mt-2 h-10">
                        <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <span className={`font-bold text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 ${!isHovered && "md:opacity-0 md:w-0 md:hidden"}`}>
                            Report Terra
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href || (link.href === "/dashboard" && pathname === "/");

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap h-10 ${isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                    title={!isHovered ? link.name : undefined}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className={`transition-opacity duration-300 ${!isHovered && "md:opacity-0 md:w-0 md:hidden"}`}>
                                        {link.name}
                                    </span>
                                </Link>
                            );
                        })}

                        {/* Admin link - only for admins */}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap h-10 ${pathname === "/admin"
                                    ? "bg-amber-600 text-white shadow-sm"
                                    : "text-amber-400 hover:text-white hover:bg-amber-700/40"
                                    }`}
                                onClick={() => setIsOpen(false)}
                                title={!isHovered ? "Painel Admin" : undefined}
                            >
                                <Shield className="w-4 h-4 shrink-0" />
                                <span className={`transition-opacity duration-300 ${!isHovered && "md:opacity-0 md:w-0 md:hidden"}`}>
                                    Painel Admin
                                </span>
                            </Link>
                        )}
                    </nav>

                    {/* Footer User/Actions */}
                    <div className="mt-auto pt-4 border-t border-slate-800 space-y-4">
                        <div className={`flex items-center justify-between px-2 h-8 ${!isHovered && "md:justify-center"}`}>
                            <span className={`text-xs text-slate-400 font-mono transition-opacity duration-300 ${!isHovered && "md:opacity-0 md:hidden"}`}>v1.1.0</span>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between h-14 overflow-hidden group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                                    <span className="text-xs font-bold">{userInitial}</span>
                                </div>
                                <div className={`flex flex-col transition-opacity duration-300 whitespace-nowrap ${!isHovered && "md:opacity-0 md:w-0 md:hidden"}`}>
                                    <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate">{userEmail}</span>
                                    <span className="text-[10px] text-slate-500">{isAdmin ? "Administrador" : "Usuário"}</span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className={`text-slate-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 transition-opacity duration-300 ${!isHovered && "md:opacity-0 md:w-0 md:hidden"}`}
                                onClick={handleShutdown}
                                title="Encerrar Aplicação"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Shutdown Overlay */}
            {isShutdown && (
                <div className="fixed inset-0 z-[60] bg-slate-950 text-white flex flex-col items-center justify-center p-4">
                    <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 max-w-md w-full text-center space-y-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                            <LogOut className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Aplicação Encerrada</h2>
                            <p className="text-slate-400">
                                O servidor foi desligado. Você pode fechar esta janela agora.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => window.close()}
                            className="w-full text-slate-900 hover:text-slate-700 bg-white hover:bg-slate-100"
                        >
                            Fechar Janela
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminsApi, authApi } from "@/lib/api";
import TeacherPanel from "./components/teacher-panel";
import FlowField from "@/components/ui/FlowField";
import {
    ShieldCheck, Users, CheckCircle, Ban,
    X, Trash2, LogOut, ArrowLeft, UserPlus, AlertTriangle, GraduationCap,
    Menu, Settings, CircleDollarSign, Store
} from "lucide-react";
import Image from "next/image";

export default function AdminTeachersPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [activeTab] = useState<"teachers">("teachers");

    // Modals & States
    const [showSuperAdminMenu, setShowSuperAdminMenu] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (saveMessage) {
            const timer = setTimeout(() => setSaveMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveMessage]);

    useEffect(() => {
        const userTypeString = localStorage.getItem("userType");
        setUserRole(userTypeString);
    }, []);

    const handleLogout = () => {
        authApi.logout();
        router.push("/login");
    };

    // Remote admin handlers removed as per user request to clean class


    return (
        <div className="dashboard-container relative min-h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
            <FlowField className="opacity-90 dark:opacity-45" theme="ocean" density="sparse" />
            <div className="absolute inset-0 z-[1] bg-white/18 dark:bg-slate-950/35" aria-hidden="true" />
            <div className="relative z-10">
                {saveMessage && (
                    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${saveMessage.type === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        {saveMessage.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" strokeWidth={2} />
                        ) : (
                            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
                        )}
                        <span className="font-medium">{saveMessage.text}</span>
                    </div>
                )}

                {/* Header */}
                <header className="dashboard-header sticky top-0 z-40" style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowSuperAdminMenu(true)}
                                    className="p-2.5 mr-1 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all shadow-sm hover:shadow-md"
                                    title="Menú Principal"
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center p-1.5 shadow-lg shadow-emerald-500/20">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                        Administración General
                                    </h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleLogout}
                                    className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium text-sm border border-gray-200 dark:border-slate-700 hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300 shadow-sm hover:shadow-md"
                                >
                                    <span className="group-hover:text-red-600 transition-colors hidden sm:inline">Cerrar Sesión</span>
                                    <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Super Admin Menu Sidebar (Drawer) */}
                <div
                    className={`fixed inset-0 z-[100] transition-opacity duration-300 ${showSuperAdminMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                >
                    {/* Fondo oscuro (Overlay) */}
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={() => setShowSuperAdminMenu(false)}
                    />

                    {/* Panel deslizable */}
                    <div
                        className={`absolute top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-transform duration-300 ease-in-out transform flex flex-col ${showSuperAdminMenu ? "translate-x-0" : "-translate-x-full"
                            }`}
                    >
                        {/* Header del Sidebar */}
                        <div className="px-6 py-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">Menú Principal</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSuperAdminMenu(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Botones del menú */}
                        <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4 ml-2">Módulos del Sistema</span>

                            <button
                                className="group flex flex-col items-start gap-1 px-4 py-3.5 rounded-2xl text-left border border-transparent hover:border-blue-100 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all select-none focus:outline-none"
                                onClick={() => { setShowSuperAdminMenu(false); }}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Administración General</span>
                                </div>
                            </button>

                            <button
                                className="group flex flex-col items-start gap-1 px-4 py-3.5 rounded-2xl text-left border border-transparent hover:border-emerald-100 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all select-none focus:outline-none"
                                onClick={() => { setShowSuperAdminMenu(false); router.push("/admin"); }}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        <CircleDollarSign className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Control de Pagos</span>
                                </div>
                            </button>

                            <button
                                className="group flex flex-col items-start gap-1 px-4 py-3.5 rounded-2xl text-left border border-transparent hover:border-purple-100 dark:hover:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all select-none focus:outline-none"
                                onClick={() => { setShowSuperAdminMenu(false); router.push("/POS"); }}
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">BreakTime POS</span>
                                </div>
                            </button>
                        </div>

                        {/* Footer del Sidebar */}
                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">Sesión Protegida</p>
                                    <p className="text-xs text-emerald-500 font-medium">Accesos Totales Activos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {userRole === null ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                            <span className="ml-3" style={{ color: 'var(--text-secondary)' }}>Verificando permisos...</span>
                        </div>
                    ) : (
                        <>
                            <TeacherPanel userRole={userRole as "admin" | "superadmin"} />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

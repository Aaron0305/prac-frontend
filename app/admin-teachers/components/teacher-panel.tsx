"use client";

import { useState, useEffect } from "react";
import { teachersApi, Teacher } from "@/lib/api";
import {
    Users, UserPlus, X, Trash2, Ban, CheckCircle,
    GraduationCap, Eye, EyeOff, Check, Shield,
    AlertCircle, Mail, Lock, User, Calendar
} from "lucide-react";
import AssignStudentsModal from "@/app/admin-teachers/components/AssignStudentsModal";
import TeacherScheduleModal from "@/app/admin-teachers/components/TeacherScheduleModal";

// ── Password strength ────────────────────────────────────────────────────────
interface StrengthCheck { label: string; pass: boolean }
interface PasswordStrength { score: number; label: string; color: string; checks: StrengthCheck[] }

function getPasswordStrength(password: string): PasswordStrength {
    const checks: StrengthCheck[] = [
        { label: "Al menos 8 caracteres", pass: password.length >= 8 },
        { label: "Letra mayúscula", pass: /[A-Z]/.test(password) },
        { label: "Letra minúscula", pass: /[a-z]/.test(password) },
        { label: "Número", pass: /\d/.test(password) },
        { label: "Carácter especial (!@#…)", pass: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = checks.filter((c) => c.pass).length;
    const levels = [
        { label: "", color: "transparent" },
        { label: "Muy débil", color: "#ef4444" },
        { label: "Débil", color: "#f97316" },
        { label: "Regular", color: "#eab308" },
        { label: "Fuerte", color: "#22c55e" },
        { label: "Muy fuerte", color: "#14b8a6" },
    ];
    return { score, checks, ...levels[score] };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface TeacherPanelProps {
    userRole: "admin" | "superadmin";
}

interface TeacherScheduleBlock {
    start?: string;
    end?: string;
}

function getMinutesFromTime(value?: string): number | null {
    if (!value || !value.includes(":")) return null;
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
}

function getTeacherWeeklyHours(schedule: unknown): number {
    if (!Array.isArray(schedule)) return 0;
    return schedule.reduce((acc: number, rawBlock: unknown) => {
        const block = rawBlock as TeacherScheduleBlock;
        const start = getMinutesFromTime(block.start);
        const end = getMinutesFromTime(block.end);
        if (start === null || end === null || end <= start) return acc;
        return acc + (end - start) / 60;
    }, 0);
}

function formatHours(hours: number): string {
    if (Number.isInteger(hours)) return `${hours}`;
    return `${hours.toFixed(1)}`;
}

export default function TeacherPanel({ userRole }: TeacherPanelProps) {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [teacherForSchedule, setTeacherForSchedule] = useState<Teacher | null>(null);
    const [teacherForStudents, setTeacherForStudents] = useState<Teacher | null>(null);
    const [hoveredTeacherId, setHoveredTeacherId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "", email: "", password: "", confirmPassword: "",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const passwordStrength = getPasswordStrength(formData.password);
    const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
    const totalWeeklyHours = teachers.reduce((acc, teacher) => acc + getTeacherWeeklyHours(teacher.schedule), 0);
    const totalWeeklySessions = teachers.reduce((acc, teacher) => acc + (Array.isArray(teacher.schedule) ? teacher.schedule.length : 0), 0);

    useEffect(() => { loadTeachers(); }, []);

    useEffect(() => {
        if (saveMessage) {
            const t = setTimeout(() => setSaveMessage(null), 3000);
            return () => clearTimeout(t);
        }
    }, [saveMessage]);

    const loadTeachers = async () => {
        setIsLoading(true);
        try {
            const data = await teachersApi.getAll();
            setTeachers(data);
        } catch (error) {
            console.error("Error cargando teachers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = "Nombre requerido";
        if (!formData.email.trim()) errors.email = "El usuario es requerido";
        else if (!/^[a-zA-Z0-9._-]+$/.test(formData.email)) errors.email = "Solo letras, números, puntos y guiones";
        if (!formData.password) errors.password = "Contraseña requerida";
        else if (passwordStrength.score < 3) errors.password = "La contraseña debe ser al menos Regular";
        if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateTeacher = async () => {
        if (!validateForm()) return;
        setIsCreating(true);
        try {
            const newTeacher = await teachersApi.create({
                name: formData.name,
                email: formData.email + "@redIA.com",
                password: formData.password,
            });
            setTeachers((prev) => [...prev, newTeacher]);
            setShowCreateModal(false);
            setFormData({ name: "", email: "", password: "", confirmPassword: "" });
            setShowPassword(false);
            setShowConfirm(false);
            setSaveMessage({ type: "success", text: "Maestro creado correctamente" });
        } catch (error) {
            console.error("Error creando teacher:", error);
            const message = error instanceof Error ? error.message : "Error al crear maestro";
            setFormErrors({ email: message });
            setSaveMessage({ type: "error", text: "Error al crear maestro" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleStatus = async (teacherId: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        setTeachers((prev) => prev.map((t) => t.id === teacherId ? { ...t, status: newStatus } : t));
        try {
            await teachersApi.toggleStatus(teacherId, currentStatus);
            setSaveMessage({ type: "success", text: `Maestro ${newStatus === "active" ? "activado" : "desactivado"} correctamente` });
        } catch (error) {
            console.error("Error cambiando estado:", error);
            setTeachers((prev) => prev.map((t) => t.id === teacherId ? { ...t, status: currentStatus as "active" | "inactive" } : t));
            setSaveMessage({ type: "error", text: "Error al cambiar estado" });
        }
    };

    const handleDelete = (teacher: Teacher) => {
        setTeacherToDelete(teacher);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!teacherToDelete) return;
        try {
            await teachersApi.delete(teacherToDelete.id);
            setTeachers((prev) => prev.filter((t) => t.id !== teacherToDelete.id));
            setSaveMessage({ type: "success", text: "Maestro eliminado correctamente" });
        } catch (error) {
            console.error("Error eliminando teacher:", error);
            setSaveMessage({ type: "error", text: "Error al eliminar maestro" });
        } finally {
            setShowDeleteModal(false);
            setTeacherToDelete(null);
        }
    };

    // ── Access denied ────────────────────────────────────────────────────────
    if (userRole !== "superadmin" && userRole !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Ban className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[#F5EDE6]">Acceso Denegado</h2>
                <p className="text-[#7D6860] max-w-md">
                    Solo los administradores tienen permisos para ver y gestionar las cuentas de maestros.
                </p>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in relative text-[#F5EDE6]">

            {/* ── Toast ── */}
            {saveMessage && (
                <div className={`fixed top-20 right-4 z-[100] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-fade-in ${saveMessage.type === "success" ? "bg-green-500" : "bg-red-500"} text-white`}>
                    {saveMessage.type === "success"
                        ? <CheckCircle className="w-5 h-5 shrink-0" />
                        : <Ban className="w-5 h-5 shrink-0" />}
                    <span className="text-sm font-semibold">{saveMessage.text}</span>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#F5EDE6]">Gestión de Docentes</h2>
                    <p className="mt-1 text-sm text-[#7D6860]">
                        Cuentas con acceso a la plataforma para el panel de maestros.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-[#D97757]/25 hover:shadow-[#D97757]/40"
                    style={{ background: "linear-gradient(135deg, #D97757, #C06040)" }}
                >
                    <UserPlus className="w-4 h-4" strokeWidth={2} />
                    Nuevo Docente
                </button>
            </div>

            {/* ── Dashboard Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-2xl border border-[#1E1410] bg-[#120E0C] flex items-center gap-5 transition-all hover:scale-[1.01] hover:border-[#D97757]/30 shadow-sm group">
                    <div className="w-12 h-12 rounded-xl bg-[#1A1210] border border-[#1E1410] flex items-center justify-center text-[#D97757] group-hover:bg-[#D97757]/10 transition-colors">
                        <GraduationCap className="w-6 h-6 text-[#D97757]" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#D97757] opacity-80">Total Docentes</p>
                        <h4 className="text-3xl font-black text-[#F5EDE6]">{teachers.length}</h4>
                    </div>
                </div>
                <div className="p-6 rounded-2xl border border-[#1E1410] bg-[#120E0C] flex items-center gap-5 transition-all hover:scale-[1.01] hover:border-[#D97757]/30 shadow-sm group">
                    <div className="w-12 h-12 rounded-xl bg-[#1A1210] border border-[#1E1410] flex items-center justify-center text-[#E8C4A8] group-hover:bg-[#E8C4A8]/10 transition-colors">
                        <Calendar className="w-6 h-6 text-[#E8C4A8]" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#E8C4A8] opacity-80">Horas / Sem (Total)</p>
                        <h4 className="text-3xl font-black text-[#F5EDE6]">
                            {formatHours(totalWeeklyHours)}h
                        </h4>
                    </div>
                </div>
            </div>

            {/* ── Grid de Tarjetas (Teachers) ── */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <div className="w-12 h-12 border-4 border-[#D97757]/20 border-t-[#D97757] rounded-full animate-spin" />
                    <p className="text-[#D97757] font-medium animate-pulse">Sincronizando plantilla...</p>
                </div>
            ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-[3rem] border border-dashed border-[#1E1410] bg-[#120E0C]/50">
                    <GraduationCap className="w-16 h-16 mb-4 text-[#7D6860] opacity-50" />
                    <h3 className="text-xl font-bold text-[#F5EDE6]">No hay docentes registrados</h3>
                    <p className="max-w-xs mx-auto mt-2 text-[#7D6860]">Comienza agregando un nuevo profesor para gestionar sus clases.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teachers.map((teacher) => {
                        const teacherHours = getTeacherWeeklyHours(teacher.schedule);
                        const isDimmed = hoveredTeacherId !== null && hoveredTeacherId !== teacher.id;
                        
                        return (
                            <div
                                key={teacher.id}
                                className="group relative rounded-2xl p-6 transition-all duration-300 border border-[#1E1410] bg-[#1A1210] hover:border-[#D97757]/40 flex flex-col"
                                onMouseEnter={() => setHoveredTeacherId(teacher.id)}
                                onMouseLeave={() => setHoveredTeacherId(null)}
                                style={{ 
                                    opacity: isDimmed ? 0.6 : 1,
                                    transform: isDimmed ? "scale(0.98)" : "scale(1)",
                                    boxShadow: isDimmed ? "none" : "0 10px 24px rgba(13, 10, 9, 0.5)",
                                }}
                            >
                                {/* Status Badge */}
                                <div className="absolute top-4 right-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                        teacher.status === 'active' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {teacher.status === 'active' ? '● Online' : '○ Offline'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#D97757] to-[#C06040] flex items-center justify-center shadow-lg shadow-[#D97757]/20 group-hover:rotate-6 transition-transform duration-500">
                                        <div className="text-2xl font-black text-white">
                                            {teacher.name.charAt(0)}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 pr-12">
                                        <h3 className="text-lg font-bold truncate leading-tight group-hover:text-[#E8C4A8] transition-colors text-[#F5EDE6]">{teacher.name}</h3>
                                        <p className="text-xs truncate mt-0.5 text-[#7D6860]">{teacher.email}</p>
                                    </div>
                                </div>

                                {/* Mini Schedule Preview */}
                                <div className="flex-1 space-y-3 mb-6">
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest pb-2 border-b border-[#1E1410] text-[#7D6860]">
                                        <span>Horario Semanal</span>
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#120E0C] border border-[#1E1410]">
                                        <span className="text-[11px] font-semibold text-[#7D6860]">Total semanal</span>
                                        <span className="text-sm font-bold text-[#F5EDE6]">{formatHours(teacherHours)}h</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(teacher.schedule as any[])?.slice(0, 3).map((b, i) => (
                                            <span key={i} className="px-2 py-1 rounded-lg text-[10px] bg-[#120E0C] text-[#7D6860] border border-[#1E1410]">
                                                {b.day.substring(0, 3)} {b.start}
                                            </span>
                                        )) || <span className="text-[11px] italic text-[#7D6860]">Sin horario definido</span>}
                                        {((teacher.schedule as any[])?.length > 3) && (
                                            <span className="px-2 py-1 rounded-lg bg-[#D97757]/10 text-[10px] text-[#D97757]">
                                                +{(teacher.schedule as any[]).length - 3}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons Grid */}
                                <div className="grid grid-cols-4 gap-2 mt-auto">
                                    <button
                                        onClick={() => setTeacherForStudents(teacher)}
                                        className="p-3 rounded-xl bg-[#120E0C] border border-[#1E1410] text-[#E8C4A8] hover:bg-[#E8C4A8]/10 hover:border-[#E8C4A8]/30 transition-all duration-300 group/btn"
                                        title="Estudiantes"
                                    >
                                        <Users className="w-5 h-5 mx-auto group-hover/btn:scale-110" />
                                    </button>
                                    <button
                                        onClick={() => setTeacherForSchedule(teacher)}
                                        className="p-3 rounded-xl bg-[#120E0C] border border-[#1E1410] text-[#D97757] hover:bg-[#D97757]/10 hover:border-[#D97757]/30 transition-all duration-300 group/btn"
                                        title="Horario"
                                    >
                                        <Calendar className="w-5 h-5 mx-auto group-hover/btn:scale-110" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(teacher.id, teacher.status)}
                                        className="p-3 rounded-xl bg-[#120E0C] border border-[#1E1410] text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all duration-300 group/btn"
                                        title="Estado"
                                    >
                                        <Ban className="w-5 h-5 mx-auto group-hover/btn:scale-110" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(teacher)}
                                        className="p-3 rounded-xl bg-[#120E0C] border border-[#1E1410] text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 group/btn"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5 mx-auto group-hover/btn:scale-110" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Modal: Crear Teacher                                          */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div
                        className="rounded-2xl w-full max-w-md shadow-2xl bg-[#1A1210] border border-[#1E1410]"
                        style={{ animation: "scaleIn .18s ease" }}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-5 flex items-start justify-between border-b border-[#1E1410]">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D97757] to-[#C06040] flex items-center justify-center shadow-lg shadow-[#D97757]/20 shrink-0">
                                    <UserPlus className="w-5 h-5 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold leading-tight text-[#F5EDE6]">Nuevo Docente</h3>
                                    <p className="text-xs mt-0.5 text-[#7D6860]">Completa todos los campos para crear la cuenta.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-[#7D6860]"
                            >
                                <X className="w-4 h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">

                            {/* Nombre */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-1.5 text-[#7D6860]">
                                    <User className="w-3.5 h-3.5" strokeWidth={2.5} /> Nombre y Apellido
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nombre completo del docente"
                                    className="w-full px-4 py-2.5 rounded-xl text-sm transition-all outline-none bg-[#120E0C] text-[#F5EDE6]"
                                    style={{ border: `1px solid ${formErrors.name ? "#ef4444" : "#1E1410"}` }}
                                />
                                {formErrors.name && (
                                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3" />{formErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-1.5 text-[#7D6860]">
                                    <Mail className="w-3.5 h-3.5" strokeWidth={2.5} /> Correo Electrónico (Login)
                                </label>
                                <div
                                    className="flex items-center rounded-xl overflow-hidden transition-all bg-[#120E0C]"
                                    style={{ border: `1px solid ${formErrors.email ? "#ef4444" : "#1E1410"}` }}
                                >
                                    <input
                                        type="text"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value.replace(/@.*/, "") })}
                                        placeholder="nombre.apellido"
                                        className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-[#F5EDE6]"
                                    />
                                    <span className="pr-4 text-sm font-medium select-none shrink-0 text-[#7D6860]">
                                        @redIA.com
                                    </span>
                                </div>
                                {formErrors.email && (
                                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3" />{formErrors.email}
                                    </p>
                                )}
                            </div>

                            {/* Contraseñas */}
                            <div className="grid grid-cols-2 gap-3">

                                {/* Contraseña */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-1.5 text-[#7D6860]">
                                        <Lock className="w-3.5 h-3.5" strokeWidth={2.5} /> Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm transition-all outline-none bg-[#120E0C] text-[#F5EDE6]"
                                            style={{ border: `1px solid ${formErrors.password ? "#ef4444" : "#1E1410"}` }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 text-[#7D6860]"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Barra de fuerza */}
                                    {formData.password.length > 0 && (
                                        <div className="mt-2">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((i) => {
                                                    const barColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6"];
                                                    return (
                                                        <div
                                                            key={i}
                                                            className="h-1 flex-1 rounded-full transition-all duration-300"
                                                            style={{ background: i <= passwordStrength.score ? barColors[passwordStrength.score - 1] : "#1E1410" }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-1 text-xs font-semibold" style={{ color: passwordStrength.color }}>
                                                {passwordStrength.label}
                                            </p>
                                            <ul className="mt-1.5 space-y-1">
                                                {passwordStrength.checks.map((c, i) => (
                                                    <li key={i} className="flex items-center gap-1.5 text-xs">
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                                                            style={{ background: c.pass ? "#22c55e20" : "#1E1410" }}
                                                        >
                                                            <Check
                                                                className="w-2 h-2"
                                                                strokeWidth={3}
                                                                style={{ color: c.pass ? "#22c55e" : "#7D6860", opacity: c.pass ? 1 : 0.3 }}
                                                            />
                                                        </span>
                                                        <span className={c.pass ? "text-[#F5EDE6]" : "text-[#7D6860]"}>
                                                            {c.label}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {formErrors.password && (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                            <AlertCircle className="w-3 h-3" />{formErrors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Confirmar contraseña */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase mb-1.5 text-[#7D6860]">
                                        <Shield className="w-3.5 h-3.5" strokeWidth={2.5} /> Confirmar
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm transition-all outline-none bg-[#120E0C] text-[#F5EDE6]"
                                            style={{
                                                border: `1px solid ${formErrors.confirmPassword ? "#ef4444"
                                                    : passwordsMatch ? "#22c55e"
                                                        : "#1E1410"
                                                    }`,
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((v) => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 text-[#7D6860]"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordsMatch ? (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-green-500">
                                            <Check className="w-3 h-3" strokeWidth={3} /> Coinciden
                                        </p>
                                    ) : formErrors.confirmPassword ? (
                                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                                            <AlertCircle className="w-3 h-3" />{formErrors.confirmPassword}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 pt-4 flex gap-3 border-t border-[#1E1410]">
                            <button
                                onClick={handleCreateTeacher}
                                disabled={isCreating}
                                className="flex-1 px-4 py-2.5 text-sm text-white font-bold rounded-xl transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#D97757]/20"
                                style={{ background: "linear-gradient(135deg, #D97757, #C06040)" }}
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" strokeWidth={2} />
                                        Crear Docente
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-white/5 bg-[#120E0C] text-[#F5EDE6] border border-[#1E1410]"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Modal: Confirmar Borrar Teacher                               */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {showDeleteModal && teacherToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div
                        className="rounded-2xl p-6 max-w-sm w-full shadow-2xl bg-[#1A1210] border border-[#1E1410]"
                        style={{ animation: "scaleIn .18s ease" }}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Trash2 className="w-7 h-7 text-red-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold text-center mb-2 text-[#F5EDE6]">¿Eliminar Maestro?</h3>
                        <p className="text-center text-sm mb-6 text-[#7D6860]">
                            Estás a punto de eliminar permanentemente a{" "}
                            <strong className="text-[#F5EDE6]">{teacherToDelete.name}</strong>.
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-white/5 bg-[#120E0C] text-[#F5EDE6] border border-[#1E1410]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Modales de Asignación y Horario                               */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {teacherForStudents && (
                <AssignStudentsModal
                    teacher={teacherForStudents}
                    onClose={() => setTeacherForStudents(null)}
                    onSaveSuccess={() => {
                        setTeacherForStudents(null);
                        setSaveMessage({ type: "success", text: "Alumnos asignados correctamente" });
                    }}
                />
            )}

            {teacherForSchedule && (
                <TeacherScheduleModal
                    teacher={teacherForSchedule}
                    onClose={() => setTeacherForSchedule(null)}
                    onSaveSuccess={() => {
                        setTeacherForSchedule(null);
                        setSaveMessage({ type: "success", text: "Horario actualizado correctamente" });
                        loadTeachers();
                    }}
                />
            )}

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(.96) translateY(6px); }
                    to   { opacity: 1; transform: scale(1)   translateY(0); }
                }
            `}</style>
        </div>
    );
}
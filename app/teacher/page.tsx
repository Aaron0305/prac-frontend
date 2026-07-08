"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, teachersApi, studentsApi, Teacher, Student } from "@/lib/api";
import { LogOut, User, Bell, Calendar as CalendarIcon, Settings, Layers, Search, GraduationCap, Sparkles as SparklesIcon, Bot, Clock } from "lucide-react";
import Image from "next/image";
import TeacherChat from "./chat";

const ORDERED_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const BLOCK_PALETTE = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
const CALENDAR_START_MINUTES = 9 * 60;
const CALENDAR_END_MINUTES = 20 * 60;
const CALENDAR_HOUR_HEIGHT = 56;
const DAY_TO_NUMBER: Record<string, number> = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
};

type TeacherScheduleBlock = {
    day?: string;
    start?: string;
    end?: string;
    description?: string;
};

type ParsedTeacherScheduleBlock = {
    day: string;
    start: string;
    end: string;
    description: string;
    studentIds?: string[];
    startMinutes: number;
    endMinutes: number;
    color: string;
};

function normalizeDay(day: string | undefined): string {
    if (!day) return "";

    const normalized = day
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const dayMap: Record<string, string> = {
        lunes: "Lunes",
        martes: "Martes",
        miercoles: "Miércoles",
        jueves: "Jueves",
        viernes: "Viernes",
        sabado: "Sábado",
    };

    return dayMap[normalized] || day;
}

function timeToMinutes(time: string | undefined): number {
    if (!time || !time.includes(":")) return Number.MAX_SAFE_INTEGER;
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER;
    return hours * 60 + minutes;
}

function formatHourLabel(hour24: number): string {
    const period = hour24 >= 12 ? 'pm' : 'am';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:00 ${period}`;
}

function toIsoDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function buildBlockKey(block: Pick<ParsedTeacherScheduleBlock, "day" | "start" | "end" | "description">): string {
    return `${block.day}|${block.start}|${block.end}|${block.description}`;
}


export default function TeacherDashboard() {
    const router = useRouter();
    const [userName] = useState<string>(() => {
        if (typeof window === "undefined") return "Profesor";
        return authApi.getUserName() || "Profesor";
    });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "schedule" | "students" | "settings">("dashboard");
    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessionTeacherId] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem("userId") || "";
    });
    const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
    const [selectedClassDate, setSelectedClassDate] = useState<string>(() => toIsoDateLocal(new Date()));
    const [notesByEntry, setNotesByEntry] = useState<Record<string, string>>(() => {
        if (typeof window === "undefined") return {};
        try {
            const uid = localStorage.getItem("userId") || "";
            const raw = localStorage.getItem(`teacher_class_notes_${uid}`);
            return raw ? (JSON.parse(raw) as Record<string, string>) : {};
        } catch {
            return {};
        }
    });

    // Theme state for a consistent futuristic look
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Authenticate the user and ensure they are a teacher
        const token = localStorage.getItem("token");
        const userType = authApi.getUserType();

        if (!token) {
            router.replace("/login");
            return;
        }

        if (userType !== "teacher") {
            router.replace("/admin");
            return;
        }

        const fetchTeacherData = async () => {
            const userId = localStorage.getItem("userId");
            if (userId && userType === "teacher") {
                try {
                    const [teacherResult, studentsResult] = await Promise.allSettled([
                        teachersApi.getById(userId),
                        studentsApi.getAll()
                    ]);

                    if (teacherResult.status === "fulfilled") {
                        setTeacherData(teacherResult.value);
                    } else {
                        console.error("Error fetching teacher profile:", teacherResult.reason);
                    }

                    if (studentsResult.status === "fulfilled") {
                        setStudents(studentsResult.value.filter(s => s.teacherId === userId && s.status === 'active'));
                    } else {
                        console.error("Error fetching students:", studentsResult.reason);
                    }
                } catch (error) {
                    console.error("Error fetching teacher data:", error);
                }
            }
            setIsLoading(false);
        };

        const checkTheme = () => {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(systemDark); 
        };

        checkTheme();
        fetchTeacherData();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => setIsDark(e.matches));

        return () => mediaQuery.removeEventListener('change', (e) => setIsDark(e.matches));
    }, [router]);

    const handleLogout = () => {
        authApi.logout();
        router.replace("/login");
    };

    const bgClass = isDark ? "bg-[#000510] text-white" : "bg-slate-50 text-slate-800";
    const headerClass = isDark ? "bg-[#0a1124]/80 border-white/10" : "bg-white/80 border-slate-200";
    const surfaceClass = isDark ? "bg-[#0a1124] border-white/5" : "bg-white border-slate-200";
    const scheduleBlocks: TeacherScheduleBlock[] = Array.isArray(teacherData?.schedule)
        ? (teacherData.schedule as TeacherScheduleBlock[])
        : [];

    const parsedScheduleBlocks: ParsedTeacherScheduleBlock[] = scheduleBlocks
        .map((block, idx) => {
            const day = normalizeDay(block.day);
            const startMinutes = timeToMinutes(block.start);
            const endMinutes = timeToMinutes(block.end);

            return {
                day,
                start: block.start || "",
                end: block.end || "",
                description: block.description?.trim() || "Clase",
                studentIds: Array.isArray((block as { studentIds?: unknown }).studentIds)
                    ? ((block as { studentIds?: string[] }).studentIds ?? [])
                    : [],
                startMinutes,
                endMinutes,
                color: BLOCK_PALETTE[idx % BLOCK_PALETTE.length],
            };
        })
        .filter((block) => {
            const isDayValid = ORDERED_DAYS.includes(block.day);
            const isTimeValid = Number.isFinite(block.startMinutes) && Number.isFinite(block.endMinutes) && block.endMinutes > block.startMinutes;
            return isDayValid && isTimeValid;
        })
        .sort((a, b) => {
            const dayOrderDiff = ORDERED_DAYS.indexOf(a.day) - ORDERED_DAYS.indexOf(b.day);
            if (dayOrderDiff !== 0) return dayOrderDiff;
            return a.startMinutes - b.startMinutes;
        });

    const scheduleByDay: Record<string, ParsedTeacherScheduleBlock[]> = ORDERED_DAYS.reduce((acc, day) => {
        acc[day] = parsedScheduleBlocks.filter((block) => block.day === day);
        return acc;
    }, {} as Record<string, ParsedTeacherScheduleBlock[]>);

    const hourMarks = Array.from(
        { length: (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES) / 60 + 1 },
        (_, idx) => CALENDAR_START_MINUTES / 60 + idx
    );

    const calendarHeight = (((CALENDAR_END_MINUTES - CALENDAR_START_MINUTES) / 60) * CALENDAR_HOUR_HEIGHT) + 24;
    const effectiveSelectedBlockKey = selectedBlockKey && parsedScheduleBlocks.some((block) => buildBlockKey(block) === selectedBlockKey)
        ? selectedBlockKey
        : (parsedScheduleBlocks.length > 0 ? buildBlockKey(parsedScheduleBlocks[0]) : null);

    const selectedBlock = effectiveSelectedBlockKey
        ? parsedScheduleBlocks.find((block) => buildBlockKey(block) === effectiveSelectedBlockKey) || null
        : null;

    const selectedBlockStudents = selectedBlock
        ? (() => {
            if (selectedBlock.studentIds && selectedBlock.studentIds.length > 0) {
                const allowed = new Set(selectedBlock.studentIds);
                return students.filter((student) => allowed.has(student.id));
            }

            const dayNumber = DAY_TO_NUMBER[selectedBlock.day];
            return students.filter((student) => {
                if (!student.classDays || student.classDays.length === 0) return true;
                return student.classDays.includes(dayNumber);
            });
        })()
        : [];

    const notesStorageKey = sessionTeacherId ? `teacher_class_notes_${sessionTeacherId}` : null;

    const persistNotes = (next: Record<string, string>) => {
        setNotesByEntry(next);
        if (notesStorageKey && typeof window !== "undefined") {
            localStorage.setItem(notesStorageKey, JSON.stringify(next));
        }
    };

    const noteEntryKey = (block: ParsedTeacherScheduleBlock, studentId: string) => {
        return `${selectedClassDate}|${buildBlockKey(block)}|${studentId}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#000510]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen w-full transition-colors duration-500 ${bgClass} font-sans relative overflow-hidden`}>

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-br from-[#000510] via-[#020c1b] to-[#041025]" : "bg-gradient-to-br from-slate-50 to-blue-50/30"}`} />
                <div className={`absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] animate-pulse-slow ${isDark ? "bg-cyan-900/20" : "bg-blue-300/20"}`} />
                <div className={`absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] animate-pulse-slow delay-700 ${isDark ? "bg-purple-900/20" : "bg-indigo-300/10"}`} />
            </div>

            {/* Sidebar / Navigation (Vertical navigation concept) */}
            <div className={`fixed left-0 top-0 bottom-0 w-[80px] sm:w-[240px] z-30 flex flex-col backdrop-blur-xl border-r transition-all duration-300 ${headerClass}`}>

                {/* Brand Area */}
                <div className="h-20 flex items-center justify-center sm:justify-start sm:px-6 border-b border-inherit">
                    <div className="w-10 h-10 relative">
                        <Image src="/image/logo_mensaje.png" alt="Logo" fill className="object-contain" />
                    </div>
                    <span className={`hidden sm:block ml-3 font-bold text-lg tracking-wide ${isDark ? "text-white" : "text-blue-900"}`}>
                        What Time Is It?
                    </span>
                </div>

                {/* Nav Links */}
                <div className="flex-1 py-8 px-3 sm:px-4 space-y-2">
                    <NavItem icon={<Layers />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} isDark={isDark} />
                    <NavItem icon={<Bot />} label="Asistente IA" active={activeTab === "chat"} onClick={() => setActiveTab("chat")} isDark={isDark} />
                    <NavItem icon={<CalendarIcon />} label="Mi Horario" active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} isDark={isDark} />
                    <NavItem icon={<User />} label="Mis Alumnos" active={activeTab === "students"} onClick={() => setActiveTab("students")} isDark={isDark} />
                    <NavItem icon={<Settings />} label="Configuración" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} isDark={isDark} />
                </div>

                <div className="p-4 border-t border-inherit">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center sm:justify-start gap-3 py-3 px-3 rounded-xl transition-all ${isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"}`}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden sm:inline font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 ml-[80px] sm:ml-[240px] min-h-screen flex flex-col">

                {/* Header Navbar */}
                <header className={`h-20 flex items-center justify-between px-6 sm:px-10 backdrop-blur-md border-b sticky top-0 z-20 ${headerClass}`}>
                    <div className="flex items-center gap-4">
                        <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                            Panel de Maestro
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <button className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}>
                            <Search className="w-5 h-5" />
                        </button>
                        <button className={`p-2 rounded-full transition-colors relative ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}>
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-inherit" />
                        </button>

                        <div className="w-px h-8 bg-current opacity-20 hidden sm:block"></div>

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{userName}</p>
                                <p className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? "text-cyan-400" : "text-blue-600"}`}>Teacher</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Elements */}
                <div className="flex-1 flex flex-col h-[calc(100vh-80px)] overflow-y-auto">
                    {activeTab === "chat" ? (
                        /* CHAT TAB */
                        <div className="flex-1 h-full w-full">
                            <TeacherChat isDark={isDark} />
                        </div>
                    ) : activeTab === "dashboard" ? (
                        /* DASHBOARD TAB (default) */
                        <div className="h-full pr-2 p-6 sm:p-10">
                            {/* Welcome Banner */}
                            <div className={`relative overflow-hidden rounded-[2rem] p-8 sm:p-12 mb-8 border shadow-2xl ${isDark ? "bg-gradient-to-br from-[#121c36] to-[#0a1124] border-white/5 shadow-blue-900/20" : "bg-gradient-to-br from-blue-600 to-indigo-700 border-transparent shadow-blue-500/30"}`}>
                                
                                {/* Decorative background shapes */}
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                                
                                <div className="relative z-10 max-w-2xl">
                                    <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight drop-shadow-md">
                                        ¡Hola, {userName.split(" ")[0]}! Bienvenido de nuevo.
                                    </h2>
                                    <p className={`text-lg mb-8 max-w-xl ${isDark ? "text-slate-300" : "text-blue-100"}`}>
                                        Este es tu nuevo portal de maestro. Pronto podrás visualizar tus clases asignadas, herramientas de IA para material de clase, y progreso de tus estudiantes.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab("chat")}
                                        className="px-6 py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-slate-50 transition-colors shadow-lg shadow-black/10 inline-flex items-center gap-2"
                                    >
                                        <Bot className="w-5 h-5" />
                                        Hablar con IA (Beta)
                                    </button>
                                </div>

                                {/* Illustration/Icon */}
                                <div className="absolute right-10 bottom-0 opacity-20 sm:opacity-100 pointer-events-none transform translate-y-10 hidden md:block">
                                    <GraduationCap className="w-64 h-64 text-white opacity-30 drop-shadow-lg" />
                                </div>
                            </div>

                            {/* Stats / Widgets */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <Widget title="Bloques de Clase" value={Array.isArray(teacherData?.schedule) ? teacherData.schedule.length.toString() : "0"} subtitle="Sesiones semanales" icon={<CalendarIcon />} isDark={isDark} surfaceClass={surfaceClass} color="blue" />
                                <Widget title="Estudiantes Activos" value={students.length.toString()} subtitle="Alumnos a tu cargo" icon={<UsersIcon />} isDark={isDark} surfaceClass={surfaceClass} color="cyan" />
                                <Widget title="Materiales de IA" value="-" subtitle="Base de conocimiento" icon={<SparklesIcon />} isDark={isDark} surfaceClass={surfaceClass} color="purple" />
                            </div>
                        </div>
                    ) : activeTab === "schedule" ? (
                        /* SCHEDULE TAB */
                        <div className="h-full pr-2 p-6 sm:p-10">
                            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>Mi Horario Semanal</h2>
                            {!teacherData?.schedule || teacherData.schedule.length === 0 ? (
                                <div className={`p-8 text-center rounded-2xl border ${isDark ? "bg-[#0a1124] border-white/5 opacity-70" : "bg-white border-slate-200"}`}>
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-semibold mb-2">No tienes horario asignado</h3>
                                    <p className="text-sm">Contacta al administrador para que asigne tus bloques de horas semanales.</p>
                                </div>
                            ) : (
                                <div className={`rounded-2xl border overflow-hidden ${surfaceClass}`}>
                                    <div className={`px-5 py-3 border-b ${isDark ? "border-white/10" : "border-slate-200"}`}>
                                        <p className={`text-sm font-semibold ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
                                            Vista semanal de clases
                                        </p>
                                        <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Horario organizado de lunes a sábado, con bloques colocados por hora.
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
                                        <div className="min-w-[920px]">
                                            <div
                                                className={`grid border-b ${isDark ? "border-white/10" : "border-slate-200"}`}
                                                style={{ gridTemplateColumns: `72px repeat(${ORDERED_DAYS.length}, minmax(130px, 1fr))` }}
                                            >
                                                <div className={isDark ? "bg-white/[0.02]" : "bg-slate-50"} />
                                                {ORDERED_DAYS.map((day) => (
                                                    <div
                                                        key={day}
                                                        className={`px-3 py-3 text-center text-xs font-black uppercase tracking-wider ${isDark ? "text-cyan-300 bg-white/[0.02]" : "text-blue-700 bg-slate-50"}`}
                                                    >
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>

                                            <div
                                                className="grid"
                                                style={{ gridTemplateColumns: `72px repeat(${ORDERED_DAYS.length}, minmax(130px, 1fr))` }}
                                            >
                                                <div
                                                    className={`relative border-r ${isDark ? "border-white/10" : "border-slate-200"}`}
                                                    style={{ height: `${calendarHeight}px` }}
                                                >
                                                    {hourMarks.map((hour) => (
                                                        <div
                                                            key={hour}
                                                            className="absolute right-2 -translate-y-1/2"
                                                            style={{ top: `${(hour - CALENDAR_START_MINUTES / 60) * CALENDAR_HOUR_HEIGHT}px` }}
                                                        >
                                                            <span className={`text-[11px] font-semibold tabular-nums ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                {formatHourLabel(hour)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {ORDERED_DAYS.map((day) => (
                                                    <div
                                                        key={day}
                                                        className={`relative border-r last:border-r-0 ${isDark ? "border-white/10 bg-[#0d1834]/55" : "border-slate-200 bg-slate-50/35"}`}
                                                        style={{
                                                            height: `${calendarHeight}px`,
                                                            backgroundImage: isDark
                                                                ? `repeating-linear-gradient(to bottom, rgba(148,163,184,.25) 0px, rgba(148,163,184,.25) 1px, transparent 1px, transparent ${CALENDAR_HOUR_HEIGHT}px)`
                                                                : `repeating-linear-gradient(to bottom, rgba(148,163,184,.35) 0px, rgba(148,163,184,.35) 1px, transparent 1px, transparent ${CALENDAR_HOUR_HEIGHT}px)`,
                                                        }}
                                                    >
                                                        {scheduleByDay[day].map((block, idx) => {
                                                            const top = ((block.startMinutes - CALENDAR_START_MINUTES) / 60) * CALENDAR_HOUR_HEIGHT;
                                                            const rawHeight = ((block.endMinutes - block.startMinutes) / 60) * CALENDAR_HOUR_HEIGHT;
                                                            const height = Math.max(rawHeight - 4, 28);
                                                            const isSelected = selectedBlockKey === buildBlockKey(block);

                                                            return (
                                                                <div
                                                                    key={`${day}-${block.start}-${block.end}-${idx}`}
                                                                    className="absolute left-1.5 right-1.5 rounded-xl px-2.5 py-2 overflow-hidden cursor-pointer"
                                                                    style={{
                                                                        top: `${top + 2}px`,
                                                                        height: `${height}px`,
                                                                        background: `${block.color}dd`,
                                                                        border: isSelected ? "2px solid rgba(255,255,255,0.85)" : `1px solid ${block.color}`,
                                                                        boxShadow: isSelected
                                                                            ? `0 0 0 2px ${block.color}88, 0 8px 20px ${block.color}44`
                                                                            : `0 6px 14px ${block.color}33`,
                                                                    }}
                                                                    title={`${block.day}: ${block.start} - ${block.end}`}
                                                                    onClick={() => {
                                                                        setSelectedBlockKey(buildBlockKey(block));
                                                                    }}
                                                                >
                                                                    <p className="text-[10px] font-black text-white/95 uppercase tracking-wide leading-none truncate">
                                                                        {block.description}
                                                                    </p>
                                                                    <p className="text-[10px] font-semibold text-white/80 mt-1 tabular-nums">
                                                                        {block.start} - {block.end}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedBlock && (
                                        <div className={`border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
                                            <div className="px-5 py-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <p className={`text-sm font-bold ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
                                                            Alumnos del bloque: {selectedBlock.day} {selectedBlock.start} - {selectedBlock.end}
                                                        </p>
                                                        <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                            {selectedBlock.description} · {selectedBlockStudents.length} alumno(s) según asignación administrativa
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="date"
                                                            value={selectedClassDate}
                                                            onChange={(e) => setSelectedClassDate(e.target.value)}
                                                            className="px-3 py-2 rounded-lg text-xs font-semibold"
                                                            style={{
                                                                background: isDark ? "rgba(15,23,42,.8)" : "#fff",
                                                                color: isDark ? "#e2e8f0" : "#334155",
                                                                border: isDark ? "1px solid rgba(148,163,184,.35)" : "1px solid #cbd5e1",
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {selectedBlockStudents.length === 0 ? (
                                                    <div className={`mt-4 p-4 rounded-xl border text-sm ${isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}>
                                                        No hay alumnos asignados para este bloque. Solicita al administrador que realice la asignación.
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                        {selectedBlockStudents.map((student) => {
                                                            const key = noteEntryKey(selectedBlock, student.id);
                                                            const note = notesByEntry[key] || "";
                                                            return (
                                                                <div
                                                                    key={student.id}
                                                                    className={`rounded-xl border p-3 ${isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-white"}`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                                                                            {student.name}
                                                                        </p>
                                                                        <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                            #{student.studentNumber}
                                                                        </span>
                                                                    </div>
                                                                    <textarea
                                                                        value={note}
                                                                        onChange={(e) => persistNotes({ ...notesByEntry, [key]: e.target.value })}
                                                                        placeholder="Observaciones o avances de esta clase..."
                                                                        rows={3}
                                                                        className="w-full rounded-lg px-3 py-2 text-xs"
                                                                        style={{
                                                                            background: isDark ? "rgba(15,23,42,.75)" : "#f8fafc",
                                                                            color: isDark ? "#e2e8f0" : "#334155",
                                                                            border: isDark ? "1px solid rgba(148,163,184,.35)" : "1px solid #cbd5e1",
                                                                        }}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : activeTab === "students" ? (
                        /* STUDENTS TAB */
                        <div className="h-full pr-2 p-6 sm:p-10">
                            <h2 className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-800"}`}>Mis Alumnos ({students.length})</h2>
                            {students.length === 0 ? (
                                <div className={`p-8 text-center rounded-2xl border ${isDark ? "bg-[#0a1124] border-white/5 opacity-70" : "bg-white border-slate-200"}`}>
                                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-semibold mb-2">No tienes alumnos asignados</h3>
                                    <p className="text-sm">Aún no se te han asignado alumnos activos.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {students.map(student => (
                                        <div key={student.id} className={`p-4 rounded-xl border flex items-center gap-4 ${surfaceClass}`}>
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                                {student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{student.name}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/20">#{student.studentNumber}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">{student.level}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </main>

            <style jsx global>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-pulse-slow { animation: pulse-slow 8s infinite alternate; }

                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

// Subcomponents helper
function NavItem({ icon, label, active = false, onClick, isDark }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isDark: boolean }) {
    const activeClass = active
        ? isDark ? "bg-cyan-500/10 text-cyan-400 font-semibold" : "bg-blue-50 text-blue-600 font-semibold"
        : isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800";

    return (
        <button onClick={onClick} className={`w-full flex items-center justify-center sm:justify-start gap-4 px-3 py-3.5 rounded-xl cursor-pointer transition-all ${activeClass}`}>
            <span className="shrink-0">{icon}</span>
            <span className="hidden sm:inline text-sm">{label}</span>
        </button>
    );
}

interface WidgetProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    isDark: boolean;
    surfaceClass: string;
    color: "blue" | "cyan" | "purple";
}

function Widget({ title, value, subtitle, icon, isDark, surfaceClass, color }: WidgetProps) {
    const iconColors = {
        blue: "from-blue-500 to-indigo-500 shadow-blue-500/20",
        cyan: "from-cyan-400 to-blue-500 shadow-cyan-500/20",
        purple: "from-purple-500 to-pink-500 shadow-purple-500/20"
    };

    return (
        <div className={`p-6 rounded-2xl border ${surfaceClass} flex items-center gap-5 hover:transform hover:-translate-y-1 transition-transform duration-300 shadow-sm`}>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconColors[color as keyof typeof iconColors]} flex items-center justify-center text-white shadow-lg shrink-0`}>
                {icon}
            </div>
            <div>
                <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-slate-800"}`}>{value}</p>
                <p className={`text-xs mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{subtitle}</p>
            </div>
        </div>
    );
}

function UsersIcon() {
    return <User />;
}


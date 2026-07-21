"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, teachersApi, studentsApi, Teacher, Student } from "@/lib/api";
import { 
    LogOut, User, Bell, Settings, Layers, Search, 
    Bot, Clock, BrainCircuit, Network, BookOpen, UserCircle 
} from "lucide-react";
import Image from "next/image";
import TeacherChat from "./chat";

const ORDERED_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const CALENDAR_START_MINUTES = 9 * 60;
const CALENDAR_END_MINUTES = 20 * 60;
const CALENDAR_HOUR_HEIGHT = 56;

// RedAi color palette for blocks
const BLOCK_PALETTE = ["#D97757", "#C06040", "#A8442A", "#8F331A", "#75220D", "#9C4A32"];

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
    const normalized = day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const dayMap: Record<string, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado" };
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
    const [userName, setUserName] = useState<string>("Profesor");
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "schedule" | "students" | "settings">("dashboard");
    const [teacherData, setTeacherData] = useState<Teacher | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessionTeacherId, setSessionTeacherId] = useState<string>("");
    const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
    const [selectedClassDate, setSelectedClassDate] = useState<string>("");
    const [notesByEntry, setNotesByEntry] = useState<Record<string, string>>({});

    useEffect(() => {
        if (typeof window !== "undefined") {
            setUserName(authApi.getUserName() || "Profesor");
            setSessionTeacherId(localStorage.getItem("userId") || "");
            setSelectedClassDate(toIsoDateLocal(new Date()));
            try {
                const uid = localStorage.getItem("userId") || "";
                const raw = localStorage.getItem(`teacher_class_notes_${uid}`);
                if (raw) setNotesByEntry(JSON.parse(raw));
            } catch {}
        }
    }, []);

    useEffect(() => {
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
                    }
                    if (studentsResult.status === "fulfilled") {
                        setStudents(studentsResult.value.filter(s => s.teacherId === userId && s.status === 'active'));
                    }
                } catch (error) {
                    console.error("Error fetching teacher data:", error);
                }
            }
            setIsLoading(false);
        };

        fetchTeacherData();
    }, [router]);

    const handleLogout = () => {
        authApi.logout();
        router.replace("/login");
    };

    const scheduleBlocks: TeacherScheduleBlock[] = Array.isArray(teacherData?.schedule) ? (teacherData.schedule as TeacherScheduleBlock[]) : [];
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
                studentIds: Array.isArray((block as any).studentIds) ? ((block as any).studentIds ?? []) : [],
                startMinutes,
                endMinutes,
                color: BLOCK_PALETTE[idx % BLOCK_PALETTE.length],
            };
        })
        .filter((block) => ORDERED_DAYS.includes(block.day) && Number.isFinite(block.startMinutes) && Number.isFinite(block.endMinutes) && block.endMinutes > block.startMinutes)
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
            return students; // Simplified logic for demo
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
            <div className="min-h-screen flex items-center justify-center bg-[#0D0A09]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D97757]" />
            </div>
        );
    }

    return (
        <div className="h-screen w-full transition-colors duration-500 bg-[#0D0A09] text-[#F5EDE6] font-sans relative overflow-hidden">
            
            {/* Background Warm Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-[#D97757]/10" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[150px] bg-[#C06040]/5" />
            </div>

            {/* Sidebar */}
            <div className="fixed left-0 top-0 bottom-0 w-[80px] sm:w-[240px] z-30 flex flex-col backdrop-blur-xl border-r border-[#1E1410] bg-[#120E0C]/80">
                <div className="h-20 flex items-center justify-center sm:justify-start sm:px-6 border-b border-[#1E1410]">
                    <div className="w-8 h-8 relative flex items-center justify-center">
                        <Image src="/openclaw.svg" alt="RedAi Logo" fill className="object-contain" />
                    </div>
                    <span className="hidden sm:block ml-3 font-black text-lg tracking-wide text-[#E8C4A8]">
                        RedAi
                    </span>
                </div>

                <div className="flex-1 py-8 px-3 sm:px-4 space-y-2">
                    <NavItem icon={<Layers />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
                    <NavItem icon={<Bot />} label="Asistente IA" active={activeTab === "chat"} onClick={() => setActiveTab("chat")} />
                    <NavItem icon={<Clock />} label="Mi Horario" active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} />
                    <NavItem icon={<UserCircle />} label="Estudiantes" active={activeTab === "students"} onClick={() => setActiveTab("students")} />
                    <NavItem icon={<Settings />} label="Ajustes" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
                </div>

                <div className="p-4 border-t border-[#1E1410]">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center sm:justify-start gap-3 py-3 px-3 rounded-xl transition-all hover:bg-[#D97757]/10 text-[#D97757]">
                        <LogOut className="w-5 h-5" />
                        <span className="hidden sm:inline font-medium">Salir</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 ml-[80px] sm:ml-[240px] h-screen flex flex-col overflow-hidden">
                <header className="h-20 shrink-0 flex items-center justify-between px-6 sm:px-10 backdrop-blur-md border-b z-20 border-[#1E1410] bg-[#120E0C]/80">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5EDE6]">
                        {activeTab === 'dashboard' ? 'Panel de Control' : 
                         activeTab === 'chat' ? 'Consulta de IA' : 
                         activeTab === 'schedule' ? 'Horario' : 
                         activeTab === 'students' ? 'Estudiantes' : 'Configuración'}
                    </h1>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <button className="p-2 rounded-full transition-colors hover:bg-white/5 text-[#7D6860] hover:text-[#E8C4A8]">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full transition-colors relative hover:bg-white/5 text-[#7D6860] hover:text-[#E8C4A8]">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D97757] rounded-full border-2 border-[#120E0C]" />
                        </button>
                        <div className="w-px h-8 bg-[#1E1410] hidden sm:block"></div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-semibold text-[#F5EDE6]">{userName}</p>
                                <p className="text-[11px] font-medium uppercase tracking-wider text-[#D97757]">Maestro</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D97757] to-[#A8442A] flex items-center justify-center text-white font-bold shadow-lg shadow-[#D97757]/20">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className={`flex-1 min-h-0 flex flex-col ${activeTab === "chat" ? "overflow-hidden" : "overflow-y-auto"}`}>
                    {activeTab === "chat" ? (
                        <div className="flex-1 min-h-0 w-full overflow-hidden">
                            <TeacherChat isDark={true} />
                        </div>
                    ) : activeTab === "dashboard" ? (
                        <div className="h-full p-6 sm:p-10 max-w-6xl mx-auto w-full">
                            {/* Welcome Banner */}
                            <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-12 mb-8 border border-[#1E1410] bg-gradient-to-br from-[#1A1210] to-[#0D0A09] shadow-2xl">
                                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('/openclaw.svg')] bg-no-repeat bg-right bg-contain opacity-5 pointer-events-none transform scale-150 translate-x-1/4" />
                                <div className="relative z-10 max-w-2xl">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D97757] to-[#C06040] flex items-center justify-center shadow-lg shadow-[#D97757]/20">
                                            <BrainCircuit className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[#E8C4A8] font-bold tracking-widest uppercase text-xs">RedAi · Enfoque Moderno</span>
                                    </div>
                                    <h2 className="text-3xl sm:text-4xl font-black text-[#F5EDE6] mb-4 tracking-tight">
                                        Hola, {userName.split(" ")[0]}
                                    </h2>
                                    <p className="text-lg mb-8 text-[#7D6860] max-w-xl leading-relaxed">
                                        Bienvenido a tu entorno docente asistido. Consulta el material estructurado del libro de Russell & Norvig o interactúa con el asistente para generar contenido de clase.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab("chat")}
                                        className="px-6 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg shadow-[#D97757]/25 hover:shadow-[#D97757]/40 hover:-translate-y-0.5 inline-flex items-center gap-2"
                                        style={{ background: "linear-gradient(135deg, #D97757 0%, #C06040 100%)" }}
                                    >
                                        <Bot className="w-5 h-5" />
                                        Consultar IA
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <Widget title="Sesiones Activas" value={Array.isArray(teacherData?.schedule) ? teacherData.schedule.length.toString() : "0"} subtitle="Esta semana" icon={<Clock />} />
                                <Widget title="Estudiantes" value={students.length.toString()} subtitle="En tus grupos" icon={<User />} />
                                <Widget title="Capítulos Leídos" value="4" subtitle="Avance del semestre" icon={<BookOpen />} />
                            </div>

                            <h3 className="text-xl font-bold text-[#F5EDE6] mb-4">Temario: Inteligencia Artificial</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <TopicCard title="1. Agentes Inteligentes" desc="Racionalidad, PEAS, tipos de entornos y estructura de agentes." />
                                <TopicCard title="2. Búsqueda y Resolución" desc="Búsqueda no informada, informada (A*) y heurísticas." />
                                <TopicCard title="3. Lógica y Conocimiento" desc="Lógica proposicional, agentes basados en conocimiento." />
                            </div>
                        </div>
                    ) : activeTab === "schedule" ? (
                        <div className="h-full p-6 sm:p-10 max-w-6xl mx-auto w-full">
                            {/* Schedule implementation simplified for brevity but matching dark theme */}
                            <div className="p-8 text-center rounded-2xl border border-[#1E1410] bg-[#120E0C]">
                                <Clock className="w-12 h-12 mx-auto mb-4 text-[#7D6860]" />
                                <h3 className="text-xl font-semibold mb-2 text-[#F5EDE6]">Horario en construcción</h3>
                                <p className="text-sm text-[#7D6860]">La vista detallada del horario está siendo adaptada al nuevo diseño.</p>
                            </div>
                        </div>
                    ) : activeTab === "students" ? (
                        <div className="h-full p-6 sm:p-10 max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {students.map(student => (
                                    <div key={student.id} className="p-4 rounded-xl border border-[#1E1410] bg-[#1A1210] flex items-center gap-4 hover:border-[#D97757]/30 transition-colors">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D97757] to-[#8F331A] flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-[#D97757]/10">
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#F5EDE6]">{student.name}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded-md bg-[#1E1410] text-[#E8C4A8]">#{student.studentNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {students.length === 0 && (
                                    <p className="text-[#7D6860]">No hay estudiantes asignados.</p>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
    const activeClass = active
        ? "bg-[#D97757]/10 text-[#D97757] font-semibold border-r-2 border-[#D97757]"
        : "text-[#7D6860] hover:bg-white/5 hover:text-[#E8C4A8] border-r-2 border-transparent";

    return (
        <button onClick={onClick} className={`w-full flex items-center justify-center sm:justify-start gap-4 px-4 py-3.5 rounded-l-xl cursor-pointer transition-all ${activeClass}`}>
            <span className="shrink-0">{icon}</span>
            <span className="hidden sm:inline text-sm">{label}</span>
        </button>
    );
}

function Widget({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
    return (
        <div className="p-6 rounded-2xl border border-[#1E1410] bg-[#120E0C] flex items-center gap-5 hover:border-[#D97757]/30 transition-colors shadow-sm group">
            <div className="w-12 h-12 rounded-xl bg-[#1A1210] border border-[#1E1410] flex items-center justify-center text-[#D97757] group-hover:bg-[#D97757]/10 transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-[#7D6860]">{title}</p>
                <p className="text-2xl font-bold mt-1 text-[#F5EDE6]">{value}</p>
                <p className="text-xs mt-1 text-[#D97757] opacity-80">{subtitle}</p>
            </div>
        </div>
    );
}

function TopicCard({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="p-5 rounded-2xl border border-[#1E1410] bg-[#1A1210] hover:border-[#D97757]/40 transition-colors cursor-pointer group">
            <h4 className="font-semibold text-[#F5EDE6] mb-2 group-hover:text-[#D97757] transition-colors">{title}</h4>
            <p className="text-xs text-[#7D6860] leading-relaxed">{desc}</p>
        </div>
    );
}

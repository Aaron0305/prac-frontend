"use client";

import { useState, useEffect, useRef } from "react";
import { Student, Teacher, studentsApi, teachersApi } from "@/lib/api";
import {
    X, Calendar, Clock, Trash2, Save,
    CheckCircle2, AlertCircle, GraduationCap, MousePointer2, Search,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface ScheduleBlock {
    day: string;
    start: string;
    end: string;
    description: string;
    studentIds?: string[];
}

interface TeacherScheduleModalProps {
    teacher: Teacher;
    onClose: () => void;
    onSaveSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes del grid
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

const START_HOUR = 9;           // 9:00 AM
const END_HOUR = 20;          // 8:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR; // 11 horas
const SLOT_H = 30;          // px por ranura de 30 min
const SLOTS_TOTAL = TOTAL_HOURS * 2; // 22 ranuras

// Paleta de colores para los bloques
const PALETTE = [
    "#3b82f6", // azul
    "#10b981", // esmeralda
    "#8b5cf6", // violeta
    "#f59e0b", // ámbar
    "#ef4444", // rojo
    "#06b6d4", // cian
    "#ec4899", // rosa
    "#84cc16", // lima
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────
function slotToTime(slot: number): string {
    const totalMin = START_HOUR * 60 + slot * 30;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeToSlot(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0);
}

function formatHour(h: number): string {
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
}

function getDuration(start: string, end: string): string {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return "";
    const hh = Math.floor(diff / 60);
    const mm = diff % 60;
    if (hh === 0) return `${mm}min`;
    if (mm === 0) return `${hh}h`;
    return `${hh}h ${mm}min`;
}

function blockColor(idx: number) { return PALETTE[idx % PALETTE.length]; }

function uniqueStudentIds(ids: string[] = []): string[] {
    return Array.from(new Set(ids));
}

// ─────────────────────────────────────────────────────────────────────────────
// Diálogo: nombrar clase nueva (aparece tras soltar el drag)
// ─────────────────────────────────────────────────────────────────────────────
interface NameDialogProps {
    day: string;
    startSlot: number;
    endSlot: number;   // inclusive
    clientX: number;
    clientY: number;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

function NameDialog({ day, startSlot, endSlot, clientX, clientY, onConfirm, onCancel }: NameDialogProps) {
    const [name, setName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 40); }, []);

    const start = slotToTime(startSlot);
    const end = slotToTime(endSlot + 1);
    const dur = getDuration(start, end);

    // Posición fija en la pantalla, ajustada para no salirse
    const left = Math.min(clientX + 12, window.innerWidth - 264);
    const top = Math.min(clientY - 10, window.innerHeight - 260);

    return (
        <div
            className="fixed z-[200] rounded-2xl overflow-hidden shadow-2xl"
            style={{
                left, top,
                width: "252px",
                background: "var(--modal-bg)",
                border: "1.5px solid rgba(249,115,22,0.5)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(249,115,22,0.15)",
                animation: "popIn .17s cubic-bezier(.34,1.56,.64,1)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Barra de información */}
            <div className="px-4 py-3" style={{ background: "rgba(217,119,87,0.08)", borderBottom: "1px solid rgba(217,119,87,0.2)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D97757]">{day}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {start} – {end}
                    {dur && <span className="ml-2 text-xs font-normal text-[#D97757]">({dur})</span>}
                </p>
            </div>

            {/* Formulario */}
            <div className="p-4 space-y-3">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Nombre del grupo / nivel
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Ej: Beginner 1, Avanzado A…"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") onConfirm(name);
                            if (e.key === "Escape") onCancel();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{
                            background: "var(--input-bg)",
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--input-border)",
                        }}
                    />
                    <p className="text-[10px] mt-1.5" style={{ color: "var(--text-secondary)" }}>
                        Puedes dejarlo vacío y editarlo después.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: "var(--surface-alt)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(name)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                        style={{ background: "linear-gradient(135deg, #D97757, #C06040)", boxShadow: "0 3px 10px rgba(217,119,87,.4)" }}
                    >
                        ✓ Crear clase
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diálogo: editar bloque existente (aparece al hacer clic en un bloque)
// ─────────────────────────────────────────────────────────────────────────────
interface BlockEditorPanelProps {
    block: ScheduleBlock;
    students: Student[];
    hiddenAssignedCount: number;
    color: string;
    onUpdate: (field: keyof ScheduleBlock, value: string) => void;
    onUpdateStudentIds: (studentIds: string[]) => void;
    onDelete: () => void;
    onClose: () => void;
}

function BlockEditorPanel({ block, students, hiddenAssignedCount, color, onUpdate, onUpdateStudentIds, onDelete, onClose }: BlockEditorPanelProps) {
    const dur = getDuration(block.start, block.end);
    const [searchTerm, setSearchTerm] = useState("");
    const assignedIds = new Set(block.studentIds || []);

    const filteredStudents = students.filter((student) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;

        return (
            student.name.toLowerCase().includes(term) ||
            student.studentNumber.toLowerCase().includes(term) ||
            student.level.toLowerCase().includes(term)
        );
    });

    const toggleStudent = (studentId: string) => {
        const next = new Set(assignedIds);
        if (next.has(studentId)) {
            next.delete(studentId);
        } else {
            next.add(studentId);
        }
        onUpdateStudentIds(Array.from(next));
    };

    return (
        <div
            className="h-full overflow-hidden"
            style={{
                background: "var(--modal-bg)",
                borderLeft: "1px solid var(--border-color)",
            }}
        >
            {/* Header del bloque */}
            <div
                className="px-4 py-3 flex items-start justify-between"
                style={{ background: `${color}18`, borderBottom: `1px solid ${color}30` }}
            >
                <div>
                    <p className="text-xs font-black uppercase tracking-widest" style={{ color }}>
                        {block.day}
                    </p>
                    <p className="text-base font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {block.start} – {block.end}
                        {dur && <span className="ml-2 text-sm font-normal" style={{ color }}>({dur})</span>}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors hover:bg-gray-500/10 shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Campos editables */}
            <div className="p-4 space-y-3 overflow-y-auto schedule-scroll" style={{ maxHeight: "calc(93vh - 230px)" }}>
                {/* Nivel / Grupo */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Nivel / Grupo
                    </label>
                    <input
                        type="text"
                        placeholder="Ej: Beginner 1"
                        value={block.description}
                        onChange={(e) => onUpdate("description", e.target.value)}
                        className="w-full px-3 py-3 rounded-xl text-base outline-none"
                        style={{ background: "var(--input-bg)", color: "var(--text-primary)", border: "1.5px solid var(--input-border)" }}
                        autoFocus
                    />
                </div>

                {/* Ajustar horas */}
                <div className="grid grid-cols-2 gap-2">
                    {(["start", "end"] as const).map((field) => (
                        <div key={field}>
                            <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-secondary)" }}>
                                {field === "start" ? "Inicio" : "Fin"}
                            </label>
                            <input
                                type="time"
                                value={block[field]}
                                min={field === "end" ? block.start : "09:00"}
                                max="20:00"
                                onChange={(e) => onUpdate(field, e.target.value)}
                                className="w-full px-2 py-2.5 rounded-xl text-base outline-none"
                                style={{ background: "var(--input-bg)", color: "var(--text-primary)", border: "1.5px solid var(--input-border)" }}
                            />
                        </div>
                    ))}
                </div>

                {/* Eliminar */}
                <button
                    onClick={onDelete}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-all text-red-500 hover:bg-red-500/10"
                    style={{ border: "1px solid rgba(239,68,68,.25)" }}
                >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar esta clase
                </button>

                {/* Asignación de alumnos por bloque */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                            Alumnos del bloque
                        </label>
                        <span className="text-xs font-semibold" style={{ color }}>
                            {assignedIds.size} asignado(s)
                        </span>
                    </div>

                    {hiddenAssignedCount > 0 && (
                        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                            {hiddenAssignedCount} alumno(s) oculto(s) por estar asignado(s) a otra clase.
                        </p>
                    )}

                    <div className="relative mb-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar alumno..."
                            className="w-full pl-9 pr-2 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: "var(--input-bg)", color: "var(--text-primary)", border: "1.5px solid var(--input-border)" }}
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </div>

                    <div
                        className="max-h-56 overflow-y-auto rounded-xl p-1.5 space-y-1 schedule-scroll"
                        style={{ background: "var(--surface-alt)", border: "1px solid var(--border-color)" }}
                    >
                        {filteredStudents.length === 0 ? (
                            <p className="text-sm text-center py-3" style={{ color: "var(--text-secondary)" }}>
                                No hay alumnos disponibles para este bloque
                            </p>
                        ) : (
                            filteredStudents.map((student) => {
                                const isSelected = assignedIds.has(student.id);
                                return (
                                    <button
                                        key={student.id}
                                        type="button"
                                        onClick={() => toggleStudent(student.id)}
                                        className="w-full text-left px-2 py-1.5 rounded-lg transition-colors"
                                        style={{
                                            background: isSelected ? `${color}22` : "transparent",
                                            border: `1px solid ${isSelected ? `${color}66` : "transparent"}`,
                                        }}
                                    >
                                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                            {student.name}
                                        </p>
                                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                            #{student.studentNumber}
                                        </p>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherScheduleModal({ teacher, onClose, onSaveSuccess }: TeacherScheduleModalProps) {
    const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
    const [teacherStudents, setTeacherStudents] = useState<Student[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [visible, setVisible] = useState(false);
    const [activeDay, setActiveDay] = useState("Lunes");

    // ── Estado del drag ─────────────────────────────────────────────────────
    const [dragDay, setDragDay] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragCurrent, setDragCurrent] = useState<number | null>(null);
    const isDragging = dragDay !== null && dragStart !== null;

    // ── Diálogos ─────────────────────────────────────────────────────────────
    const [nameDialog, setNameDialog] = useState<{
        day: string; startSlot: number; endSlot: number; clientX: number; clientY: number;
    } | null>(null);

    const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const modalRef = useRef<HTMLDivElement>(null);
    const suppressNextGridClickRef = useRef(false);

    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        if (teacher.schedule && Array.isArray(teacher.schedule)) {
            setSchedule(teacher.schedule as ScheduleBlock[]);
        }

        const loadTeacherStudents = async () => {
            try {
                const allStudents = await studentsApi.getAll();
                const assignedToTeacher = allStudents.filter(
                    (student) => student.teacherId === teacher.id && student.status === "active"
                );
                setTeacherStudents(assignedToTeacher);
            } catch (error) {
                console.error("No se pudieron cargar alumnos del maestro:", error);
                setTeacherStudents([]);
            }
        };

        void loadTeacherStudents();
    }, [teacher]);

    // ── Soltar drag en cualquier parte ────────────────────────────────────────
    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            if (!isDragging || dragStart === null || dragCurrent === null || !dragDay) return;
            const minSlot = Math.min(dragStart, dragCurrent);
            const maxSlot = Math.max(dragStart, dragCurrent);
            // Evita que el click inmediato posterior al mouseup cierre el diálogo recién abierto.
            suppressNextGridClickRef.current = true;
            setNameDialog({ day: dragDay, startSlot: minSlot, endSlot: maxSlot, clientX: e.clientX, clientY: e.clientY });
            setDragDay(null);
            setDragStart(null);
            setDragCurrent(null);
        };
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [isDragging, dragDay, dragStart, dragCurrent]);

    // ── Cerrar diálogos con Escape ────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setNameDialog(null); setEditingBlockIdx(null); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 280);
    };

    const handleSlotMouseDown = (day: string, slotIdx: number, e: React.MouseEvent) => {
        if (nameDialog || editingBlockIdx !== null) { setNameDialog(null); setEditingBlockIdx(null); return; }
        e.preventDefault();
        e.stopPropagation();
        setDragDay(day);
        setDragStart(slotIdx);
        setDragCurrent(slotIdx);
        setActiveDay(day);
    };

    const handleSlotMouseEnter = (day: string, slotIdx: number) => {
        if (isDragging && dragDay === day) setDragCurrent(slotIdx);
    };

    const confirmBlock = (name: string) => {
        if (!nameDialog) return;
        const { day, startSlot, endSlot } = nameDialog;
        setSchedule((prev) => [
            ...prev,
            { day, start: slotToTime(startSlot), end: slotToTime(endSlot + 1), description: name },
        ]);
        setNameDialog(null);
    };

    const updateBlock = (idx: number, field: keyof ScheduleBlock, value: string) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const updateBlockStudentIds = (idx: number, studentIds: string[]) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], studentIds: uniqueStudentIds(studentIds) };
            return next;
        });
    };

    const removeBlock = (idx: number) => {
        setSchedule((prev) => prev.filter((_, i) => i !== idx));
        setEditingBlockIdx(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setNameDialog(null);
        setEditingBlockIdx(null);
        try {
            await teachersApi.updateSchedule(teacher.id, schedule);
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2500);
            onSaveSuccess();
        } catch {
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 2500);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Datos derivados ───────────────────────────────────────────────────────
    const byDay: Record<string, { block: ScheduleBlock; idx: number }[]> = {};
    DAYS.forEach((d) => { byDay[d] = []; });
    schedule.forEach((b, i) => { if (byDay[b.day]) byDay[b.day].push({ block: b, idx: i }); });

    const countByDay = DAYS.map((d) => byDay[d].length);
    const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

    const selMin = dragStart !== null && dragCurrent !== null ? Math.min(dragStart, dragCurrent) : null;
    const selMax = dragStart !== null && dragCurrent !== null ? Math.max(dragStart, dragCurrent) : null;
    const editingBlock = editingBlockIdx !== null ? schedule[editingBlockIdx] || null : null;
    const assignedInOtherBlocks = new Set(
        schedule.flatMap((block, idx) => (idx === editingBlockIdx ? [] : block.studentIds || []))
    );
    const currentBlockStudentIds = new Set(editingBlock?.studentIds || []);
    const availableEditorStudents = teacherStudents.filter(
        (student) => !assignedInOtherBlocks.has(student.id) || currentBlockStudentIds.has(student.id)
    );
    const hiddenAssignedCount = Math.max(teacherStudents.length - availableEditorStudents.length, 0);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ─── Overlay ─────────────────────────────────────────────────── */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5"
                style={{
                    background: visible ? "rgba(0,0,0,0.65)" : "transparent",
                    backdropFilter: visible ? "blur(8px)" : "blur(0px)",
                    transition: "background .28s ease, backdrop-filter .28s ease",
                }}
                onClick={() => { setNameDialog(null); setEditingBlockIdx(null); handleClose(); }}
            >
                {/* ─── Modal ───────────────────────────────────────────────── */}
                <div
                    ref={modalRef}
                    className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                    style={{
                        maxWidth: "1500px",
                        maxHeight: "93vh",
                        background: "var(--modal-bg)",
                        border: "1px solid var(--border-color)",
                        transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
                        opacity: visible ? 1 : 0,
                        transition: "transform .3s cubic-bezier(.34,1.2,.64,1), opacity .24s ease",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ══════ HEADER ══════════════════════════════════════════ */}
                    <div
                        className="flex items-center justify-between px-6 py-5 shrink-0"
                        style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)", boxShadow: "0 4px 14px rgba(249,115,22,.3)" }}
                            >
                                <Calendar className="w-5 h-5 text-white" strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                                    Asignar Horario Semanal
                                </h3>
                                <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                    <span className="text-[#D97757]">{teacher.name}</span>
                                    {" · "}
                                    {schedule.length === 0 ? "Sin clases asignadas" : `${schedule.length} clase${schedule.length !== 1 ? "s" : ""} asignada${schedule.length !== 1 ? "s" : ""}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {saveStatus === "saved" && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Guardado
                                </span>
                            )}
                            {saveStatus === "error" && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                                    <AlertCircle className="w-3.5 h-3.5" /> Error al guardar
                                </span>
                            )}
                            <button onClick={handleClose} className="p-2 rounded-xl transition-colors hover:bg-gray-500/10" style={{ color: "var(--text-secondary)" }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ══════ HINT BAR ════════════════════════════════════════ */}
                    <div
                        className="px-6 py-3 shrink-0 flex items-center gap-2.5"
                        style={{ background: "rgba(217,119,87,0.06)", borderBottom: "1px solid rgba(217,119,87,0.12)" }}
                    >
                        <MousePointer2 className="w-4 h-4 text-[#D97757] shrink-0" />
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            <strong style={{ color: "var(--text-primary)" }}>Haz clic y arrastra</strong> en el calendario para agregar una clase
                            {" · "}
                            <strong style={{ color: "var(--text-primary)" }}>Clic en un bloque</strong> ya creado para editarlo o eliminarlo
                        </p>
                    </div>

                    {/* ══════ CUERPO: sidebar + grid ══════════════════════════ */}
                    <div className="flex flex-1 overflow-hidden">

                        {/* ─── SIDEBAR: resumen por día ─────────────────────── */}
                        <div
                            className="flex flex-col shrink-0"
                            style={{ width: "250px", borderRight: "1px solid var(--border-color)" }}
                        >
                            {/* Selector de días */}
                            <div className="p-3 shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <p className="text-xs font-black uppercase tracking-widest px-1 mb-2" style={{ color: "var(--text-secondary)" }}>
                                    Días de la semana
                                </p>
                                <div className="grid grid-cols-3 gap-1">
                                    {DAYS.map((day, di) => {
                                        const isAct = activeDay === day;
                                        const cnt = countByDay[di];
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setActiveDay(day)}
                                                className="relative py-2.5 rounded-xl text-center transition-all duration-150"
                                                style={{
                                                    background: isAct ? "linear-gradient(135deg,#f97316,#fbbf24)" : "var(--surface-alt)",
                                                    border: `1.5px solid ${isAct ? "transparent" : "var(--border-color)"}`,
                                                    boxShadow: isAct ? "0 3px 10px rgba(249,115,22,.3)" : "none",
                                                    transform: isAct ? "translateY(-1px)" : "none",
                                                }}
                                            >
                                                <span className="text-xs font-black tracking-wider"
                                                    style={{ color: isAct ? "white" : "var(--text-secondary)" }}>
                                                    {DAYS_SHORT[di]}
                                                </span>
                                                {cnt > 0 && (
                                                    <span
                                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                                                        style={{ background: isAct ? "white" : "#f97316", color: isAct ? "#f97316" : "white" }}
                                                    >
                                                        {cnt}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lista de bloques del día activo */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 schedule-scroll">
                                <p className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>{activeDay}</p>

                                {byDay[activeDay].length === 0 ? (
                                    <div
                                        className="flex flex-col items-center justify-center py-6 rounded-xl gap-2"
                                        style={{ border: "2px dashed var(--border-color)", background: "var(--surface-alt)" }}
                                    >
                                        <GraduationCap className="w-6 h-6" style={{ color: "var(--text-secondary)", opacity: 0.4 }} />
                                        <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
                                            Sin clases.<br />Selecciona horas en el calendario →
                                        </p>
                                    </div>
                                ) : (
                                    byDay[activeDay].map(({ block, idx }) => {
                                        const color = blockColor(idx);
                                        const isEdit = editingBlockIdx === idx;
                                        const dur = getDuration(block.start, block.end);
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group"
                                                style={{
                                                    background: isEdit ? `${color}18` : "var(--surface-alt)",
                                                    border: `1.5px solid ${isEdit ? color : "var(--border-color)"}`,
                                                }}
                                                onClick={() => {
                                                    setEditingBlockIdx(idx);
                                                    setNameDialog(null);
                                                }}
                                            >
                                                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: color }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                                                        {block.description || <span className="italic opacity-50">Sin nombre</span>}
                                                    </p>
                                                    <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                                                        {block.start}–{block.end}
                                                        {dur && <span className="ml-1 opacity-60">({dur})</span>}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 text-red-500 transition-all shrink-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ─── GRID INTERACTIVO ────────────────────────────── */}
                        <div
                            className="flex-1 overflow-auto schedule-scroll"
                            style={{ minWidth: 0, userSelect: "none" }}
                            onClick={() => {
                                if (suppressNextGridClickRef.current) {
                                    suppressNextGridClickRef.current = false;
                                    return;
                                }
                                setNameDialog(null);
                                setEditingBlockIdx(null);
                            }}
                        >
                            <div style={{ minWidth: "620px" }}>

                                {/* Cabecera de días */}
                                <div
                                    className="sticky top-0 z-40 grid"
                                    style={{
                                        gridTemplateColumns: `48px repeat(${DAYS.length}, 1fr)`,
                                        background: "var(--modal-bg)",
                                        borderBottom: "2px solid var(--border-color)",
                                    }}
                                >
                                    <div />
                                    {DAYS.map((day, di) => {
                                        const isAct = activeDay === day;
                                        const isDragCol = dragDay === day && isDragging;
                                        const cnt = countByDay[di];
                                        return (
                                            <div
                                                key={day}
                                                className="py-3.5 text-center transition-all duration-150 cursor-pointer"
                                                style={{
                                                    background: isDragCol ? "rgba(249,115,22,0.12)" : isAct ? "rgba(249,115,22,0.05)" : "transparent",
                                                    borderBottom: isAct ? "3px solid #f97316" : "3px solid transparent",
                                                }}
                                                onClick={() => setActiveDay(day)}
                                            >
                                                <span className="block text-xs font-black uppercase tracking-widest"
                                                    style={{ color: isAct || isDragCol ? "#f97316" : "var(--text-secondary)" }}>
                                                    {DAYS_SHORT[di]}
                                                </span>
                                                {cnt > 0 && (
                                                    <span
                                                        className="inline-flex mt-1 w-4 h-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                                                        style={{ background: isAct ? "#f97316" : "rgba(249,115,22,0.5)" }}
                                                    >
                                                        {cnt}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Cuerpo del grid */}
                                <div
                                    className="relative grid"
                                    style={{
                                        gridTemplateColumns: `48px repeat(${DAYS.length}, 1fr)`,
                                        height: `${SLOTS_TOTAL * SLOT_H}px`,
                                    }}
                                >
                                    {/* Eje de horas */}
                                    <div className="relative select-none pointer-events-none">
                                        {hours.map((h) => (
                                            <div
                                                key={h}
                                                className="absolute right-2"
                                                style={{ top: `${(h - START_HOUR) * 2 * SLOT_H - 8}px` }}
                                            >
                                                <span className="text-xs font-semibold tabular-nums"
                                                    style={{ color: "var(--text-secondary)", opacity: 0.65 }}>
                                                    {formatHour(h)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Líneas horizontales – overlay decorativo */}
                                    <div className="absolute pointer-events-none" style={{ inset: 0, left: "48px" }}>
                                        {hours.map((h) => (
                                            <div key={h} className="absolute w-full"
                                                style={{ top: `${(h - START_HOUR) * 2 * SLOT_H}px`, borderTop: "1px solid var(--border-color)", opacity: 0.5 }} />
                                        ))}
                                        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                            <div key={`hh${i}`} className="absolute w-full"
                                                style={{ top: `${i * 2 * SLOT_H + SLOT_H}px`, borderTop: "1px dashed var(--border-color)", opacity: 0.22 }} />
                                        ))}
                                    </div>

                                    {/* Columnas por día */}
                                    {DAYS.map((day) => {
                                        const isAct = activeDay === day;
                                        const isDragCol = dragDay === day;

                                        return (
                                            <div
                                                key={day}
                                                className="relative"
                                                style={{
                                                    borderLeft: "1px solid var(--border-color)",
                                                    background: isAct ? "rgba(249,115,22,0.02)" : "transparent",
                                                }}
                                            >
                                                {/* ── Ranuras clickeables (detrás de los bloques) ── */}
                                                {Array.from({ length: SLOTS_TOTAL }).map((_, slotIdx) => {
                                                    const inDrag = isDragCol && isDragging && selMin !== null && selMax !== null
                                                        && slotIdx >= selMin && slotIdx <= selMax;

                                                    return (
                                                        <div
                                                            key={slotIdx}
                                                            className="absolute w-full transition-colors duration-75"
                                                            style={{
                                                                top: `${slotIdx * SLOT_H}px`,
                                                                height: `${SLOT_H}px`,
                                                                background: inDrag ? "rgba(249,115,22,0.18)" : "transparent",
                                                                cursor: isDragging ? "row-resize" : "crosshair",
                                                                zIndex: isDragging ? 25 : 2,
                                                            }}
                                                            onMouseDown={(e) => handleSlotMouseDown(day, slotIdx, e)}
                                                            onMouseEnter={() => handleSlotMouseEnter(day, slotIdx)}
                                                        >
                                                            {/* Tooltip de hora al hacer hover (solo si no hay drag ni diálogo) */}
                                                            {!isDragging && !nameDialog && editingBlockIdx === null && (
                                                                <div
                                                                    className="slot-hover-hint absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center gap-1 transition-opacity duration-100"
                                                                    style={{ background: "rgba(249,115,22,0.07)", pointerEvents: "none" }}
                                                                >
                                                                    <span className="text-[11px] font-bold text-orange-500/70">
                                                                        {slotToTime(slotIdx)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}


                                                {/* ── Vista previa mientras arrastra ── */}
                                                {isDragCol && isDragging && selMin !== null && selMax !== null && (
                                                    <div
                                                        className="absolute left-1 right-1 rounded-xl pointer-events-none"
                                                        style={{
                                                            top: `${selMin * SLOT_H + 2}px`,
                                                            height: `${(selMax - selMin + 1) * SLOT_H - 4}px`,
                                                            background: "rgba(249,115,22,0.28)",
                                                            border: "2px solid rgba(249,115,22,0.75)",
                                                            zIndex: 7,
                                                        }}
                                                    >
                                                        <div className="px-2 pt-1">
                                                            <p className="text-xs font-black text-orange-600 dark:text-orange-300">
                                                                {slotToTime(selMin)} – {slotToTime(selMax + 1)}
                                                            </p>
                                                            <p className="text-[11px] text-orange-500/80 font-semibold">
                                                                {getDuration(slotToTime(selMin), slotToTime(selMax + 1))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── Bloques existentes ── */}
                                                {byDay[day].map(({ block, idx }, bIdx) => {
                                                    const startSlot = timeToSlot(block.start);
                                                    const endSlot = timeToSlot(block.end);
                                                    const spanSlots = Math.max(endSlot - startSlot, 1);
                                                    const color = blockColor(idx);
                                                    const isEditing = editingBlockIdx === idx;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="absolute left-1 right-1 rounded-xl overflow-hidden"
                                                            style={{
                                                                top: `${startSlot * SLOT_H + 2}px`,
                                                                height: `${spanSlots * SLOT_H - 4}px`,
                                                                background: isEditing ? color : `${color}e0`,
                                                                border: `1.5px solid ${color}`,
                                                                boxShadow: isEditing
                                                                    ? `0 6px 24px ${color}55, 0 0 0 3px ${color}30`
                                                                    : `0 2px 8px ${color}30`,
                                                                cursor: "pointer",
                                                                zIndex: isEditing ? 8 : 6,
                                                                transform: isEditing ? "scaleX(1.04)" : "scaleX(1)",
                                                                transition: "transform .15s ease, box-shadow .15s ease",
                                                                animation: `blockIn .2s cubic-bezier(.34,1.3,.64,1) ${bIdx * 0.05}s both`,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (editingBlockIdx === idx) {
                                                                    setEditingBlockIdx(null);
                                                                } else {
                                                                    setEditingBlockIdx(idx);
                                                                    setNameDialog(null);
                                                                }
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!isEditing) (e.currentTarget as HTMLElement).style.filter = "brightness(1.12)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                (e.currentTarget as HTMLElement).style.filter = "brightness(1)";
                                                            }}
                                                        >
                                                            <div className="px-2 py-1.5 h-full flex flex-col justify-between overflow-hidden">
                                                                <div>
                                                                    {block.description && (
                                                                        <p className="text-sm font-bold text-white leading-tight truncate">
                                                                            {block.description}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-[11px] text-white/75 font-semibold flex items-center gap-1 mt-0.5">
                                                                        <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                                                        {block.start}–{block.end}
                                                                    </p>
                                                                </div>
                                                                {spanSlots >= 3 && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Estado vacío total */}
                            {schedule.length === 0 && !isDragging && (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none"
                                    style={{ animation: "fadeIn .35s ease" }}
                                >
                                    <div className="text-5xl select-none">👆</div>
                                    <div className="text-center px-8">
                                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                                            Haz clic y arrastra para crear tu primera clase
                                        </p>
                                        <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
                                            Selecciona el rango de horas directamente en el calendario
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {editingBlockIdx !== null && editingBlock && (
                            <div className="shrink-0" style={{ width: "400px" }}>
                                <BlockEditorPanel
                                    block={editingBlock}
                                    students={availableEditorStudents}
                                    hiddenAssignedCount={hiddenAssignedCount}
                                    color={blockColor(editingBlockIdx)}
                                    onUpdate={(field, value) => updateBlock(editingBlockIdx, field, value)}
                                    onUpdateStudentIds={(studentIds) => updateBlockStudentIds(editingBlockIdx, studentIds)}
                                    onDelete={() => removeBlock(editingBlockIdx)}
                                    onClose={() => setEditingBlockIdx(null)}
                                />
                            </div>
                        )}
                    </div>

                    {/* ══════ FOOTER ══════════════════════════════════════════ */}
                    <div
                        className="flex items-center justify-between px-5 py-3.5 shrink-0"
                        style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface-alt)" }}
                    >
                        {/* Resumen por día */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {DAYS.map((day, di) => {
                                const cnt = countByDay[di];
                                if (cnt === 0) return null;
                                return (
                                    <span key={day} className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#f97316" }} />
                                        {DAYS_SHORT[di]}: {cnt}
                                    </span>
                                );
                            })}
                            {schedule.length === 0 && (
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Sin clases asignadas aún</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-semibold rounded-xl transition-all"
                                style={{ background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)", boxShadow: "0 4px 14px rgba(249,115,22,.35)" }}
                                onMouseEnter={(e) => { if (!isSaving) { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(249,115,22,.45)"; } }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(249,115,22,.35)"; }}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Guardando…
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" strokeWidth={2.3} />
                                        Guardar horario
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Diálogos flotantes FIXED (fuera del modal para evitar overflow) ─── */}
            {nameDialog && (
                <NameDialog
                    day={nameDialog.day}
                    startSlot={nameDialog.startSlot}
                    endSlot={nameDialog.endSlot}
                    clientX={nameDialog.clientX}
                    clientY={nameDialog.clientY}
                    onConfirm={confirmBlock}
                    onCancel={() => setNameDialog(null)}
                />
            )}
            {/* ─── Keyframes ──────────────────────────────────────────────── */}
            <style>{`
                @keyframes blockIn {
                    from { opacity: 0; transform: scaleY(0.55) translateY(-6px); }
                    to   { opacity: 1; transform: scaleY(1)    translateY(0);    }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.84) translateY(10px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0);    }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }

                .schedule-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }

                .schedule-scroll::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }

                .schedule-scroll::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 9999px;
                }

                .schedule-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 9999px;
                    border: 2px solid #f1f5f9;
                }

                .schedule-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                @media (prefers-color-scheme: dark) {
                    .schedule-scroll {
                        scrollbar-color: #334155 #0f172a;
                    }

                    .schedule-scroll::-webkit-scrollbar-track {
                        background: #0f172a;
                    }

                    .schedule-scroll::-webkit-scrollbar-thumb {
                        background: #334155;
                        border-color: #0f172a;
                    }

                    .schedule-scroll::-webkit-scrollbar-thumb:hover {
                        background: #475569;
                    }
                }
            `}</style>
        </>
    );
}
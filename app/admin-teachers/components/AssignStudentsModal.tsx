"use client";

import { useState, useEffect } from "react";
import { Student, Teacher, studentsApi } from "@/lib/api";
import { X, Search, CheckCircle, GraduationCap } from "lucide-react";

interface AssignStudentsModalProps {
    teacher: Teacher;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const PAGE_SIZE = 10;

export default function AssignStudentsModal({ teacher, onClose, onSaveSuccess }: AssignStudentsModalProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
    const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 250);

        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        loadInitialAssignments();
    }, [teacher.id]);

    useEffect(() => {
        loadStudentsPage();
    }, [teacher.id, currentPage, debouncedSearch]);

    const loadInitialAssignments = async () => {
        try {
            const assigned = await studentsApi.getAll({ teacherId: teacher.id });
            const assignedIds = new Set(assigned.map((s) => s.id));
            setOriginalAssignedIds(assignedIds);
            setAssignedStudentIds(assignedIds);
        } catch (error) {
            console.error("Error cargando asignaciones actuales:", error);
        }
    };

    const loadStudentsPage = async () => {
        setIsLoading(true);
        try {
            const pageData = await studentsApi.getPage({
                page: currentPage,
                limit: PAGE_SIZE,
                search: debouncedSearch || undefined,
                assignableForTeacherId: teacher.id,
            });

            setStudents(pageData.items);
            setTotalStudents(pageData.total);
            setTotalPages(pageData.totalPages);

            if (currentPage > pageData.totalPages) {
                setCurrentPage(pageData.totalPages);
            }
        } catch (error) {
            console.error("Error cargando estudiantes:", error);
            setStudents([]);
            setTotalStudents(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStudent = (studentId: string) => {
        setAssignedStudentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Obtener estudiantes que cambiaron
            const previouslyAssigned = originalAssignedIds;
            
            const toAssign = Array.from(assignedStudentIds).filter(id => !previouslyAssigned.has(id));
            const toUnassign = Array.from(previouslyAssigned).filter(id => !assignedStudentIds.has(id));

            const savePromises = [];

            // Asignar nuevos
            for (const id of toAssign) {
                savePromises.push(studentsApi.assignTeacher(id, teacher.id));
            }
            // Desasignar antiguos
            for (const id of toUnassign) {
                savePromises.push(studentsApi.assignTeacher(id, null));
            }

            await Promise.all(savePromises);
            onSaveSuccess();
        } catch (error) {
            console.error("Error al guardar asignaciones:", error);
            alert("Hubo un error al guardar los estudiantes.");
        } finally {
            setIsSaving(false);
        }
    };

    const currentPageSafe = Math.min(currentPage, totalPages);
    const showingFrom = totalStudents === 0 ? 0 : (currentPageSafe - 1) * PAGE_SIZE + 1;
    const showingTo = Math.min(currentPageSafe * PAGE_SIZE, totalStudents);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="modal-content rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl" 
                 style={{ background: "var(--modal-bg)", border: "1px solid var(--border-color)", animation: "scaleIn .18s ease" }}>
                
                {/* Header */}
                <div className="px-6 py-5 flex items-start justify-between border-b" style={{ borderColor: "var(--border-color)" }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                            <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Asignar Alumnos</h3>
                            <p className="text-sm mt-0.5 font-medium text-blue-500 dark:text-blue-400">
                                Maestro: {teacher.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-500/10 rounded-xl transition-colors shrink-0"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-auto p-6 students-scroll">
                    {/* Search */}
                    <div className="relative mb-6">
                        <input
                            type="text"
                            placeholder="Buscar alumno por nombre, matrícula o nivel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/50"
                            style={{ 
                                background: "var(--input-bg)", 
                                border: "1px solid var(--input-border)", 
                                color: "var(--text-primary)" 
                            }}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                            Alumnos seleccionados: <span className="text-blue-500">{assignedStudentIds.size}</span>
                        </span>
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            Mostrando {showingFrom}-{showingTo} de {totalStudents}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
                            No se encontraron alumnos con esa búsqueda.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {students.map(student => {
                                const isSelected = assignedStudentIds.has(student.id);
                                return (
                                    <div 
                                        key={student.id}
                                        onClick={() => toggleStudent(student.id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'bg-blue-500/10 border-blue-500/50 dark:bg-blue-500/20' 
                                                : 'hover:bg-gray-500/5 transparent'
                                        }`}
                                        style={{ 
                                            borderColor: isSelected ? undefined : "var(--border-color)",
                                            background: isSelected ? undefined : "var(--surface-alt)"
                                        }}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                                {student.name}
                                            </p>
                                            <p className="text-xs mt-0.5 w-max px-2 py-0.5 rounded-md" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                                                #{student.studentNumber} • {student.level}
                                            </p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                                        }`}>
                                            {isSelected && <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isLoading && totalPages > 1 && (
                        <div className="mt-5 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPageSafe === 1}
                                className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "var(--surface-alt)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                            >
                                Anterior
                            </button>

                            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                                Página {currentPageSafe} de {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPageSafe === totalPages}
                                className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: "var(--surface-alt)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t flex justify-end gap-3 bg-opacity-50" style={{ borderColor: "var(--border-color)", background: "var(--surface-alt)" }}>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors hover:brightness-95"
                        style={{ background: "var(--surface)", color: "var(--text-primary)" }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 text-sm text-white font-semibold rounded-xl transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg, #014287, #1e5fc2)" }}
                    >
                        {isSaving ? "Guardando..." : "Guardar Asignaciones"}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(.96) translateY(6px); }
                    to   { opacity: 1; transform: scale(1)   translateY(0); }
                }

                .students-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }

                .students-scroll::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }

                .students-scroll::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 9999px;
                }

                .students-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 9999px;
                    border: 2px solid #f1f5f9;
                }

                .students-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                @media (prefers-color-scheme: dark) {
                    .students-scroll {
                        scrollbar-color: #334155 #0f172a;
                    }

                    .students-scroll::-webkit-scrollbar-track {
                        background: #0f172a;
                    }

                    .students-scroll::-webkit-scrollbar-thumb {
                        background: #334155;
                        border-color: #0f172a;
                    }

                    .students-scroll::-webkit-scrollbar-thumb:hover {
                        background: #475569;
                    }
                }
            `}</style>
        </div>
    );
}

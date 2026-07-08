"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
    Send, Bot, User, Loader2, Sparkles,
    Copy, Check, Trash2, ChevronDown,
    MessageSquare, Plus, X, Menu, PlayCircle
} from "lucide-react";
import { aiApi } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Loader from "@/components/ui/Loader";

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    messages: Message[];
}

const QUICK_ACTIONS = [
    { label: "Role-Play", prompt: "Plantea una actividad de Role-Play sobre esto para practicar en parejas." },
    { label: "Dinámica grupal", prompt: "Dame una sugerencia de dinámica grupal interactiva para reforzar estos conceptos." },
    { label: "Práctica oral", prompt: "Crea 3 ejercicios o preguntas de práctica oral para que mis alumnos puedan conversar." },
    { label: "Más profundidad", prompt: "Dame ejemplos adicionales y tips metodológicos para enseñar mejor este tema." }
];

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface TeacherChatProps {
    isDark: boolean;
}

const MessageBubble = memo(({ msg, isLast, d, isCopied, onCopy, isStreaming, onQuickAction }: {
    msg: Message;
    isLast: boolean;
    d: boolean;
    isCopied: boolean;
    onCopy: (id: string, content: string) => void;
    isStreaming: boolean;
    onQuickAction: (act: string) => void;
}) => {
    const isAi = msg.role === "assistant";

    return (
        <div
            className={`flex gap-3 max-w-3xl group
                ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}
                ${isLast ? "animate-[fadeInUp_0.25s_ease_both]" : ""}`}
        >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end mb-6
                ${isAi
                    ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-md shadow-cyan-500/20"
                    : d ? "bg-slate-700" : "bg-slate-200"}`}
            >
                {isAi
                    ? <Bot className="w-4 h-4 text-white" />
                    : <User className={`w-4 h-4 ${d ? "text-slate-300" : "text-slate-500"}`} />
                }
            </div>

            <div className={`flex flex-col gap-1.5 ${isAi ? "items-start" : "items-end"}`}>
                {/* Bubble */}
                <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed
                    max-w-[420px] lg:max-w-[520px]
                    ${isAi
                        ? d
                            ? "bg-[#0e1830] text-slate-200 border border-white/[0.07] rounded-tl-sm"
                            : "bg-white text-slate-700 border border-slate-200/80 shadow-sm rounded-tl-sm"
                        : "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 rounded-tr-sm"}`}
                >
                    {isAi ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert
                            prose-p:my-1 prose-ul:my-1.5 prose-li:my-0.5
                            prose-headings:my-2 prose-strong:font-semibold
                            prose-code:text-xs prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                            prose-pre:text-xs prose-pre:rounded-lg">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}

                    {/* Copy button on hover */}
                    {msg.content && (
                        <button
                            onClick={() => onCopy(msg.id, msg.content)}
                            title="Copiar"
                            className={`absolute -top-2.5 ${isAi ? "right-2" : "left-2"}
                                opacity-0 group-hover:opacity-100 transition-opacity
                                p-1 rounded-md
                                ${d
                                    ? "bg-[#1a2540] border border-white/10 text-slate-400 hover:text-white"
                                    : "bg-white border border-slate-200 text-slate-400 hover:text-slate-700 shadow-sm"}`}
                        >
                            {isCopied
                                ? <Check className="w-3 h-3 text-emerald-500" />
                                : <Copy className="w-3 h-3" />
                            }
                        </button>
                    )}
                </div>

                {/* Timestamp — on hover only */}
                <span className={`text-[10px] px-1 opacity-0 group-hover:opacity-100 transition-opacity
                    ${d ? "text-slate-600" : "text-slate-400"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                {/* Quick Actions sugiriendo actividades post-respuesta */}
                {isAi && isLast && !isStreaming && (
                    <div className="flex flex-wrap gap-2 mt-2 max-w-[420px] lg:max-w-[520px] animate-[fadeInUp_0.5s_ease_both]">
                        {QUICK_ACTIONS.map(action => (
                            <button
                                key={action.label}
                                onClick={() => onQuickAction(action.prompt)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-sm
                                    ${d
                                        ? "bg-[#1a2540] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                        : "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"}`}
                            >
                                <PlayCircle className="w-3 h-3" />
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
MessageBubble.displayName = "MessageBubble";

export default function TeacherChat({ isDark }: TeacherChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>("default");
    const [showSidebar, setShowSidebar] = useState(false);

    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isBusy = isLoading || isStreaming;
    const d = isDark;

    /* ── Helpers ─────────────────────────────────────────── */
    const getTeacherId = (): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("userId") || localStorage.getItem("teacherId") || null;
    };

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, []);

    const handleNewChat = () => {
        const newId = Date.now().toString();
        setCurrentSessionId(newId);
        setMessages([]);
        setShowSidebar(false);
    };

    const loadSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setCurrentSessionId(id);
            setMessages(session.messages);
            setShowSidebar(false);
        }
    };

    const handleDeleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions(prev => {
            const updated = prev.filter(s => s.id !== id);
            if (id === currentSessionId) {
                if (updated.length > 0) {
                    setCurrentSessionId(updated[0].id);
                    setMessages(updated[0].messages);
                } else {
                    handleNewChat();
                }
            }
            return updated;
        });
    };

    /* ── Auto-resize textarea ────────────────────────────── */
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }, [inputValue]);

    /* ── Scroll button visibility ────────────────────────── */
    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };

    /* ── Load Sessions / History ─────────────────────────── */
    useEffect(() => {
        const teacherId = getTeacherId();
        if (!teacherId || historyLoaded) return;

        const saved = localStorage.getItem(`chat_sessions_${teacherId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                parsed.forEach((s: any) => {
                    s.messages.forEach((m: any) => m.timestamp = new Date(m.timestamp));
                });
                setSessions(parsed);
                if (parsed.length > 0) {
                    setCurrentSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                } else {
                    setCurrentSessionId(Date.now().toString());
                }
                setHistoryLoaded(true);
            } catch (e) {
                console.error("Error parsing sessions", e);
                setHistoryLoaded(true);
            }
        } else {
            // First time migrating to local sessions: try fetching DB history once
            aiApi.getHistory(teacherId, 50)
                .then(({ messages: history }) => {
                    const id = Date.now().toString();
                    if (history.length > 0) {
                        const historyContext = history.map((m, i) => ({
                            id: `hist-${i}`,
                            role: m.role,
                            content: m.content,
                            timestamp: new Date(m.created_at),
                        }));
                        setMessages(historyContext);
                        setCurrentSessionId(id);
                    } else {
                        setCurrentSessionId(id);
                    }
                })
                .catch(err => console.warn("No se pudo cargar historial:", err))
                .finally(() => setHistoryLoaded(true));
        }
    }, [historyLoaded]);

    /* ── Save Sessions ───────────────────────────────────── */
    useEffect(() => {
        if (!historyLoaded) return;
        const teacherId = getTeacherId();
        if (!teacherId || !currentSessionId) return;

        setSessions(prev => {
            const existingIdx = prev.findIndex(s => s.id === currentSessionId);
            const userMsg = messages.find(m => m.role === 'user');
            const title = userMsg ? userMsg.content.substring(0, 30) + (userMsg.content.length > 30 ? '...' : '') : 'Nuevo Chat';

            const updatedSession: ChatSession = {
                id: currentSessionId,
                title,
                messages: messages,
                updatedAt: Date.now()
            };

            let newSessions = [...prev];
            if (existingIdx >= 0) {
                newSessions[existingIdx] = updatedSession;
            } else if (messages.length > 0) {
                newSessions = [updatedSession, ...prev];
            }

            newSessions = newSessions.filter(s => s.id === currentSessionId || s.messages.length > 0);
            newSessions.sort((a, b) => b.updatedAt - a.updatedAt);

            localStorage.setItem(`chat_sessions_${teacherId}`, JSON.stringify(newSessions));
            return newSessions;
        });
    }, [messages, currentSessionId, historyLoaded]);

    /* ── Auto-scroll when new message appears ────────────── */
    useEffect(() => {
        if (!showScrollBtn) scrollToBottom();
    }, [messages.length, isLoading, showScrollBtn, scrollToBottom]);

    /* ── Copy message ────────────────────────────────────── */
    const handleCopy = useCallback((id: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    /* ── Send ────────────────────────────────────────────── */
    const handleSendMessage = async (overrideText?: string) => {
        const text = (overrideText ?? inputValue).trim();
        if (!text || isBusy) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };
        const aiMsgId = (Date.now() + 1).toString();

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);
        setIsStreaming(true);

        try {
            const historyContext = [...messages, userMsg].map(m => ({
                role: m.role,
                content: m.content,
            }));
            const teacherId = getTeacherId();
            let fullResponse = "";

            await aiApi.sendMessageStream(
                text,
                historyContext,
                teacherId || undefined,
                (chunk: string) => {
                    fullResponse += chunk;
                }
            );

            // Mostrar todo el texto de una vez al terminar
            setIsLoading(false);
            setMessages(prev => [
                ...prev,
                { id: aiMsgId, role: "assistant", content: fullResponse, timestamp: new Date() },
            ]);
        } catch {
            setIsLoading(false);
            const errMsg: Message = {
                id: aiMsgId,
                role: "assistant",
                content: "Lo siento, hubo un problema al conectar con el servidor. Por favor intenta de nuevo.",
                timestamp: new Date(),
            };
            setMessages(prev =>
                prev.some(m => m.id === aiMsgId)
                    ? prev.map(m => (m.id === aiMsgId ? errMsg : m))
                    : [...prev, errMsg]
            );
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            setTimeout(() => scrollToBottom(), 80);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    /* ── Render ──────────────────────────────────────────── */
    return (
        <div className={`relative flex flex-col h-full overflow-hidden transition-colors
            ${d ? "bg-[#080f1f]" : "bg-gradient-to-br from-[#f3f8fd] via-[#ebf3fc] to-[#dfeffa]"}`}>

            {/* Background Magic Effects */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[80px] animate-pulse-slow ${d ? "bg-cyan-900/10" : "bg-blue-300/30"}`} />
                <div className={`absolute top-[40%] -right-[15%] w-[50%] h-[50%] rounded-full blur-[100px] animate-pulse-slow delay-500 ${d ? "bg-blue-900/10" : "bg-cyan-200/40"}`} />
                <div className={`absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[120px] animate-pulse-slow delay-1000 ${d ? "bg-purple-900/10" : "bg-[#c1ddf7]/50"}`} />
            </div>

            {/* Sidebar Overlay/Drawer */}
            <div className={`absolute inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 flex flex-col shadow-2xl
                ${showSidebar ? "translate-x-0" : "-translate-x-full"} 
                ${d ? "bg-[#0b1428] border-r border-white/10" : "bg-gray-50 border-r border-slate-200"}`}>

                <div className={`p-4 border-b flex items-center justify-between ${d ? "border-white/10" : "border-slate-200"}`}>
                    <h3 className={`font-semibold ${d ? "text-white" : "text-slate-800"}`}>Tus Conversaciones</h3>
                    <button onClick={() => setShowSidebar(false)} className={`p-1.5 rounded-lg transition-colors ${d ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-200"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:scale-105 transition-transform shadow-md shadow-blue-500/20">
                        <Plus className="w-4 h-4" />
                        Nuevo Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1" style={{ scrollbarWidth: "thin" }}>
                    {sessions.length === 0 && (
                        <p className={`text-center text-xs mt-4 ${d ? "text-slate-500" : "text-slate-400"}`}>No tienes chats guardados</p>
                    )}
                    {sessions.filter(s => s.messages.length > 0).map(s => (
                        <div key={s.id} className={`group flex items-center justify-between w-full text-left p-2.5 rounded-lg text-sm transition-colors
                            ${s.id === currentSessionId
                                ? (d ? 'bg-cyan-500/15 text-cyan-400' : 'bg-blue-50 text-blue-600')
                                : (d ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200/50')}`}>
                            <button onClick={() => loadSession(s.id)} className="flex-1 truncate mr-2 flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                <span className="truncate">{s.title}</span>
                            </button>
                            <button onClick={(e) => handleDeleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-500 transition-opacity" title="Eliminar Chat">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Backdrop Sidebar */}
            {showSidebar && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowSidebar(false)} />
            )}

            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 z-10
                ${d ? "border-white/[0.06] bg-[#0a1225]" : "border-blue-100/50 bg-white/40 backdrop-blur-md"}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(true)}
                        title="Ver Chats"
                        className={`p-2 mr-1 rounded-xl transition-colors ${d ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2
                            ${d ? "border-[#0a1225]" : "border-white"}`} />
                    </div>
                    <div>
                        <h2 className={`text-sm font-semibold tracking-tight cursor-pointer ${d ? "text-white hover:text-cyan-400" : "text-slate-800 hover:text-blue-500"}`} onClick={() => setShowSidebar(true)}>
                            Asistente IA
                        </h2>
                        <p className={`text-xs ${d ? "text-slate-400" : "text-slate-500"}`}>
                            {isStreaming ? (
                                <span className={`flex items-center gap-1 ${d ? "text-cyan-400" : "text-blue-500"}`}>
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    Escribiendo…
                                </span>
                            ) : "Siempre disponible"}
                        </p>
                    </div>
                </div>

                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
                        title="Limpiar conversación"
                        className={`p-2 rounded-lg transition-all
                            ${d
                                ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto px-4 py-6 space-y-5 relative z-10
                    ${d ? "bg-transparent" : "bg-transparent"}`}
                style={{ scrollbarWidth: "thin", scrollbarColor: d ? "#1e2a45 transparent" : "#d1d5db transparent" }}
            >
                {/* Welcome / empty state */}
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-7 px-4 select-none">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 mb-4">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className={`text-lg font-semibold ${d ? "text-white" : "text-slate-800"}`}>
                                ¿En qué puedo ayudarte?
                            </h3>
                            <p className={`text-sm mt-1 max-w-xs mx-auto ${d ? "text-slate-400" : "text-slate-500"}`}>
                                Soy tu asistente docente. Escribe lo que necesites para comenzar...
                            </p>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, idx) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isLast={idx === messages.length - 1}
                        d={d}
                        isCopied={copiedId === msg.id}
                        onCopy={handleCopy}
                        isStreaming={isStreaming}
                        onQuickAction={(prompt) => handleSendMessage(prompt)}
                    />
                ))}

                {/* Custom animated loader from user */}
                {isLoading && (
                    <div className="flex max-w-3xl mr-auto animate-[fadeInUp_0.3s_ease_both]">
                        <div className="flex items-center justify-center transform scale-[0.5] origin-bottom-left -ml-4 -mb-4 drop-shadow-lg">
                            <Loader />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <div className="relative h-0 overflow-visible flex justify-center">
                    <button
                        onClick={() => scrollToBottom()}
                        className={`absolute -top-12 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg
                            ${d
                                ? "bg-[#1a2a4a] border border-white/10 text-slate-300 hover:bg-[#1f3060]"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-md"}`}
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Bajar
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className={`px-4 py-4 shrink-0 relative flex flex-col items-center z-10 ${d ? "" : ""}`}>

                <div className="magic-input-wrapper max-w-4xl w-full">
                    <div className="magic-input-container">

                        {/* Textarea (auto-resize) */}
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pregúntale a la IA sobre un tema, clase o estudiante..."
                            disabled={isBusy}
                            className="magic-input font-medium"
                            style={{ minHeight: "36px", maxHeight: "150px" }}
                        />

                        {/* Send Button */}
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isBusy}
                            className="search__icon group focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-transform active:scale-95"
                        >
                            {isStreaming
                                ? <Loader2 className="w-6 h-6 text-white animate-spin mx-auto my-auto" />
                                : (
                                    <svg viewBox="0 0 24 24" className="w-[28px] h-[28px]">
                                        <g>
                                            <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z"></path>
                                        </g>
                                    </svg>
                                )
                            }
                        </button>
                    </div>
                </div>

                <p className={`text-[10px] text-center mt-3 ${d ? "text-slate-500" : "text-slate-400"}`}>
                    Presiona <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${d ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Enter</kbd> para enviar · <kbd className={`px-1 py-0.5 rounded text-[9px] font-mono ${d ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Shift+Enter</kbd> para nueva línea
                </p>
            </div>

            {/* Animations and Dynamic CSS */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0);   }
                }
                
                .magic-input-wrapper {
                    position: relative;
                    background: linear-gradient(135deg, rgb(179, 208, 253) 0%, rgb(164, 202, 248) 100%);
                    border-radius: 1000px;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    z-index: 0;
                }
                .magic-input-container {
                    position: relative;
                    width: 100%;
                    flex: 1;
                    border-radius: 50px;
                    background: linear-gradient(135deg, rgb(218, 232, 247) 0%, rgb(214, 229, 247) 100%);
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .magic-input-container::after, .magic-input-container::before {
                    content: "";
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                    position: absolute;
                    pointer-events: none;
                }
                .magic-input-container::before {
                    top: -1px; left: -1px;
                    background: linear-gradient(0deg, rgb(218, 232, 247) 0%, rgb(255, 255, 255) 100%);
                    z-index: -1;
                }
                .magic-input-container::after {
                    bottom: -1px; right: -1px;
                    background: linear-gradient(0deg, rgb(163, 206, 255) 0%, rgb(211, 232, 255) 100%);
                    box-shadow: rgba(79, 156, 232, 0.7) 3px 3px 5px 0px, rgba(79, 156, 232, 0.7) 5px 5px 20px 0px;
                    z-index: -2;
                }
                .magic-input::-webkit-scrollbar {
                    display: none;
                }
                .magic-input {
                    flex: 1;
                    padding: 8px 12px;
                    background: linear-gradient(135deg, rgb(218, 232, 247) 0%, rgb(214, 229, 247) 100%);
                    border: none;
                    color: #2b5c87;
                    font-size: 15px;
                    font-weight: 500;
                    border-radius: 50px;
                    resize: none;
                    outline: none;
                    transition: all 0.2s;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .magic-input:focus {
                    background: linear-gradient(135deg, rgb(239, 247, 255) 0%, rgb(214, 229, 247) 100%);
                }
                .magic-input::placeholder {
                    color: #6392b8;
                    font-weight: 500;
                }
                .search__icon {
                    width: 44px;
                    height: 44px;
                    border-left: 2px solid white;
                    border-top: 3px solid transparent;
                    border-bottom: 3px solid transparent;
                    border-radius: 50%;
                    padding-left: 6px;
                    margin-right: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .search__icon:hover:not(:disabled) {
                    border-left: 3px solid white;
                    background: rgba(255,255,255,0.1);
                }
                .search__icon path {
                    fill: white;
                }
            `}</style>
        </div>
    );
}
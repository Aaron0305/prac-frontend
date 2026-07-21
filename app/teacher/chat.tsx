"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
    Send, Bot, User, Loader2, Sparkles,
    Copy, Check, Trash2, ChevronDown,
    MessageSquare, Plus, X, Menu, PlayCircle, Book
} from "lucide-react";
import { aiApi } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Loader from "@/components/ui/Loader";
import dynamic from "next/dynamic";

const NeuralNetworkScene = dynamic(
  () => import("@/components/NeuralNetworkScene"),
  { ssr: false }
);

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    messages: Message[];
}

const QUICK_ACTIONS = [
    { label: "Búsqueda A*", prompt: "Explícame cómo funciona el algoritmo de Búsqueda A* según Russell & Norvig." },
    { label: "Lógica de 1er Orden", prompt: "Dame un ejemplo de Lógica de Primer Orden aplicado a un entorno." },
    { label: "Agentes Reactivos", prompt: "Diferencia entre un agente reactivo simple y uno basado en modelo." },
    { label: "Ejercicio en clase", prompt: "Plantea un ejercicio práctico de Inteligencia Artificial para mis alumnos." }
];

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface TeacherChatProps {
    isDark?: boolean;
}

const MessageBubble = memo(({ msg, isLast, isCopied, onCopy, isStreaming, onQuickAction }: {
    msg: Message;
    isLast: boolean;
    isCopied: boolean;
    onCopy: (id: string, content: string) => void;
    isStreaming: boolean;
    onQuickAction: (act: string) => void;
}) => {
    const isAi = msg.role === "assistant";

    return (
        <div className={`flex gap-4 max-w-4xl mx-auto w-full group ${isAi ? "" : "flex-row-reverse"} ${isLast ? "animate-[fadeInUp_0.25s_ease_both]" : ""}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg
                ${isAi ? "bg-gradient-to-br from-[#D97757] to-[#8F331A] shadow-[#D97757]/20 border border-[#D97757]/30" : "bg-[#1E1410] border border-[#3D2A22]"}`}
            >
                {isAi ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-[#E8C4A8]" />}
            </div>

            <div className={`flex flex-col gap-2 ${isAi ? "items-start w-[calc(100%-3rem)]" : "items-end"}`}>
                <div className={`relative px-5 py-4 rounded-2xl text-sm leading-relaxed max-w-[85%]
                    ${isAi
                        ? "bg-[#120E0C]/90 backdrop-blur-md text-[#F5EDE6] border border-[#1E1410] rounded-tl-sm shadow-xl"
                        : "bg-gradient-to-br from-[#1E1410] to-[#120E0C] text-[#E8C4A8] border border-[#3D2A22] rounded-tr-sm shadow-md"}`}
                >
                    {isAi ? (
                        <div className="prose prose-sm max-w-none prose-invert
                            prose-p:my-2 prose-p:text-[#F5EDE6] prose-ul:my-2 prose-li:my-1
                            prose-headings:text-[#D97757] prose-headings:font-bold prose-headings:my-3
                            prose-strong:text-[#E8C4A8] prose-strong:font-bold
                            prose-code:text-[#D97757] prose-code:bg-[#1E1410] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                            prose-pre:bg-[#0D0A09] prose-pre:border prose-pre:border-[#1E1410] prose-pre:text-[#F5EDE6] prose-pre:rounded-xl">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}

                    {msg.content && (
                        <button
                            onClick={() => onCopy(msg.id, msg.content)}
                            title="Copiar texto"
                            className={`absolute -top-3 ${isAi ? "right-3" : "left-3"} opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-[#1A1210] border border-[#1E1410] text-[#7D6860] hover:text-[#D97757] shadow-lg`}
                        >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                <span className="text-[10px] px-1 opacity-0 group-hover:opacity-100 transition-opacity text-[#7D6860] font-medium tracking-wide">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                {isAi && isLast && !isStreaming && (
                    <div className="flex flex-wrap gap-2 mt-2 animate-[fadeInUp_0.5s_ease_both]">
                        {QUICK_ACTIONS.map(action => (
                            <button
                                key={action.label}
                                onClick={() => onQuickAction(action.prompt)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1E1410] bg-[#120E0C] text-[#E8C4A8] hover:bg-[#D97757]/10 hover:border-[#D97757]/30 transition-all shadow-sm"
                            >
                                <PlayCircle className="w-3 h-3 text-[#D97757]" />
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
    const [isFocused, setIsFocused] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isBusy = isLoading || isStreaming;

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

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }, [inputValue]);

    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };

    useEffect(() => {
        const teacherId = getTeacherId();
        if (!teacherId || historyLoaded) return;

        const saved = localStorage.getItem(`chat_sessions_${teacherId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                parsed.forEach((s: any) => s.messages.forEach((m: any) => m.timestamp = new Date(m.timestamp)));
                setSessions(parsed);
                if (parsed.length > 0) {
                    setCurrentSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                } else {
                    setCurrentSessionId(Date.now().toString());
                }
                setHistoryLoaded(true);
            } catch (e) {
                setHistoryLoaded(true);
            }
        } else {
            aiApi.getHistory(teacherId, 50)
                .then(({ messages: history }) => {
                    const id = Date.now().toString();
                    if (history.length > 0) {
                        setMessages(history.map((m, i) => ({
                            id: `hist-${i}`,
                            role: m.role,
                            content: m.content,
                            timestamp: new Date(m.created_at),
                        })));
                    }
                    setCurrentSessionId(id);
                })
                .catch(() => {})
                .finally(() => setHistoryLoaded(true));
        }
    }, [historyLoaded]);

    useEffect(() => {
        if (!historyLoaded) return;
        const teacherId = getTeacherId();
        if (!teacherId || !currentSessionId) return;

        setSessions(prev => {
            const existingIdx = prev.findIndex(s => s.id === currentSessionId);
            const userMsg = messages.find(m => m.role === 'user');
            const title = userMsg ? userMsg.content.substring(0, 30) + (userMsg.content.length > 30 ? '...' : '') : 'Nueva Consulta';

            const updatedSession: ChatSession = { id: currentSessionId, title, messages, updatedAt: Date.now() };
            let newSessions = [...prev];
            
            if (existingIdx >= 0) newSessions[existingIdx] = updatedSession;
            else if (messages.length > 0) newSessions = [updatedSession, ...prev];

            newSessions = newSessions.filter(s => s.id === currentSessionId || s.messages.length > 0);
            newSessions.sort((a, b) => b.updatedAt - a.updatedAt);

            localStorage.setItem(`chat_sessions_${teacherId}`, JSON.stringify(newSessions));
            return newSessions;
        });
    }, [messages, currentSessionId, historyLoaded]);

    useEffect(() => {
        if (!showScrollBtn) scrollToBottom();
    }, [messages.length, isLoading, showScrollBtn, scrollToBottom]);

    const handleCopy = useCallback((id: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, []);

    const handleSendMessage = async (overrideText?: string) => {
        const text = (overrideText ?? inputValue).trim();
        if (!text || isBusy) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
        const aiMsgId = (Date.now() + 1).toString();

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);
        setIsStreaming(true);

        try {
            const historyContext = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
            const teacherId = getTeacherId();
            let fullResponse = "";

            await aiApi.sendMessageStream(text, historyContext, teacherId || undefined, (chunk) => {
                fullResponse += chunk;
            });

            setIsLoading(false);
            setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: fullResponse, timestamp: new Date() }]);
        } catch {
            setIsLoading(false);
            const errMsg: Message = { id: aiMsgId, role: "assistant", content: "Error de conexión. Intenta de nuevo.", timestamp: new Date() };
            setMessages(prev => prev.some(m => m.id === aiMsgId) ? prev.map(m => (m.id === aiMsgId ? errMsg : m)) : [...prev, errMsg]);
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

    return (
        <div className="relative flex flex-col h-full min-h-0 overflow-hidden bg-[#0D0A09] text-[#F5EDE6]">

            {/* Inmersive Background — fixed size, never grows */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ width: '100%', height: '100%' }}>
                    <NeuralNetworkScene />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A09] via-transparent to-[#0D0A09]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0D0A09] via-transparent to-[#0D0A09]" />
            </div>

            {/* Sidebar Overlay */}
            <div className={`absolute inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 flex flex-col shadow-2xl bg-[#120E0C]/95 backdrop-blur-xl border-r border-[#1E1410]
                ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="p-5 border-b border-[#1E1410] flex items-center justify-between">
                    <h3 className="font-bold text-[#F5EDE6] flex items-center gap-2">
                        <Book className="w-4 h-4 text-[#D97757]" />
                        Historial IA
                    </h3>
                    <button onClick={() => setShowSidebar(false)} className="p-1.5 rounded-lg text-[#7D6860] hover:text-[#D97757] hover:bg-[#1A1210] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#D97757] to-[#8F331A] text-white font-bold hover:shadow-lg hover:shadow-[#D97757]/20 transition-all hover:-translate-y-0.5">
                        <Plus className="w-4 h-4" />
                        Nueva Consulta
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#1E1410 transparent" }}>
                    {sessions.length === 0 && <p className="text-center text-xs mt-4 text-[#7D6860]">No hay consultas recientes</p>}
                    {sessions.filter(s => s.messages.length > 0).map(s => (
                        <div key={s.id} className={`group flex items-center justify-between w-full text-left p-3 rounded-xl text-sm transition-colors border
                            ${s.id === currentSessionId
                                ? 'bg-[#D97757]/10 text-[#D97757] border-[#D97757]/30'
                                : 'text-[#7D6860] border-transparent hover:bg-[#1A1210] hover:border-[#1E1410]'}`}>
                            <button onClick={() => loadSession(s.id)} className="flex-1 truncate mr-2 flex items-center gap-2 font-medium">
                                <MessageSquare className="w-4 h-4 opacity-70 shrink-0" />
                                <span className="truncate">{s.title}</span>
                            </button>
                            <button onClick={(e) => handleDeleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#D97757]/10 text-[#D97757] transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {showSidebar && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowSidebar(false)} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1410] bg-[#0D0A09]/80 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="p-2 rounded-xl text-[#7D6860] hover:bg-[#1A1210] hover:text-[#D97757] transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowSidebar(true)}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A1210] to-[#120E0C] border border-[#1E1410] flex items-center justify-center shadow-lg group-hover:border-[#D97757]/50 transition-colors">
                            <Sparkles className="w-5 h-5 text-[#D97757]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-tight text-[#F5EDE6] group-hover:text-[#D97757] transition-colors">
                                RedAi Consultas
                            </h2>
                            <p className="text-[11px] text-[#7D6860] font-medium">
                                {isStreaming ? <span className="text-[#D97757] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse"/> Generando...</span> : "Basado en Russell & Norvig"}
                            </p>
                        </div>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button onClick={() => setMessages([])} className="p-2 rounded-xl text-[#7D6860] hover:text-[#D97757] hover:bg-[#1A1210] transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-8 space-y-6 relative z-10"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#1E1410 transparent" }}
            >
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 px-4 select-none">
                        <div className="w-20 h-20 rounded-3xl bg-[#1A1210] border border-[#1E1410] flex items-center justify-center mx-auto shadow-2xl shadow-[#D97757]/10 mb-2 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[#D97757]/5 group-hover:bg-[#D97757]/10 transition-colors" />
                            <Book className="w-10 h-10 text-[#D97757]" />
                        </div>
                        <h3 className="text-2xl font-black text-[#F5EDE6] tracking-tight">
                            Consulta la Bibliografía
                        </h3>
                        <p className="text-sm text-[#7D6860] text-center max-w-sm leading-relaxed">
                            Escribe una pregunta sobre la teoría, pide ejemplos de algoritmos, o genera material didáctico al instante.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <MessageBubble key={msg.id} msg={msg} isLast={idx === messages.length - 1} isCopied={copiedId === msg.id} onCopy={handleCopy} isStreaming={isStreaming} onQuickAction={handleSendMessage} />
                ))}

                {isLoading && (
                    <div className="flex max-w-4xl mx-auto w-full animate-[fadeInUp_0.3s_ease_both]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1A1210] border border-[#1E1410] flex items-center justify-center shadow-lg">
                                <Loader2 className="w-5 h-5 text-[#D97757] animate-spin" />
                            </div>
                            <span className="text-xs text-[#7D6860] font-medium tracking-widest uppercase">Consultando base de conocimiento...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {showScrollBtn && (
                <div className="relative h-0 overflow-visible flex justify-center z-20">
                    <button onClick={() => scrollToBottom()} className="absolute -top-16 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-xl bg-[#1A1210] border border-[#1E1410] text-[#E8C4A8] hover:text-[#D97757] hover:border-[#D97757]/50 transition-all">
                        <ChevronDown className="w-4 h-4" /> Ver más
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-6 shrink-0 relative flex flex-col items-center z-20 bg-gradient-to-t from-[#0D0A09] via-[#0D0A09] to-transparent pt-12">
                <div className={`max-w-4xl w-full relative rounded-3xl p-1.5 transition-all duration-300
                    ${isFocused ? 'bg-gradient-to-r from-[#D97757] to-[#C06040] shadow-[0_0_30px_rgba(217,119,87,0.15)]' : 'bg-[#1E1410]'}`}
                >
                    <div className="relative flex items-center gap-2 bg-[#120E0C] rounded-[1.35rem] pr-2 pl-4 py-1 border border-transparent w-full">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Pregunta sobre la teoría o genera material de clase..."
                            disabled={isBusy}
                            className="flex-1 bg-transparent py-4 text-[#F5EDE6] font-medium text-base resize-none outline-none placeholder:text-[#7D6860]"
                            style={{ minHeight: "56px", maxHeight: "200px" }}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isBusy}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl shrink-0 transition-all duration-300
                                ${inputValue.trim() && !isBusy 
                                    ? 'bg-[#D97757] text-white hover:bg-[#C06040] shadow-lg shadow-[#D97757]/20 hover:-translate-y-0.5' 
                                    : 'bg-[#1A1210] text-[#3D2A22] cursor-not-allowed'}`}
                        >
                            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                        </button>
                    </div>
                </div>
                <p className="text-[11px] text-[#7D6860] text-center mt-4 font-medium tracking-wide">
                    Basado en "Inteligencia Artificial: Un Enfoque Moderno". <kbd className="px-1.5 py-0.5 rounded-md bg-[#1A1210] border border-[#1E1410] font-mono">Enter</kbd> para enviar
                </p>
            </div>
            
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0);   }
                }
            `}</style>
        </div>
    );
}
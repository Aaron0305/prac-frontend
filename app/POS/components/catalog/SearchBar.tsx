"use client";
// ============================================
// COMPONENT: SearchBar (Premium)
// ============================================
import { Search, X } from "lucide-react";

interface Props {
    value: string;
    onChange: (v: string) => void;
    onSubmit?: (v: string) => void;
}

export default function SearchBar({ value, onChange, onSubmit }: Props) {
    return (
        <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter" && onSubmit) {
                        e.preventDefault();
                        onSubmit(value);
                    }
                }}
                placeholder="Buscar producto por código"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgb(139 92 246)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                    style={{ color: "var(--text-tertiary)" }}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

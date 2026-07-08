"use client";
// ============================================
// COMPONENT: CategoryFilter (Premium 2.0)
// ============================================
import { useRef, useEffect } from "react";
import { ProductCategory, CATEGORY_LABELS, CATEGORY_EMOJIS } from "../../types/pos.types";

const CATEGORIES: Array<ProductCategory | "all"> = ["all", "granel", "dulces", "galletas", "bebidas", "cafe", "snack", "comida_rapida", "otros"];

interface Props {
    active: ProductCategory | "all";
    onChange: (cat: ProductCategory | "all") => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            // Permitir el scroll horizontal nativo de los touchpads
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                return;
            }
            
            // Convertir scroll vertical a horizontal solo para mouse normal
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        // Also cleanup on unmount
        return () => el.removeEventListener("wheel", handleWheel);
    }, []);

    return (
        <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map(cat => {
                const isActive = active === cat;
                return (
                    <button
                        key={cat}
                        onClick={() => onChange(cat)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all duration-300 snap-center border-2 ${
                            isActive
                                ? "bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(26,58,110,0.4)]"
                                : "border-transparent border-opacity-0 hover:border-blue-500/30 hover:shadow-sm"
                        }`}
                        style={!isActive ? {
                            background: "var(--surface)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                        } : {}}
                    >
                        <span className={`text-base leading-none transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                            {cat === "all" ? "🛍️" : CATEGORY_EMOJIS[cat]}
                        </span>
                        <span>{cat === "all" ? "Todos los productos" : CATEGORY_LABELS[cat]}</span>
                    </button>
                );
            })}
        </div>
    );
}

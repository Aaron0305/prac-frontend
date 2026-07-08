"use client";
// ============================================
// COMPONENT: ProductCard (Premium — react-icons)
// ============================================
import { useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Product, UNIT_LABELS } from "../../types/pos.types";
import WeightInput from "./WeightInput";
import { renderPosIcon } from "../inventory/IconPicker";

interface Props {
    product: Product;
    onAdd: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAdd }: Props) {
    const [showWeightInput, setShowWeightInput] = useState(false);

    const needsWeight = product.unit === "g50" || product.unit === "g100";
    const isOutOfStock = product.stock <= 0;

    const handleClick = () => {
        if (isOutOfStock) return;
        if (needsWeight) {
            setShowWeightInput(true);
        } else {
            onAdd(product, 1);
        }
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick();
                    }
                }}
                className={`group relative flex flex-col items-start p-4 rounded-2xl text-left w-full transition-all duration-200
                           ${isOutOfStock
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md cursor-pointer"
                    }`}
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-color)",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--brand-blue-light)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
            >
                {/* Ícono */}
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: "var(--surface-alt)", color: "var(--brand-blue-medium)" }}
                >
                    {renderPosIcon(product.iconId || "tb-package", 26)}
                </div>

                {/* Nombre */}
                <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-2 text-left w-full" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                </h3>




                {/* Precio */}
                <div className="mt-auto pt-2 w-full flex items-end justify-between pointer-events-none">
                    <div>
                        <span className="text-base font-black" style={{ color: "var(--brand-blue-dark)" }}>
                            ${product.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] ml-1" style={{ color: "var(--text-tertiary)" }}>
                            {UNIT_LABELS[product.unit]}
                        </span>
                    </div>

                    {/* Stock bajo badge */}
                    {product.stock < 5 && product.stock > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                            ¡Poco stock!
                        </span>
                    )}
                    {product.stock === 0 && (
                        <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                            Agotado
                        </span>
                    )}
                </div>

                {/* Botón agregar (hover) */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100 pointer-events-none">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "var(--brand-blue-medium)", boxShadow: "0 10px 15px -3px rgba(26, 58, 110, 0.3)" }}>
                        {needsWeight
                            ? <Scale className="w-4 h-4 text-white" />
                            : <Plus className="w-4 h-4 text-white" />
                        }
                    </div>
                </div>
            </div>

            {showWeightInput && (
                <WeightInput
                    productName={product.name}
                    unit={product.unit as "g50" | "g100"}
                    pricePerUnit={product.price}
                    onConfirm={(qty) => {
                        onAdd(product, qty);
                        setShowWeightInput(false);
                    }}
                    onCancel={() => setShowWeightInput(false)}
                />
            )}
        </>
    );
}

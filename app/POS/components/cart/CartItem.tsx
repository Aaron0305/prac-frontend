"use client";
// ============================================
// COMPONENT: CartItem (Premium)
// ============================================
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem as CartItemType } from "../../types/pos.types";

interface Props {
    item: CartItemType;
    onUpdate: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdate, onRemove }: Props) {
    const { product, quantity, subtotal } = item;
    const isWeighed = product.unit === "g50" || product.unit === "g100";

    return (
        <div
            className="flex items-center gap-3 p-3 rounded-xl group transition-all duration-150 hover:shadow-sm"
            style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border-color)",
            }}
        >
            {/* Emoji */}
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "var(--surface)" }}
            >
                {product.emoji || "📦"}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    ${product.price.toFixed(2)} × {isWeighed ? `${quantity} ${product.unit}` : quantity}
                </p>
            </div>

            {/* Qty controls */}
            {!isWeighed && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => onUpdate(product.id, quantity - 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-violet-100 dark:hover:bg-violet-500/20"
                        style={{ background: "var(--surface)" }}
                    >
                        <Minus className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <span className="w-5 text-center text-xs font-black" style={{ color: "var(--text-primary)" }}>
                        {quantity}
                    </span>
                    <button
                        onClick={() => onUpdate(product.id, quantity + 1)}
                        disabled={quantity >= product.stock}
                        title={quantity >= product.stock ? "Stock máximo alcanzado" : "Agregar uno"}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${quantity >= product.stock ? 'opacity-30 cursor-not-allowed' : 'hover:bg-violet-100 dark:hover:bg-violet-500/20'}`}
                        style={{ background: "var(--surface)" }}
                    >
                        <Plus className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
                    </button>
                </div>
            )}

            {/* Subtotal */}
            <span className="text-sm font-black text-violet-600 dark:text-violet-400 flex-shrink-0 w-14 text-right">
                ${subtotal.toFixed(2)}
            </span>

            {/* Delete */}
            <button
                onClick={() => onRemove(product.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/20 flex-shrink-0"
                style={{ color: "var(--text-tertiary)" }}
            >
                <Trash2 className="w-3 h-3 hover:text-rose-500" />
            </button>
        </div>
    );
}

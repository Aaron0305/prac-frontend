"use client";
// ============================================
// COMPONENT: Cart — Panel lateral del carrito (Premium)
// ============================================
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { CartItem as CartItemType } from "../../types/pos.types";
import CartItem from "./CartItem";

interface Props {
    items: CartItemType[];
    total: number;
    onUpdate: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
    onClear: () => void;
    onCheckout: () => void;
}

export default function Cart({ items, total, onUpdate, onRemove, onClear, onCheckout }: Props) {
    const isEmpty = items.length === 0;

    return (
        <div className="flex flex-col h-full" style={{ background: "var(--surface)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Carrito</span>
                    {!isEmpty && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
                            {items.length}
                        </span>
                    )}
                </div>
                {!isEmpty && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 text-gray-400 hover:text-rose-500"
                    >
                        <Trash2 className="w-3 h-3" />
                        Limpiar
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--surface-alt)" }}>
                            <ShoppingCart className="w-8 h-8" style={{ color: "var(--text-tertiary)" }} strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Carrito vacío</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                            Agrega productos del catálogo
                        </p>
                    </div>
                ) : (
                    items.map(item => (
                        <CartItem
                            key={item.product.id}
                            item={item}
                            onUpdate={onUpdate}
                            onRemove={onRemove}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            {!isEmpty && (
                <div className="flex-shrink-0 p-4" style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface-alt)" }}>
                    {/* Subtotal row */}
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {items.length} {items.length === 1 ? "artículo" : "artículos"}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Subtotal</span>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-baseline mb-4">
                        <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Total a cobrar</span>
                        <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            ${total.toFixed(2)}
                        </span>
                    </div>

                    {/* Botón cobrar */}
                    <button
                        onClick={onCheckout}
                        className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-bold text-white text-sm
                                   bg-gradient-to-r from-blue-600 to-blue-700
                                   hover:from-blue-700 hover:to-blue-800
                                   shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50
                                   transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                    >
                        <span>Cobrar ahora</span>
                        <div className="flex items-center gap-1 font-black">
                            ${total.toFixed(2)}
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

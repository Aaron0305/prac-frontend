// ============================================
// HOOK: useCart — Lógica del carrito
// ============================================
import { useState, useCallback, useMemo } from "react";
import { CartItem, Product } from "../types/pos.types";

export function useCart() {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = useCallback((product: Product, quantity: number) => {
        if (quantity <= 0) return;
        if (product.stock <= 0) return;

        setItems(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) {
                return prev.map(i =>
                    i.product.id === product.id
                        ? {
                            ...i,
                            quantity: i.quantity + quantity,
                            subtotal: (i.quantity + quantity) * product.price,
                        }
                        : i
                );
            }
            return [
                ...prev,
                { product, quantity, subtotal: quantity * product.price },
            ];
        });
    }, []);

    const removeItem = useCallback((productId: string) => {
        setItems(prev => prev.filter(i => i.product.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(i => i.product.id !== productId));
            return;
        }
        setItems(prev =>
            prev.map(i =>
                i.product.id === productId
                    ? { ...i, quantity, subtotal: quantity * i.product.price }
                    : i
            )
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const total = useMemo(
        () => items.reduce((acc, i) => acc + i.subtotal, 0),
        [items]
    );

    const itemCount = useMemo(
        () => items.reduce((acc, i) => acc + i.quantity, 0),
        [items]
    );

    return { items, total, itemCount, addItem, removeItem, updateQuantity, clearCart };
}

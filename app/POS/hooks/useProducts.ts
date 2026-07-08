// ============================================
// HOOK: useProducts — Conectado a la base de datos Supabase
// ============================================
import { useState, useCallback, useMemo, useEffect } from "react";
import { Product, ProductCategory, ProductFormData } from "../types/pos.types";

const getApiUrl = () => {
    if (typeof window !== "undefined") {
        return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:3001" 
            : "https://inglesbackend-9p7og.ondigitalocean.app";
    }
    return "http://localhost:3001";
};

const API_URL = getApiUrl();

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
    const [loading, setLoading] = useState(true);

    const loadProducts = useCallback(async () => {
        const token = localStorage.getItem("token");
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/pos/products`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (e) {
            console.error("Error cargando productos:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            if (!p.isActive) return false;
            const matchCat = activeCategory === "all" || p.category === activeCategory;
            const matchSearch =
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.barcode && p.barcode.includes(searchQuery));
            return matchCat && matchSearch;
        });
    }, [products, searchQuery, activeCategory]);

    const findByBarcode = useCallback((barcode: string): Product | null => {
        return products.find(p => p.isActive && p.barcode === barcode) ?? null;
    }, [products]);

    const addProduct = useCallback(async (data: ProductFormData) => {
        const token = localStorage.getItem("token");
        // Optimistic UI Temporal ID
        const tempId = `temp_${Date.now()}`;
        const newProduct: Product = {
            id: tempId,
            name: data.name,
            category: data.category,
            price: parseFloat(data.price),
            unit: data.unit,
            stock: parseFloat(data.stock),
            emoji: data.emoji || "📦",
            iconId: data.iconId || "tb-package",
            barcode: data.barcode?.trim() || undefined,
            isActive: true,

            costPrice: parseFloat(data.costPrice) || 0,
            profitMargin: parseFloat(data.profitMargin) || 0,
            createdAt: new Date().toISOString(),
        };
        
        // Optimistic update
        setProducts(prev => [newProduct, ...prev]);

        try {
            const res = await fetch(`${API_URL}/api/pos/products`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProduct.name,
                    category: newProduct.category,
                    price: newProduct.price,
                    unit: newProduct.unit,
                    stock: newProduct.stock,
                    iconId: newProduct.iconId,
                    barcode: newProduct.barcode,

                    isActive: true,
                    costPrice: newProduct.costPrice,
                    profitMargin: newProduct.profitMargin,
                })
            });
            if (res.ok) {
                const savedProduct = await res.json();
                // Replace temp ID with Real ID from DB
                setProducts(prev => prev.map(p => p.id === tempId ? savedProduct : p));
                return savedProduct;
            } else {
                // API returned an error — revert optimistic add
                const errBody = await res.json().catch(() => ({}));
                console.error("Error del servidor al guardar producto:", res.status, errBody);
                setProducts(prev => prev.filter(p => p.id !== tempId));
            }
        } catch (error) {
            console.error("Error guardando producto:", error);
            // Network error — revert optimistic add
            setProducts(prev => prev.filter(p => p.id !== tempId));
        }
        return newProduct;
    }, []);

    const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
        const token = localStorage.getItem("token");

        // Auto-activate/deactivate based on stock
        const finalUpdates = { ...updates };
        if (finalUpdates.stock !== undefined) {
            if (finalUpdates.stock > 0) {
                finalUpdates.isActive = true;
            } else {
                finalUpdates.isActive = false;
            }
        }

        // Optimistic UI update
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p));
        
        if (id.startsWith("temp_")) return; // Si aún no guarda no actualizamos en DB
        
        try {
            await fetch(`${API_URL}/api/pos/products`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ id, ...finalUpdates })
            });
        } catch (error) {
            console.error("Error actualizando producto:", error);
        }
    }, []);



    /** 
     * DESCUENTO ATÓMICO: Ahora llama al endpoint PATCH para asegurar 
     * que el stock sea consistente ante condiciones de carrera.
     */
    const decreaseStock = useCallback(async (productId: string, quantity: number) => {
        const token = localStorage.getItem("token");
        
        // Optimistic UI: restamos en local para que el cajero vea el cambio inmediato
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                const newStock = Math.max(0, p.stock - quantity);
                return { ...p, stock: newStock, isActive: newStock > 0 };
            }
            return p;
        }));

        try {
            const res = await fetch(`${API_URL}/api/pos/products`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: productId,
                    quantity,
                    action: "decrement"
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                // Sincronizamos con el stock real devuelto por el servidor
                setProducts(prev => prev.map(p => {
                    if (p.id === productId) {
                        return { ...p, stock: data.new_stock, isActive: data.new_stock > 0 };
                    }
                    return p;
                }));
            }
        } catch (error) {
            console.error("Error en decremento atómico de stock:", error);
        }
    }, []);

    return {
        products,
        filteredProducts,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        addProduct,
        updateProduct,
        decreaseStock,
        findByBarcode,
        loading
    };
}

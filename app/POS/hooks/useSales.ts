import { useState, useCallback, useEffect } from "react";
import { io } from "socket.io-client";
import { Sale, CartItem, PaymentMethod } from "../types/pos.types";

const getApiUrl = () => {
    if (typeof window !== "undefined") {
        return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:3001" 
            : "https://inglesbackend-9p7og.ondigitalocean.app";
    }
    return "http://localhost:3001";
};

const API_URL = getApiUrl();

export function useSales() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSales = useCallback(async () => {
        const token = localStorage.getItem("token");
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/pos/sales`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSales(data);
            }
        } catch (e) {
            console.error("Error cargando ventas:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Socket implementation
    useEffect(() => {
        const socket = io(API_URL, {
            path: "/api/socket",
            transports: ["websocket", "polling"],
        });

        const token = localStorage.getItem("token");
        if (token) {
            socket.emit("authenticate", { token });
        }

        socket.on("auth-success", () => {
            socket.emit("register-admin");
        });

        socket.on("sale-created", (newSale: Sale) => {
            setSales(prev => {
                if (prev.some(s => s.id === newSale.id)) return prev;
                return [newSale, ...prev];
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        loadSales();
    }, [loadSales]);

    const recordSale = useCallback((
        items: CartItem[], 
        total: number, 
        amountPaid: number, 
        paymentMethod: PaymentMethod,
        cashierName: string = "Cajero"
    ): Sale => {
        const token = localStorage.getItem("token");
        const tempId = `sale_${Date.now()}`;
        const change = amountPaid - total;

        const todayStr = new Date().toLocaleDateString("en-CA");
        const todayCount = sales.filter(s => new Date(s.createdAt).toLocaleDateString("en-CA") === todayStr).length;
        const folioStr = `TKT-${String(todayCount + 1).padStart(4, '0')}`;

        const newSale: Sale = {
            id: tempId,
            items,
            total,
            amountPaid,
            change: change > 0 ? change : 0,
            paymentMethod,
            cashierName,
            createdAt: new Date().toISOString(),
            folio: folioStr,
        };

        // Optimistic UI
        setSales(prev => [newSale, ...prev]);

        // Guardar en DB asíncronamente
        fetch(`${API_URL}/api/pos/sales`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                items: newSale.items,
                total: newSale.total,
                amountPaid: newSale.amountPaid,
                change: newSale.change,
                paymentMethod: newSale.paymentMethod,
                cashierName: newSale.cashierName,
                folio: newSale.folio,
            })
        }).then(res => res.json())
          .then(savedSale => {
              if (savedSale.id) {
                  setSales(prev => prev.map(s => s.id === tempId ? savedSale : s));
              }
          })
          .catch(err => console.error("Error guardando venta:", err));

        return newSale;
    }, []);

    const deleteSale = useCallback(async (saleId: string): Promise<boolean> => {
        const token = localStorage.getItem("token");
        setSales(prev => prev.filter(s => s.id !== saleId));

        try {
            const res = await fetch(`${API_URL}/api/pos/sales/${saleId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                const reload = await fetch(`${API_URL}/api/pos/sales`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (reload.ok) setSales(await reload.json());
                return false;
            }
            return true;
        } catch (e) {
            console.error("Error eliminando venta:", e);
            return false;
        }
    }, []);


    const getDailyTotal = useCallback(() => {
        const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
        return sales
            .filter(s => new Date(s.createdAt).toLocaleDateString("en-CA") === todayStr)
            .reduce((acc, current) => acc + current.total, 0);
    }, [sales]);

    return {
        sales,
        recordSale,
        deleteSale,
        getDailyTotal,
        loading
    };
}

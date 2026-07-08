"use client";

// ============================================
// POS — Punto de Venta Tiendita (Diseño Premium)
// ============================================

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Store, ShoppingCart, Package, X,
    Scan, TrendingUp, Receipt, BarChart3, Menu, Settings, CircleDollarSign, LogOut, User,
    Printer, Wifi, WifiOff
} from "lucide-react";

import { useCart } from "./hooks/useCart";
import { useProducts } from "./hooks/useProducts";
import { useSales } from "./hooks/useSales";

import SearchBar from "./components/catalog/SearchBar";
import CategoryFilter from "./components/catalog/CategoryFilter";
import ProductGrid from "./components/catalog/ProductGrid";
import Cart from "./components/cart/Cart";
import PaymentModal from "./components/payment/PaymentModal";
import TicketModal from "./components/payment/TicketModal";
import SalesHistory from "./components/history/SalesHistory";
import InventoryPanel from "./components/inventory/InventoryPanel";
import BarcodeScanner from "./components/scanner/BarcodeScanner";
import { connectQz, getAvailablePrinters, getActivePrinter, setActivePrinter, isQzConnected } from "./lib/qzPrinter";

import { PaymentMethod, Sale } from "./types/pos.types";

type View = "pos" | "history" | "inventory";

export default function POSPage() {
    const router = useRouter();

    const { items, total, addItem, removeItem, updateQuantity, clearCart } = useCart();
    const {
        filteredProducts, searchQuery, setSearchQuery,
        activeCategory, setActiveCategory,
        addProduct, updateProduct, decreaseStock,
        products, findByBarcode,
    } = useProducts();
    const { sales, recordSale, deleteSale, getDailyTotal } = useSales();

    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [activeView, setActiveView] = useState<View>("pos");
    const [showCartMobile, setShowCartMobile] = useState(false);
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

    // Auth real
    const [role, setRole] = useState<"superadmin" | "admin">("admin");
    const [realName, setRealName] = useState("Cajero en Turno");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Efecto de Auto-Logeo y Redirección
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userTypeString = localStorage.getItem("userType");
        const userName = localStorage.getItem("userName") || "Cajero en Turno";

        if (!token || (userTypeString !== "superadmin" && userTypeString !== "admin")) {
            router.push("/login");
            return;
        }

        setRole(userTypeString as "superadmin" | "admin");
        setRealName(userName);
        setIsAuthenticated(true);
    }, [router]);

    // QZ Tray — Conexión automática e impresora
    const [qzConnected, setQzConnected] = useState(false);
    const [printerList, setPrinterList] = useState<string[]>([]);
    const [activePrinter, setActivePrinterState] = useState<string | null>(null);

    useEffect(() => {
        // Intentar conectar a QZ Tray al cargar
        connectQz().then(async (connected) => {
            setQzConnected(connected);
            if (connected) {
                const printers = await getAvailablePrinters();
                setPrinterList(printers);
                setActivePrinterState(getActivePrinter());
            }
        });
    }, []);

    // Alerta flotante para escaneo
    const [scanAlert, setScanAlert] = useState<{ id: string, type: "success" | "error" | "info", message: React.ReactNode } | null>(null);

    const showScanAlert = useCallback((type: "success" | "error" | "info", message: React.ReactNode) => {
        const id = Date.now().toString();
        setScanAlert({ id, type, message });
        setTimeout(() => setScanAlert(prev => prev?.id === id ? null : prev), 3500);
    }, []);

    const handleBarcodeScan = useCallback((barcode: string) => {
        if (!barcode || barcode.trim() === "") return;

        // Marcar que acaba de ocurrir un escaneo para que el atajo Enter→Cobrar no se dispare
        (window as any).__lastScanTime = Date.now();
        const product = findByBarcode(barcode);
        if (product) {
            const cartItem = items.find(i => i.product.id === product.id);
            const currentQty = cartItem ? cartItem.quantity : 0;

            // Verificamos stock antes de añadir
            if (currentQty + 1 > product.stock) {
                showScanAlert("error", (
                    <div className="flex flex-col text-left">
                        <span className="font-bold">❌ Stock agotado</span>
                        <span className="text-sm opacity-90 mt-0.5">Solo hay <strong>{product.stock}</strong> disponibles de {product.name}.</span>
                    </div>
                ));
            } else {
                addItem(product, 1);
                setSearchQuery(""); // Limpiar input tras escaneo exitoso
                showScanAlert("success", (
                    <div className="flex flex-col text-left">
                        <span className="font-bold flex items-center gap-1.5"><Scan className="w-4 h-4" /> {product.name} validado</span>
                        <span className="text-sm opacity-95 mt-0.5">Precio sumado: <strong className="font-black text-white text-base">${product.price.toFixed(2)}</strong> | En tienda: <strong>{(product.stock - currentQty - 1)}</strong> restantes</span>
                    </div>
                ));
            }
        } else {
            setSearchQuery(barcode);
            showScanAlert("info", (
                <div className="flex flex-col text-left">
                    <span className="font-bold">Buscando código...</span>
                    <span className="text-sm opacity-90 mt-0.5">{barcode} no coincide exactamente. Revisando coincidencias...</span>
                </div>
            ));
        }
    }, [findByBarcode, addItem, setSearchQuery, items, showScanAlert]);

    const handlePaymentConfirm = (amountPaid: number, method: PaymentMethod) => {
        const sale = recordSale(items, total, amountPaid, method, realName);
        items.forEach(item => decreaseStock(item.product.id, item.quantity));
        clearCart();
        setCompletedSale(sale);
    };

    // Atajo de teclado: Enter para "Cobrar ahora"
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Enter") return;

            // Ignorar si el Enter proviene del lector de código de barras (HID)
            if ((window as any).__lastScanTime && Date.now() - (window as any).__lastScanTime < 500) {
                return;
            }

            // Si está en un input con texto, dejar que el input lo maneje (ej: búsqueda)
            if (e.target instanceof HTMLInputElement && e.target.value.trim() !== "") {
                return;
            }
            if (e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Si hay productos en el carrito, estamos en POS y no hay modal abierto → cobrar
            if (activeView === "pos" && items.length > 0 && !completedSale) {
                e.preventDefault();
                handlePaymentConfirm(total, "efectivo");
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [activeView, items, total, completedSale, realName]);

    const todayStr = new Date().toLocaleDateString("en-CA");
    const todaySalesCount = sales.filter(s => new Date(s.createdAt).toLocaleDateString("en-CA") === todayStr).length;
    const hasProducts = products.filter(p => p.isActive).length > 0;

    const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
        { id: "pos", label: "Vender", icon: <Store className="w-4 h-4 md:w-5 md:h-5" /> },
        { id: "history", label: "Historial", icon: <Receipt className="w-4 h-4 md:w-5 md:h-5" /> },
        { id: "inventory", label: "Inventario", icon: <Package className="w-4 h-4 md:w-5 md:h-5" /> },
    ];

    // (Inventario ahora accesible para admin con restricciones, sin redirección forzada)

    // Prevenir renderizado hasta que confirme la sesión
    if (!isAuthenticated) return null;

    return (
        <div className="flex flex-col h-[100dvh] min-h-screen overflow-hidden text-gray-900 dark:text-gray-100" style={{ background: "var(--background)" }}>

            {/* ══════════════════════════════════════════════
                HEADER — Barra superior premium optimizada
            ══════════════════════════════════════════════ */}
            <header className="flex-shrink-0 z-30 backdrop-blur-md sticky top-0" 
                style={{ 
                    background: "var(--header-bg)", 
                    borderBottom: "1px solid var(--border-color)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                }}>

                <div className="flex items-center justify-between gap-2 px-3 md:px-6 h-14 md:h-16">
                    
                    {/* Izquierda: Menu + Logo + Business Info */}
                    <div className="flex items-center gap-2 md:gap-5 flex-1 min-w-0">
                        <button
                            onClick={() => setShowHamburgerMenu(true)}
                            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 group"
                            style={{ background: "var(--surface-alt)" }}
                        >
                            <Menu className="w-5 h-5 text-gray-500 group-hover:text-[var(--brand-blue-medium)] transition-colors" />
                        </button>

                        <div className="flex items-center gap-4 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src="/image/logo_mensaje.png" 
                                alt="BreakTime" 
                                className="h-7 md:h-9 w-auto object-contain transition-transform hover:scale-105 cursor-pointer flex-shrink-0"
                                onClick={() => setActiveView("pos")}
                            />
                            
                            {/* Business Context (Desktop only) */}
                            <div className="hidden xl:flex items-center gap-5 pl-5 border-l border-gray-100 dark:border-slate-800">
                                {/* Diarios */}
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Ventas Hoy</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        <span className="text-sm font-black text-emerald-600 tracking-tight">${getDailyTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                {/* UsuarioContext */}
                                <div className="flex flex-col pl-5 border-l border-gray-100 dark:border-slate-800">
                                    <span className="text-[9px] font-black text-[var(--brand-blue-dark)] dark:text-blue-400 uppercase tracking-widest leading-none mb-1">
                                        {role === "superadmin" ? "Súper Administrador" : "Punto de Venta"}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Sesión Activa — En Línea</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Centro: Navegación Principal (Adaptable) */}
                    <nav className="flex items-center gap-1 md:gap-1.5 p-1 rounded-2xl" style={{ background: "var(--surface-alt)" }}>
                        {NAV.map(item => {
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    className="flex items-center justify-center gap-2 px-2.5 md:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300"
                                    onClick={() => setActiveView(item.id)}
                                    title={item.label}
                                    style={{
                                        background: isActive ? "var(--brand-blue-dark)" : "transparent",
                                        color: isActive ? "#ffffff" : "var(--text-secondary)",
                                        boxShadow: isActive ? "0 4px 12px rgba(26, 58, 110, 0.25)" : "none",
                                        transform: isActive ? "scale(1.02)" : "scale(1)"
                                    }}
                                >
                                    <div className="flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Derecha: Acciones Rápidas + User Avatar */}
                    <div className="flex items-center gap-3 md:gap-4 flex-1 justify-end">
                        

                        {/* Botón Carrito Mobile */}
                        {activeView === "pos" && (
                            <button
                                onClick={() => setShowCartMobile(true)}
                                className="lg:hidden relative w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90 hover:brightness-110"
                                style={{ 
                                    background: "linear-gradient(135deg, var(--brand-blue-dark), var(--brand-blue-medium))",
                                    boxShadow: "0 8px 16px -4px rgba(26, 58, 110, 0.4)"
                                }}
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {items.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-black border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
                                        {items.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* ── ALERTA DE ESCÁNER FLOTANTE ── */}
            {scanAlert && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] w-full max-w-sm px-4 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`flex items-start gap-3 p-4 rounded-2xl shadow-2xl text-white ${
                        scanAlert.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border border-emerald-400/30' :
                        scanAlert.type === 'error' ? 'bg-gradient-to-br from-rose-500 to-rose-700 border border-rose-400/30' :
                        'bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30'
                    }`}>
                        <div className="flex-1 mt-0.5 text-sm md:text-base leading-tight font-medium">{scanAlert.message}</div>
                        <button onClick={() => setScanAlert(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                CONTENIDO PRINCIPAL
            ══════════════════════════════════════════════ */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* Panel Central */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    
                    {/* Background decorativo */}
                    <div 
                        className="absolute inset-0 z-0 pointer-events-none opacity-[0.35] dark:opacity-[0.1]"
                        style={{ 
                            backgroundImage: "url('/image/mascota_hde.png')", 
                            backgroundSize: "200px",
                            backgroundRepeat: "repeat",
                            backgroundPosition: "center"
                        }}
                    />

                    <div className="relative z-10 flex flex-col h-full overflow-hidden">
                        
                        {/* VISTA: VENDER */}
                        {activeView === "pos" && (
                            <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Search & Filters sticky en mobile */}
                                <div className="flex-shrink-0 p-3 md:p-4 space-y-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md" style={{ borderBottom: "1px solid var(--border-color)" }}>
                                    <div className="max-w-4xl mx-auto w-full flex items-center gap-2">
                                        <div className="flex-1">
                                            <SearchBar 
                                                value={searchQuery} 
                                                onChange={setSearchQuery} 
                                                onSubmit={(val) => handleBarcodeScan(val)}
                                            />
                                        </div>
                                        {/* Escáner funcional para Móvil y Desktop */}
                                        <div className="flex-shrink-0">
                                            <BarcodeScanner
                                                onScan={handleBarcodeScan}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-w-4xl mx-auto w-full overflow-x-auto scrollbar-none pb-1">
                                        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
                                    </div>
                                </div>

                                {/* Grid de productos con scroll suave */}
                                <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 scroll-smooth">
                                    {!hasProducts ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-6 max-w-lg mx-auto py-12">
                                            <div className="relative mb-8 group">
                                                <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center border-2 border-dashed transition-all group-hover:rotate-6" style={{ background: "rgba(26, 58, 110, 0.05)", borderColor: "rgba(26, 58, 110, 0.2)" }}>
                                                    <Store className="w-12 h-12" style={{ color: "var(--brand-blue-light)" }} />
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-black mb-3 text-gray-900 dark:text-white">¡Bienvenido a BreakTime!</h2>
                                            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                                Comienza agregando productos a tu inventario para poder realizar ventas en este punto de venta.
                                            </p>

                                            <button
                                                onClick={() => setActiveView("inventory")}
                                                className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-base transition-all hover:scale-105 active:scale-95 shadow-2xl overflow-hidden relative"
                                                style={{ background: "linear-gradient(135deg, var(--brand-blue-dark), var(--brand-blue-medium))" }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                                <Package className="w-5 h-5" />
                                                Configurar Inventario
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="max-w-7xl mx-auto">
                                            <ProductGrid products={filteredProducts} onAdd={addItem} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VISTA: HISTORIAL */}
                        {activeView === "history" && (
                            <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                                <SalesHistory
                                    sales={sales}
                                    role={role}
                                    onReprint={setCompletedSale}
                                    onDelete={role === "superadmin" ? deleteSale : undefined}
                                />
                            </div>
                        )}

                        {/* VISTA: INVENTARIO */}
                        {activeView === "inventory" && (
                            <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                                <InventoryPanel
                                    products={products}
                                    onAdd={addProduct}
                                    onUpdate={updateProduct}
                                    role={role}
                                />
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar Carrito (Desktop) */}
                <aside className="hidden lg:flex w-80 xl:w-96 flex-shrink-0 flex-col bg-white dark:bg-slate-900" style={{ borderLeft: "1px solid var(--border-color)" }}>
                    <Cart
                        items={items}
                        total={total}
                        onUpdate={updateQuantity}
                        onRemove={removeItem}
                        onClear={clearCart}
                        onCheckout={() => handlePaymentConfirm(total, "efectivo")}
                    />
                </aside>

                {/* Carrito Mobile Drawer */}
                {showCartMobile && (
                    <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setShowCartMobile(false)}
                        />
                        <div className="relative w-full max-w-[340px] h-full flex flex-col shadow-2xl bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-500">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                        <ShoppingCart className="w-4 h-4 text-[var(--brand-blue-medium)]" />
                                    </div>
                                    <span className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Tu Pedido</span>
                                </div>
                                <button
                                    onClick={() => setShowCartMobile(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-400 active:scale-90 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Cart
                                    items={items}
                                    total={total}
                                    onUpdate={updateQuantity}
                                    onRemove={removeItem}
                                    onClear={clearCart}
                                    onCheckout={() => { handlePaymentConfirm(total, "efectivo"); setShowCartMobile(false); }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── NAVEGACIÓN INFERIOR (MOBILE) ── */}
            <nav className="md:hidden flex-shrink-0 z-[40] bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-4 pb-safe">
                <div className="flex items-center justify-between h-20">
                    {NAV.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 relative ${
                                    isActive ? "text-[var(--brand-blue-medium)]" : "text-gray-400"
                                }`}
                            >
                                <div className={`mb-1 p-2 rounded-2xl transition-all duration-500 ${
                                    isActive 
                                        ? "bg-[var(--brand-blue-dark)] text-white shadow-xl shadow-blue-500/30 -translate-y-2 scale-110" 
                                        : "bg-transparent text-gray-400"
                                }`}>
                                    {isActive ? (
                                        <div className="scale-110">{item.icon}</div>
                                    ) : (
                                        item.icon
                                    )}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-tighter transition-all duration-300 ${
                                    isActive ? "opacity-100 scale-100 font-black" : "opacity-70 scale-90"
                                }`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[var(--brand-blue-medium)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Modales */}
            {completedSale && (
                <TicketModal
                    sale={completedSale}
                    onClose={() => setCompletedSale(null)}
                />
            )}

            {/* Menú Lateral General */}
            {showHamburgerMenu && (
                <div className="fixed inset-0 z-[600] flex">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
                        onClick={() => setShowHamburgerMenu(false)}
                    />
                    <div className="relative w-[300px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-500">
                        <div className="p-8 border-b border-gray-50 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "var(--brand-blue-dark)" }}>
                                    <Store className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl tracking-tighter text-gray-900 dark:text-white uppercase leading-none">BreakTime</h2>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Management System</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mt-4 mb-2">Administración</span>

                            {[
                                { label: "Gestión de Pagos", icon: <CircleDollarSign className="w-5 h-5" />, path: "/admin", color: "emerald" },
                                { label: "BreakTime", icon: <Store className="w-5 h-5" />, path: "/POS", color: "brand", current: true },
                            ].map((link, idx) => (
                                <button
                                    key={idx}
                                    className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all group ${
                                        link.current 
                                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 shadow-sm" 
                                            : "hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-[0.98]"
                                    }`}
                                    onClick={() => {
                                        if (!link.current) router.push(link.path);
                                        setShowHamburgerMenu(false);
                                    }}
                                >
                                    <div className={`p-2.5 rounded-xl transition-all shadow-sm ${
                                        link.current 
                                            ? "bg-[var(--brand-blue-dark)] text-white shadow-blue-500/20" 
                                            : "bg-gray-100 dark:bg-slate-800 group-hover:scale-110"
                                    }`}>
                                        {link.icon}
                                    </div>
                                    <span className={`font-black text-sm uppercase tracking-tight ${
                                        link.current ? "text-[var(--brand-blue-dark)] dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                                    }`}>
                                        {link.label}
                                    </span>
                                </button>
                            ))}

                            {/* Selector de impresora QZ Tray */}
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mt-6 mb-2">Impresora</span>

                            <div className="mx-4 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center gap-2">
                                    {qzConnected ? (
                                        <Wifi className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-amber-400" />
                                    )}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                            {qzConnected ? "QZ Tray conectado" : "QZ Tray no detectado"}
                                        </p>
                                        <p className="text-[8px] text-gray-400">
                                            {qzConnected ? "Impresión directa sin diálogo" : "Se usará el diálogo del navegador"}
                                        </p>
                                    </div>
                                </div>

                                {qzConnected && printerList.length > 0 && (
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Impresora activa</label>
                                        <select
                                            value={activePrinter || ""}
                                            onChange={(e) => {
                                                setActivePrinter(e.target.value);
                                                setActivePrinterState(e.target.value);
                                            }}
                                            className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        >
                                            <option value="">Seleccionar impresora...</option>
                                            {printerList.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {qzConnected && !activePrinter && printerList.length > 0 && (
                                    <p className="text-[9px] text-amber-500 font-semibold">⚠ Selecciona una impresora para habilitar impresión directa</p>
                                )}

                                {!qzConnected && (
                                    <button
                                        onClick={async () => {
                                            const connected = await connectQz();
                                            setQzConnected(connected);
                                            if (connected) {
                                                const printers = await getAvailablePrinters();
                                                setPrinterList(printers);
                                                setActivePrinterState(getActivePrinter());
                                            }
                                        }}
                                        className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors border border-blue-100 dark:border-blue-500/20"
                                    >
                                        <Printer className="w-3.5 h-3.5 inline mr-1.5" />
                                        Reintentar conexión
                                    </button>
                                )}
                            </div>

                            <div className="mt-auto pt-8 flex flex-col gap-6">
                                <div className="mx-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 bg-gray-200 dark:bg-slate-700 flex items-center justify-center font-black text-gray-500">
                                        {realName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase">{realName}</p>
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Activo</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => {
                                        localStorage.clear();
                                        router.push("/login");
                                    }}
                                    className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}

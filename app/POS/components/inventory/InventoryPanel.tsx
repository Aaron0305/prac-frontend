"use client";
// ============================================
// COMPONENT: InventoryPanel — CRUD + IconPicker + Barcode
// ============================================
import { useState, useRef, useEffect, Fragment } from "react";
import { Plus, Pencil, PackagePlus, X, Check, Scan, Search, Smile, ScanLine, Printer, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import Barcode from "react-barcode";
import { Product, ProductFormData, ProductCategory, UnitType, CATEGORY_LABELS, UNIT_LABELS } from "../../types/pos.types";
import { renderPosIcon, IconPickerModal } from "./IconPicker";

interface Props {
    products: Product[];
    onAdd: (data: ProductFormData) => void;
    onUpdate: (id: string, updates: Partial<Product>) => void;
    role?: "superadmin" | "admin";
}

const INITIAL_FORM: ProductFormData = {
    name: "",
    category: "otros",
    price: "",
    unit: "pieza",
    stock: "",
    emoji: "📦",
    iconId: "tb-package",
    barcode: "",

    costPrice: "",
    profitMargin: "",
};

export default function InventoryPanel({ products, onAdd, onUpdate, role = "superadmin" }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<ProductFormData>(INITIAL_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [barcodeError, setBarcodeError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Scanner states
    const [, setScanningBarcode] = useState(false);
    const [scannerSuccessAnim, setScannerSuccessAnim] = useState(false);

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const [showIconPicker, setShowIconPicker] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setForm(INITIAL_FORM);
        setEditingId(null);
        setBarcodeError(null);
        setShowForm(false);
        setScanningBarcode(false);
    };

    const handleSubmit = () => {
        if (!form.name.trim() || !form.price || !form.stock) return;

        const normalizedBarcode = form.barcode.trim();
        if (normalizedBarcode) {
            const duplicateBarcode = products.find(
                p =>
                    p.barcode?.trim() === normalizedBarcode &&
                    (!editingId || p.id !== editingId)
            );

            if (duplicateBarcode) {
                setBarcodeError("Este código de barras ya existe en otro producto.");
                return;
            }
        }

        setBarcodeError(null);

        if (editingId) {
            onUpdate(editingId, {
                name: form.name.trim(),
                category: form.category,
                price: parseFloat(form.price),
                unit: form.unit,
                stock: parseFloat(form.stock),
                iconId: form.iconId,
                barcode: normalizedBarcode || undefined,

                costPrice: parseFloat(form.costPrice) || 0,
                profitMargin: parseFloat(form.profitMargin) || 0,
            });
        } else {
            onAdd({
                ...form,
                barcode: normalizedBarcode,
                price: String(parseFloat(form.costPrice || "0") + parseFloat(form.profitMargin || "0"))
            });
        }
        resetForm();
    };

    const handleEdit = (product: Product) => {
        setForm({
            name: product.name,
            category: product.category,
            price: String(product.price),
            unit: product.unit,
            stock: String(product.stock),
            emoji: product.emoji || "📦",
            iconId: product.iconId || "tb-package",
            barcode: product.barcode || "",

            costPrice: String(product.costPrice || product.price),
            profitMargin: String(product.profitMargin || 0),
        });
        setBarcodeError(null);
        setEditingId(product.id);
        setShowForm(true);
    };

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setScanningBarcode(false);
            if (!form.name) document.getElementById("inv-name-input")?.focus();
        }
    };

    // Auto-escáner Global (Lee el escáner HID sin importar en qué input estés, siempre que sea rápido)
    useEffect(() => {
        if (!showForm || showIconPicker) return;

        let barcodeBuffer = "";
        let lastKeyTime = Date.now();

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignorar activamente el buffer global si el usuario ya está escribiendo manualmente dentro de cualquier input del formulario
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }

            const currentTime = Date.now();

            // Si pasan más de 40ms entre teclas, es humano, reiniciamos buffer
            if (currentTime - lastKeyTime > 40) {
                barcodeBuffer = "";
            }

            if (e.key === "Enter" && barcodeBuffer.length > 3) {
                e.preventDefault(); // Previene que envíe el formulario

                // Actualizamos el código de barras
                const finalBarcode = barcodeBuffer;
                setForm(f => ({ ...f, barcode: finalBarcode }));

                // Limpiamos focus si estaba en algún input para que no lo escriba
                (document.activeElement as HTMLElement)?.blur();

                // Animación de éxito
                setScannerSuccessAnim(true);
                setTimeout(() => setScannerSuccessAnim(false), 1500);

                barcodeBuffer = "";
                return;
            }

            // Evitamos capturar shift, ctrl, etc.
            if (e.key.length === 1) {
                barcodeBuffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [showForm, showIconPicker]);

    const visibleProducts = products.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        (p.barcode && p.barcode.includes(filter))
    );

    const totalPages = Math.ceil(visibleProducts.length / itemsPerPage);
    const paginatedProducts = visibleProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDownloadBarcodePDF = async () => {
        if (!form.barcode) return;
        try {
            const { jsPDF } = await import("jspdf");
            const html2canvas = (await import("html2canvas")).default;

            const node = document.getElementById("barcode-preview-container");
            if (!node) return;

            const canvas = await html2canvas(node, {
                scale: 4,
                backgroundColor: "#ffffff",
                logging: false,
            });
            const imgData = canvas.toDataURL("image/png");

            // Etiqueta estándar térmica pequeña: 60x30 mm
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: [60, 30]
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);

            const maxWidth = pdfWidth - 4;
            const maxHeight = pdfHeight - 4;
            const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);

            const finalWidth = imgProps.width * ratio;
            const finalHeight = imgProps.height * ratio;
            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);
            pdf.save(`etiqueta_${form.barcode}.pdf`);

        } catch (error) {
            console.error("Error al generar PDF de la etiqueta:", error);
            alert("Ocurrió un error general el PDF.");
        }
    };

    return (
        <div className="flex flex-col h-full relative" style={{ background: "var(--surface)" }}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-2 min-w-0">
                    <PackagePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Inventario</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">
                        {products.filter(p => p.isActive).length}
                    </span>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setForm(INITIAL_FORM); }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar producto
                </button>
            </div>

            {/* Banner informativo para admin */}
            {role === "admin" && (
                <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center gap-2.5">
                    <PackagePlus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                        Puedes <strong>registrar productos nuevos</strong>, <strong>editar precios</strong> (costo y ganancia) y <strong>modificar stock</strong> de los existentes.
                    </p>
                </div>
            )}

            {/* ── Buscador ────────────────────────────────────────────── */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Buscar en inventario por nombre o código..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        style={{ background: "var(--surface-alt)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    />
                </div>
            </div>

            {/* ── Lista de productos ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-2">
                {paginatedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <PackagePlus className="w-10 h-10 mb-3" style={{ color: "var(--text-tertiary)" }} strokeWidth={1.5} />
                        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Sin productos registrados</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Presiona &quot;Agregar producto&quot; para empezar</p>
                    </div>
                ) : (
                    <Fragment>
                        {paginatedProducts.map(product => (
                            <div
                                key={product.id}
                                className={`flex items-center gap-3 p-3 rounded-xl group transition-all ${!product.isActive ? 'opacity-60' : ''}`}
                                style={{ background: !product.isActive ? 'var(--surface)' : 'var(--surface-alt)', border: `1px solid ${!product.isActive ? 'rgb(245 158 11 / 0.3)' : 'var(--border-color)'}` }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgb(59 130 246 / 0.4)")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = !product.isActive ? "rgb(245 158 11 / 0.3)" : "var(--border-color)")}
                            >
                                {/* Ícono */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: !product.isActive ? 'rgb(245 158 11 / 0.1)' : 'var(--surface)', color: !product.isActive ? 'rgb(245 158 11)' : 'rgb(59 130 246)' }}
                                >
                                    {!product.isActive ? <AlertTriangle className="w-5 h-5" /> : renderPosIcon(product.iconId || "tb-package", 20)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                            {product.name}
                                        </p>
                                        {!product.isActive && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                                                Sin stock
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                            ${product.price.toFixed(2)} / {product.unit}
                                        </span>
                                        <span className={`text-xs ${product.stock <= 0 ? 'text-amber-500 font-bold' : ''}`} style={product.stock > 0 ? { color: "var(--text-tertiary)" } : undefined}>
                                            Stock: {product.stock}
                                        </span>
                                    </div>

                                    {product.barcode && (
                                        <div className="mt-2 flex items-center bg-white rounded-lg px-2 py-1.5 w-max border shadow-sm">
                                            <Barcode
                                                value={product.barcode}
                                                width={1}
                                                height={24}
                                                displayValue={false}
                                                margin={0}
                                                background="#ffffff"
                                                lineColor="#000000"
                                            />
                                            <span className="text-[11px] font-mono ml-3 font-bold text-gray-800 leading-none">
                                                {product.barcode}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Acciones */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ color: "var(--text-tertiary)" }}
                                        onMouseEnter={e => { e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.background = "rgb(59 130 246 / 0.1)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
                                        title={!product.isActive ? "Editar / Restockear" : "Editar"}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between gap-4 py-4 border-t mt-2 px-2" style={{ borderColor: "var(--border-color)" }}>
                                <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                                    Mostrando <span className="font-bold text-blue-500">{paginatedProducts.length}</span> de <span className="font-bold">{visibleProducts.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setCurrentPage(prev => Math.max(1, prev - 1));
                                            const container = document.querySelector('.flex-1.overflow-y-auto');
                                            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                                        style={{ background: "var(--surface)" }}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <div className="flex items-center px-3 h-8 rounded-lg text-xs font-bold" style={{ background: "var(--surface-alt)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                                        {currentPage} / {totalPages}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                            const container = document.querySelector('.flex-1.overflow-y-auto');
                                            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                                        style={{ background: "var(--surface)" }}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </Fragment>
                )}
            </div>

            {/* ── MODAL DE FORMULARIO ─────────────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div
                        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                        style={{ background: "var(--surface)", border: "1px solid var(--border-color)" }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border-color)" }}>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                {editingId ? "Editar producto" : "Registrar producto"}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto" style={{ background: "var(--background)" }}>

                            {/* Alerta de Escáner Automático */}
                            <div className={`mb-5 p-3 rounded-xl border flex items-start gap-3 transition-colors ${scannerSuccessAnim ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'}`}>
                                <ScanLine className={`w-5 h-5 mt-0.5 ${scannerSuccessAnim ? 'animate-bounce' : 'animate-pulse'}`} />
                                <div className="flex-1">
                                    <p className="text-sm font-bold">
                                        {scannerSuccessAnim ? "¡Código escaneado con éxito!" : "Escáner automático activo"}
                                    </p>
                                    <p className="text-xs opacity-80 mt-1">
                                        Apunta el escáner al producto para auto-rellenar <strong>o escribe el código manualmente</strong> en la casilla de abajo.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Selector de ícono */}
                                <div>
                                    <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                                        Ícono visual
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowIconPicker(true)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all hover:border-blue-400 group"
                                        style={{
                                            background: "var(--surface)",
                                            border: "2px dashed var(--border-color)",
                                        }}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                            style={{ background: "rgb(59 130 246 / 0.1)", color: "rgb(59 130 246)" }}
                                        >
                                            {renderPosIcon(form.iconId, 26)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                                Seleccionar ícono
                                            </p>
                                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                                Recomendado para identificar el producto rápido
                                            </p>
                                        </div>
                                        <Smile className="w-5 h-5 ml-auto" style={{ color: "var(--text-tertiary)" }} />
                                    </button>
                                </div>

                                {/* Nombre y Código */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                                            Nombre del producto <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="inv-name-input"
                                            className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                            style={{
                                                background: "var(--surface)",
                                                border: "1px solid var(--border-color)",
                                                color: "var(--text-primary)",
                                            }}
                                            placeholder="Ej: Sabritas Original 45g"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-1.5 flex items-center justify-between block" style={{ color: "var(--text-secondary)" }}>
                                            <span>Código de barras</span>
                                            <span className="text-[10px] uppercase font-bold text-blue-500 opacity-60">Escáner o Manual</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                ref={barcodeRef}
                                                className={`w-full px-4 py-2.5 pl-10 text-sm rounded-xl focus:outline-none transition-all font-mono font-bold ${barcodeError
                                                        ? "ring-2 ring-red-500/70 bg-red-50 dark:bg-red-500/10 text-red-600 border-red-500"
                                                        : scannerSuccessAnim
                                                            ? "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-500"
                                                            : "focus:ring-2 focus:ring-blue-500/50"
                                                    }`}
                                                style={{
                                                    background: (scannerSuccessAnim || barcodeError) ? undefined : "var(--surface)",
                                                    border: (scannerSuccessAnim || barcodeError) ? undefined : "1px solid var(--border-color)",
                                                    color: (scannerSuccessAnim || barcodeError) ? undefined : "var(--text-primary)",
                                                }}
                                                placeholder="Escribe o escanea aquí..."
                                                value={form.barcode}
                                                onChange={e => {
                                                    const nextBarcode = e.target.value;
                                                    if (barcodeError) setBarcodeError(null);
                                                    setForm(f => ({ ...f, barcode: nextBarcode }));
                                                }}
                                                onKeyDown={handleBarcodeKeyDown}
                                            />
                                            <Scan className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${scannerSuccessAnim ? 'text-emerald-500' : 'text-blue-500'}`} />
                                        </div>
                                        {barcodeError && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                                                {barcodeError}
                                            </p>
                                        )}

                                        {/* Previsualización del Barcode generado */}
                                        {form.barcode && (
                                            <div className="mt-3 p-3 bg-white border border-gray-200 shadow-inner rounded-xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                                <div id="barcode-preview-container" className="bg-white p-2">
                                                    <Barcode
                                                        value={form.barcode}
                                                        width={1.6}
                                                        height={45}
                                                        fontSize={16}
                                                        margin={0}
                                                        background="#ffffff"
                                                        lineColor="#000000"
                                                    />
                                                </div>
                                                <button type="button" onClick={handleDownloadBarcodePDF} className="mt-2 text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-1.5 rounded-lg border border-blue-100">
                                                    <Printer className="w-3.5 h-3.5" /> Descargar PDF
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Categoría + Unidad */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Categoría</label>
                                        <select
                                            className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                                            style={{ background: form.category === "granel" ? "var(--surface)" : "var(--surface)", border: form.category === "granel" ? "1px solid rgb(59 130 246 / 0.5)" : "1px solid var(--border-color)", color: "var(--text-primary)" }}
                                            value={form.category}
                                            onChange={e => {
                                                const cat = e.target.value as ProductCategory;
                                                // Si es granel, sugerimos auto-cambiar la unidad a 'g50' o 'g100'
                                                setForm(f => ({ ...f, category: cat, unit: cat === 'granel' ? 'g50' : f.unit }));
                                            }}
                                        >
                                            {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map(c => (
                                                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-1.5 flex justify-between" style={{ color: "var(--text-secondary)" }}>
                                            <span>Venta por</span>
                                            {form.category === "granel" && <span className="text-[10px] text-blue-500 font-bold uppercase">Recomendado: Kg/g</span>}
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium transition-colors"
                                            style={{ background: form.category === "granel" ? "rgb(59 130 246 / 0.05)" : "var(--surface)", border: form.category === "granel" ? "1px solid rgb(59 130 246 / 0.3)" : "1px solid var(--border-color)", color: form.category === "granel" ? "var(--text-primary)" : "var(--text-primary)" }}
                                            value={form.unit}
                                            onChange={e => setForm(f => ({ ...f, unit: e.target.value as UnitType }))}
                                        >
                                            {(Object.keys(UNIT_LABELS) as UnitType[]).map(u => (
                                                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Costo, Ganancia y Precio Total — Visible para todos los roles */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold block" style={{ color: "var(--text-secondary)" }}>
                                            Precio de costo <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold opacity-50" style={{ color: "var(--text-primary)" }}>$</span>
                                            <input
                                                type="number" min="0" step="0.50"
                                                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                                style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                                                placeholder="0.00"
                                                value={form.costPrice}
                                                onChange={e => {
                                                    const cost = e.target.value;
                                                    const profit = form.profitMargin || "0";
                                                    const total = parseFloat(cost || "0") + parseFloat(profit);
                                                    setForm(f => ({ ...f, costPrice: cost, price: String(total) }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold block" style={{ color: "var(--text-secondary)" }}>
                                            Ganancia <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold opacity-50" style={{ color: "var(--text-primary)" }}>$</span>
                                            <input
                                                type="number" min="0" step="0.50"
                                                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                                style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                                                placeholder="0.00"
                                                value={form.profitMargin}
                                                onChange={e => {
                                                    const profit = e.target.value;
                                                    const cost = form.costPrice || "0";
                                                    const total = parseFloat(cost) + parseFloat(profit || "0");
                                                    setForm(f => ({ ...f, profitMargin: profit, price: String(total) }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold block" style={{ color: "var(--text-secondary)" }}>
                                            Venta (Total)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-blue-600">$</span>
                                            <div
                                                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl font-black flex items-center"
                                                style={{ background: "var(--surface-alt)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                                            >
                                                {(parseFloat(form.costPrice || "0") + parseFloat(form.profitMargin || "0")).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stock e Inventario */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className={`transition-all rounded-xl ${form.category === 'granel' ? 'p-1.5 -m-1.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30' : ''}`}>
                                        <label className="text-sm font-semibold mb-1.5 flex flex-col gap-0.5" style={{ color: "var(--text-secondary)" }}>
                                            <span className="flex items-center gap-1">Inventario {form.category === 'granel' ? <span className="text-xs text-blue-600 dark:text-blue-400 font-black uppercase">(En {form.unit.toUpperCase()}s)</span> : ''} <span className="text-red-500">*</span></span>
                                        </label>
                                        <input
                                            type="number" min="0" step="1"
                                            className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                            style={{ background: "var(--surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                                            placeholder="0"
                                            value={form.stock}
                                            onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t flex gap-3 shrink-0" style={{ borderColor: "var(--border-color)", background: "var(--surface)" }}>
                            <button
                                onClick={resetForm}
                                className="flex-1 py-3 rounded-xl font-bold transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                                style={{ border: "2px solid var(--border-color)", color: "var(--text-secondary)" }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!form.name.trim() || !form.costPrice || !form.profitMargin || !form.stock}
                                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base"
                            >
                                <Check className="w-5 h-5" />
                                {editingId ? "Actualizar Inventario" : "Guardar Producto"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de íconos ─────────────────────────────────────── */}
            {showIconPicker && (
                <IconPickerModal
                    selected={form.iconId}
                    onSelect={iconId => setForm(f => ({ ...f, iconId }))}
                    onClose={() => setShowIconPicker(false)}
                />
            )}
        </div>
    );
}

"use client";
// ============================================
// COMPONENT: SalesHistory — Historial de ventas
// Roles:
//   superadmin → navega cualquier fecha, puede ELIMINAR ventas
//   admin      → solo ve el día de hoy, sin eliminar
// ============================================
import { useState, useMemo } from "react";
import { Receipt, Calendar, ChevronLeft, ChevronRight, Printer, Trash2, AlertTriangle, X } from "lucide-react";
import { Sale } from "../../types/pos.types";
import { printTicketFromSale } from "../payment/TicketModal";

const METHOD_COLORS: Record<string, string> = {
    efectivo:      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20",
    transferencia: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20",
    tarjeta:       "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20",
};

const METHOD_LABEL: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
};

interface Props {
    sales: Sale[];
    role?: "superadmin" | "admin";
    onReprint: (sale: Sale) => void;
    onDelete?: (saleId: string) => Promise<boolean>;
}

/** Convierte timestamp UTC → fecha local YYYY-MM-DD */
function toLocalDateStr(iso: string): string {
    return new Date(iso).toLocaleDateString("en-CA");
}

function computeSaleProfit(sale: Sale): number {
    return sale.items.reduce((acc, item) => {
        const unitSalePrice = Number(item.product.price ?? 0);
        const unitCost = item.product.costPrice !== undefined
            ? Number(item.product.costPrice)
            : Number(unitSalePrice - Number(item.product.profitMargin ?? 0));
        const qty = Number(item.quantity ?? 0);
        const profit = (unitSalePrice - unitCost) * qty;
        return acc + (Number.isFinite(profit) ? profit : 0);
    }, 0);
}

// ── Modal de confirmación de eliminación ──────────────────────
function DeleteConfirmModal({
    sale,
    onConfirm,
    onCancel,
    loading,
}: {
    sale: Sale;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header rojo */}
                <div className="flex items-center gap-3 px-5 py-4 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-100 dark:border-rose-500/20">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-rose-700 dark:text-rose-400">¿Eliminar esta venta?</p>
                        <p className="text-[10px] text-rose-500/80">Esta acción no se puede deshacer</p>
                    </div>
                    <button onClick={onCancel} className="ml-auto p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Folio</span>
                        <span className="font-black text-gray-900 dark:text-white">#{sale.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Total</span>
                        <span className="font-black text-gray-900 dark:text-white">${sale.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Cajero</span>
                        <span className="font-black text-gray-900 dark:text-white truncate max-w-[140px]">{sale.cashierName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">Hora</span>
                        <span className="font-black text-gray-900 dark:text-white">
                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                    <button
                        onClick={onCancel}
                        className="py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        {loading ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────
export default function SalesHistory({ sales, role = "admin", onReprint, onDelete }: Props) {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // Solo superadmin puede navegar fechas
    const canNavigateDates = role === "superadmin";
    const effectiveDate = canNavigateDates ? selectedDate : todayStr;

    // Modal de confirmación de borrado
    const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const dateSales = useMemo(() => {
        return sales.filter(s => toLocalDateStr(s.createdAt) === effectiveDate);
    }, [sales, effectiveDate]);

    const dateTotal = useMemo(() => dateSales.reduce((acc, s) => acc + s.total, 0), [dateSales]);
    const dateProfit = useMemo(() => dateSales.reduce((acc, s) => acc + computeSaleProfit(s), 0), [dateSales]);

    const stats = useMemo(() => ({
        total: dateTotal,
        count: dateSales.length,
        avg: dateSales.length > 0 ? dateTotal / dateSales.length : 0,
    }), [dateSales, dateTotal]);

    const handlePrevDay = () => {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toLocaleDateString("en-CA"));
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate + "T12:00:00");
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toLocaleDateString("en-CA"));
    };

    const handlePrintCorte = () => {
        const includeProfit = role === "superadmin";
        const profitRow = includeProfit ? `
    <div class="row"><span>Ganancia real:</span><span>$${dateProfit.toFixed(2)}</span></div>
    <hr />
        ` : "";

        // Desglose por método de pago
        const methodTotals: Record<string, number> = {};
        dateSales.forEach(s => {
            const label = METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod;
            methodTotals[label] = (methodTotals[label] || 0) + s.total;
        });
        const methodRows = Object.entries(methodTotals)
            .map(([label, amount]) => `<div class="row"><span>${label}:</span><span>$${amount.toFixed(2)}</span></div>`)
            .join("\n    ");

        const html = `<!DOCTYPE html>
<html><head><title>Corte de Caja - BreakTime POS</title>
<style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 4mm 5mm; background: #fff; text-align: center; font-size: 12px; width: 80mm; }
    .bold { font-weight: 700; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
    h2 { font-size: 16px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; }
    .subtitle { font-size: 9px; color: #666; margin-bottom: 8px; }
    .total-row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 18px; font-weight: 900; }
    .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 8px 0 4px 0; text-align: left; }
    .firma { border-top: 1px solid #000; padding-top: 5px; margin: 30px 20px 0 20px; font-size: 10px; }
    @media print { body { margin: 0; padding: 4mm 5mm; } }
</style>
</head><body>
    <h2>CORTE DE CAJA</h2>
    <div class="subtitle">BreakTime POS</div>
    <hr />
    <div class="row"><span>Fecha:</span><span>${effectiveDate}</span></div>
    <div class="row"><span>Hora de corte:</span><span>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
    <div class="row"><span>Operaciones:</span><span>${dateSales.length}</span></div>
    <hr />
    <div class="section-title">Desglose por método</div>
    ${methodRows}
    <hr />
    ${profitRow}
    <div class="total-row">
        <span>TOTAL:</span><span>$${dateTotal.toFixed(2)}</span>
    </div>
    <hr />
    <div class="firma">Firma Responsable</div>
</body></html>`;

        // Usar iframe oculto para impresión (no se bloquea como window.open)
        const iframe = document.createElement("iframe");
        Object.assign(iframe.style, {
            position: "fixed",
            right: "0",
            bottom: "0",
            width: "0",
            height: "0",
            border: "none",
            visibility: "hidden",
        });
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    try { document.body.removeChild(iframe); } catch {}
                }, 2000);
            }, 500);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget || !onDelete) return;
        setDeleteLoading(true);
        await onDelete(deleteTarget.id);
        setDeleteLoading(false);
        setDeleteTarget(null);
    };

    return (
        <>
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0c1929]">
            {/* ── HEADER ── */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-[#1a3a6e] dark:text-[#4a90d9]" />
                        </div>
                        <h2 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tighter">Historial</h2>
                        {role === "superadmin" && (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 uppercase tracking-widest border border-violet-200 dark:border-violet-500/30">
                                SuperAdmin
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {canNavigateDates ? (
                            /* Navegación de fechas — solo superadmin */
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200 dark:border-slate-700">
                                <button onClick={handlePrevDay} className="p-1.5 text-gray-400 hover:text-[#1a3a6e] hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="relative flex items-center px-1">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-[11px] font-black text-center w-24 focus:outline-none text-gray-800 dark:text-white cursor-pointer"
                                    />
                                    <Calendar className="w-3 h-3 text-[#1a3a6e] pointer-events-none absolute right-1" />
                                </div>
                                <button onClick={handleNextDay} className="p-1.5 text-gray-400 hover:text-[#1a3a6e] hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            /* Admin normal: solo hoy */
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Operando Hoy
                            </div>
                        )}
                    </div>
                </div>

                {/* ── KPIs — Solo visible para superadmin ── */}
                {role === "superadmin" && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a3a6e] to-[#2b5797] border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-center">
                            <p className="text-blue-100/60 text-[8px] font-black uppercase tracking-widest mb-1 leading-none">Venta Total</p>
                            <h3 className="text-xl font-black text-white leading-none">${stats.total.toFixed(2)}</h3>
                            <button
                                onClick={handlePrintCorte}
                                disabled={dateSales.length === 0}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-0"
                            >
                                <Printer className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-1 leading-none">Volumen</p>
                            <div className="flex items-baseline gap-1.5">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none">{stats.count}</h3>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">ventas</span>
                            </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                            <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-1 leading-none">Promedio</p>
                            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none">${stats.avg.toFixed(2)}</h3>
                        </div>
                    </div>
                )}
            </div>

            {/* ── LISTA DE VENTAS ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-20 space-y-3">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">
                        {canNavigateDates && selectedDate !== todayStr ? `Ventas del ${selectedDate}` : "Registro de hoy"}
                    </span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                    {role === "superadmin" && dateSales.length > 0 && (
                        <span className="text-[8px] font-black text-violet-500 uppercase tracking-widest flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5" /> Puedes eliminar
                        </span>
                    )}
                </div>

                {dateSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <Calendar className="w-6 h-6 text-gray-200 dark:text-slate-700" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sin registros</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dateSales.map((sale, idx) => (
                            <div
                                key={sale.id}
                                className="group bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200 shadow-sm animate-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                                style={{ animationDelay: `${idx * 30}ms` }}
                            >
                                <div className="flex items-center p-3 gap-3">
                                    {/* Hora e ID */}
                                    <div className="flex flex-col min-w-[50px]">
                                        <span className="text-[10px] font-black text-gray-900 dark:text-white leading-none">
                                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">#{sale.id.slice(-4)}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                            <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md ${METHOD_COLORS[sale.paymentMethod] ?? "bg-gray-100 text-gray-500"}`}>
                                                {METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">
                                                {sale.items.map(i => `${i.quantity}x ${i.product.name.split(" ")[0]}`).join(", ")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[9px] text-gray-400 font-medium">
                                                📦 {sale.items.length} {sale.items.length === 1 ? "artículo" : "artículos"}
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
                                                👤 <span className="truncate max-w-[60px]">{sale.cashierName || "Sist."}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Total + Acciones */}
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="text-right">
                                            <p className="text-xs font-black text-gray-900 dark:text-white leading-none">${sale.total.toFixed(2)}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Total</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Reimprimir — ambos roles */}
                                            <button
                                                onClick={() => printTicketFromSale(sale, { includeProfit: role === "superadmin" })}
                                                title="Reimprimir ticket"
                                                className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-95"
                                            >
                                                <Printer className="w-3 h-3" />
                                            </button>

                                            {/* Eliminar — solo superadmin */}
                                            {role === "superadmin" && onDelete && (
                                                <button
                                                    onClick={() => setDeleteTarget(sale)}
                                                    title="Eliminar venta"
                                                    className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Modal de confirmación de eliminación */}
        {deleteTarget && (
            <DeleteConfirmModal
                sale={deleteTarget}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        )}
        </>
    );
}

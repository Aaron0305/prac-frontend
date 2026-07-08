"use client";
import { useState, useEffect } from "react";
import {
    CheckCircle, Printer, X, Store, ShieldCheck,
    Clock, Hash, CreditCard, Banknote, ArrowLeftRight,
    Wifi, WifiOff
} from "lucide-react";
import { Sale } from "../../types/pos.types";
import { printHtml, isQzConnected, connectQz } from "../../lib/qzPrinter";

interface Props {
    sale: Sale;
    onClose: () => void;
}

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; dot: string }> = {
    efectivo: { label: "Efectivo", icon: <Banknote className="w-3.5 h-3.5" />, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25", dot: "bg-emerald-400" },
    transferencia: { label: "Transferencia", icon: <ArrowLeftRight className="w-3.5 h-3.5" />, color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25", dot: "bg-violet-400" },
    tarjeta: { label: "Tarjeta", icon: <CreditCard className="w-3.5 h-3.5" />, color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25", dot: "bg-blue-400" },
};

const UNIT_LABEL: Record<string, string> = {
    g50: "50g", g100: "100g", lt: "lt", pieza: "pz", porcion: "porc",
};

function formatLocalDateTime(iso: string) {
    const d = new Date(iso);
    const date = d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
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

/* ─────────────────────────────────────────────
   TICKET HTML para impresión  (80 mm)
───────────────────────────────────────────── */
function buildTicketHtml(sale: Sale, folio: string, date: string, time: string) {
    const itemsHtml = sale.items.map(item => `
        <div class="item-row">
            <div class="item-left">
                <div class="item-name">${item.product.name}</div>
                <div class="item-detail">${item.quantity} ${UNIT_LABEL[item.product.unit] ?? item.product.unit} &times; $${item.product.price.toFixed(2)}</div>
            </div>
            <div class="item-price">$${item.subtotal.toFixed(2)}</div>
        </div>
    `).join("");

    const cashInfo = "";

    return buildTicketHtmlInternal({ sale, folio, date, time, cashInfo, itemsHtml, includeProfit: false, profitTotal: 0 });
}

function buildTicketHtmlWithProfit(sale: Sale, folio: string, date: string, time: string) {
    const itemsHtml = sale.items.map(item => `
        <div class="item-row">
            <div class="item-left">
                <div class="item-name">${item.product.name}</div>
                <div class="item-detail">${item.quantity} ${UNIT_LABEL[item.product.unit] ?? item.product.unit} &times; $${item.product.price.toFixed(2)}</div>
            </div>
            <div class="item-price">$${item.subtotal.toFixed(2)}</div>
        </div>
    `).join("");

    const cashInfo = "";

    const profitTotal = computeSaleProfit(sale);
    return buildTicketHtmlInternal({ sale, folio, date, time, cashInfo, itemsHtml, includeProfit: true, profitTotal });
}

function buildTicketHtmlInternal({
    sale,
    folio,
    date,
    time,
    cashInfo,
    itemsHtml,
    includeProfit,
    profitTotal,
}: {
    sale: Sale;
    folio: string;
    date: string;
    time: string;
    cashInfo: string;
    itemsHtml: string;
    includeProfit: boolean;
    profitTotal: number;
}) {

    const profitRow = includeProfit ? `
        <div class="totals-row" style="color:#000; font-weight: 800;">
            <span>Ganancia real</span>
            <span>$${profitTotal.toFixed(2)}</span>
        </div>
    ` : "";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Ticket BreakTime #${folio}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap');
    @page { size: 80mm auto; margin: 0; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        background: #fff;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #000;
        width: 80mm;
    }

    /* ── HEADER ── */
    .header {
        padding: 20px 20px 15px;
        text-align: center;
        border-bottom: 2px dashed #000;
    }
    .brand {
        font-size: 28px;
        font-weight: 800;
        color: #000;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    /* ── BODY ── */
    .body {
        padding: 15px 20px 10px;
    }

    .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 15px;
    }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-item.right { text-align: right; }
    .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        color: #000;
        font-weight: 800;
    }
    .meta-value {
        font-size: 13px;
        font-weight: 700;
        color: #000;
    }

    .divider {
        border: none;
        border-top: 2px dashed #000;
        margin: 15px 0;
    }

    .section-label {
        font-size: 12px;
        text-transform: uppercase;
        color: #000;
        text-align: center;
        margin-bottom: 10px;
        font-weight: 800;
    }

    .item-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
    }
    .item-name {
        font-size: 14px;
        font-weight: 800;
        text-transform: uppercase;
        color: #000;
        margin-bottom: 2px;
    }
    .item-detail { font-size: 13px; font-weight: 600; color: #000; }
    .item-price  { font-size: 15px; font-weight: 800; color: #000; white-space: nowrap; }

    /* ── TOTALS ── */
    .totals-block {
        margin: 15px 0 10px;
    }
    .totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        font-weight: 600;
        color: #000;
        margin-bottom: 6px;
    }
    .totals-row.highlight { font-weight: 800; font-size: 15px; }
    .totals-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 2px solid #000;
        margin-top: 10px;
    }
    .totals-main-label {
        font-size: 15px;
        text-transform: uppercase;
        color: #000;
        font-weight: 800;
    }
    .totals-main-amount {
        font-size: 26px;
        font-weight: 800;
        color: #000;
    }

    /* ── FOOTER ── */
    .footer {
        padding: 15px 20px 20px;
        text-align: center;
    }
    .footer-tagline {
        font-size: 13px;
        color: #000;
        font-weight: 800;
        text-transform: uppercase;
        margin-bottom: 10px;
    }
    .spacer { height: 20px; }
</style>
</head>
<body>

<div class="header">
    <div class="brand">BreakTime</div>
</div>

<div class="body">
    <div class="meta-grid">
        <div class="meta-item">
            <span class="meta-label">Folio</span>
            <span class="meta-value">#${folio}</span>
        </div>
        <div class="meta-item right">
            <span class="meta-label">Fecha</span>
            <span class="meta-value">${date}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Hora</span>
            <span class="meta-value">${time}</span>
        </div>
        <div class="meta-item right">
            <span class="meta-label">Cajero</span>
            <span class="meta-value">${sale.cashierName}</span>
        </div>
    </div>

    <hr class="divider"/>

    <p class="section-label">${sale.items.length} ${sale.items.length === 1 ? "artículo" : "artículos"}</p>

    ${itemsHtml}

    <hr class="divider"/>

    <div class="totals-block">
        <div class="totals-row">
            <span>Subtotal</span>
            <span>$${sale.total.toFixed(2)}</span>
        </div>
        ${profitRow}
        ${cashInfo}
        <div class="totals-main">
            <span class="totals-main-label">Total cobrado</span>
            <span class="totals-main-amount">$${sale.total.toFixed(2)}</span>
        </div>
    </div>
</div>

<div class="footer">
    <div class="footer-tagline">&#10022; Gracias por su preferencia &#10022;</div>
</div>

<div class="spacer"></div>
</body>
</html>`;
}

export async function printTicketFromSale(sale: Sale, opts?: { includeProfit?: boolean }): Promise<boolean> {
    const { date, time } = formatLocalDateTime(sale.createdAt || new Date().toISOString());
    const folio = sale.folio || sale.id.slice(-8).toUpperCase();
    const html = opts?.includeProfit ? buildTicketHtmlWithProfit(sale, folio, date, time) : buildTicketHtml(sale, folio, date, time);

    // Intentar QZ Tray primero, si falla usa fallback automáticamente
    const usedQz = await printHtml(html);
    return usedQz;
}

/* ─────────────────────────────────────────────
   COMPONENTE MODAL
───────────────────────────────────────────── */
export default function TicketModal({ sale, onClose }: Props) {
    const [printing, setPrinting] = useState(false);
    const [autoPrinted, setAutoPrinted] = useState(false);
    const [qzStatus, setQzStatus] = useState<"checking" | "connected" | "disconnected">("checking");
    const [calcReceived, setCalcReceived] = useState("");
    const method = METHOD_CONFIG[sale.paymentMethod] ?? METHOD_CONFIG.efectivo;
    const { date, time } = formatLocalDateTime(sale.createdAt || new Date().toISOString());
    const folio = sale.folio || sale.id.slice(-8).toUpperCase();

    // Auto-imprimir al montar el modal (impresión inmediata)
    useEffect(() => {
        if (autoPrinted) return;
        setAutoPrinted(true);

        // Verificar estado de QZ Tray
        connectQz().then(connected => {
            setQzStatus(connected ? "connected" : "disconnected");
        });

        // Imprimir automáticamente y cerrar el modal siempre al terminar
        setPrinting(true);
        printTicketFromSale(sale).then(usedQz => {
            setPrinting(false);
            // Cerrar siempre: 400ms si QZ Tray, 800ms si diálogo del navegador
            setTimeout(() => onClose(), usedQz ? 400 : 800);
        }).catch(() => setPrinting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePrint = async () => {
        setPrinting(true);
        await printTicketFromSale(sale);
        setPrinting(false);
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-3 sm:p-4">

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Card */}
            <div className="relative w-full max-w-[420px] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">

                {/* ── SUCCESS BADGE flotante ── */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                    <div className="relative w-11 h-11">
                        <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
                        <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <CheckCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* ── CARD PRINCIPAL ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col max-h-[85vh]">

                    {/* ── HEADER ── */}
                    <div className="relative bg-slate-950 dark:bg-slate-950 pt-9 pb-4 px-5 text-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                        <div className="relative">
                            <p className="text-slate-300/70 text-[8px] font-black uppercase tracking-[0.28em] mb-1">
                                Transacción exitosa
                            </p>
                            <h2 className="text-white text-[20px] font-black uppercase tracking-tight leading-none">
                                Venta confirmada
                            </h2>
                            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Hash className="w-3 h-3 text-slate-300/70" />
                                <span className="text-[10px] font-black text-white/70 tracking-[0.18em] uppercase">{folio}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── RECEIPT BODY ── */}
                    <div className="px-4 pt-4 pb-4 space-y-3 overflow-y-auto">

                        {/* Store header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0">
                                    <Store className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">BreakTime</p>
                                    <p className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em]">Punto de venta</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 text-gray-400 mb-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="text-[10px] font-bold">{time}</span>
                                </div>
                                <span className="text-[9px] font-medium text-gray-400">{date}</span>
                            </div>
                        </div>

                        {/* Cajero + Método */}
                        <div className="flex items-stretch gap-2">
                            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700/80">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Cajero</p>
                                    <p className="text-[10px] font-black text-gray-900 dark:text-white truncate">{sale.cashierName}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${method.bg}`}>
                                <span className={method.color}>{method.icon}</span>
                                <div>
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Método</p>
                                    <p className={`text-[10px] font-black ${method.color}`}>{method.label}</p>
                                </div>
                            </div>
                        </div>

                        {/* Separador artículos */}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 border-t border-dashed border-gray-200 dark:border-slate-800" />
                            <span className="text-[8px] font-bold text-gray-300 dark:text-slate-600 uppercase tracking-widest whitespace-nowrap">
                                {sale.items.length} {sale.items.length === 1 ? "artículo" : "artículos"}
                            </span>
                            <div className="h-px flex-1 border-t border-dashed border-gray-200 dark:border-slate-800" />
                        </div>

                        {/* Items */}
                        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                            {sale.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100/80 dark:border-slate-700/60"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-tight truncate">{item.product.name}</p>
                                        <p className="text-[9px] text-gray-400">
                                            {item.quantity}&nbsp;
                                            <span className="text-gray-300 dark:text-slate-600">{UNIT_LABEL[item.product.unit] ?? item.product.unit}</span>
                                            <span className="mx-1 text-gray-200 dark:text-slate-700">&times;</span>
                                            ${item.product.price.toFixed(2)}
                                            {item.product.category === "granel" && (
                                                <span className="ml-1.5 text-[7px] bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Granel</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-[12px] font-black text-gray-900 dark:text-white tabular-nums leading-none">${item.subtotal.toFixed(2)}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1">Importe</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── TOTALS ── */}
                        <div className="rounded-2xl bg-slate-950 dark:bg-slate-950 p-4 border border-white/10 space-y-2">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[8px] font-black text-slate-300/70 uppercase tracking-[0.25em]">Total cobrado</p>
                                    <p className="text-[28px] font-black text-white tabular-nums tracking-tight leading-none">${sale.total.toFixed(2)}</p>
                                </div>
                                <div className={`px-2.5 py-1.5 rounded-xl border ${method.bg} bg-white/5`}>
                                    <p className="text-[7px] font-black text-slate-300/70 uppercase tracking-widest">Pago</p>
                                    <p className={`text-[10px] font-black ${method.color} flex items-center gap-1.5 justify-end`}>{method.icon}<span>{method.label}</span></p>
                                </div>
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex justify-between text-[9px] font-medium text-white/40 uppercase tracking-wider">
                                <span>Subtotal</span>
                                <span className="tabular-nums">${sale.total.toFixed(2)}</span>
                            </div>

                            {sale.paymentMethod === "efectivo" && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-2">Calculadora de Cambio</p>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="number" 
                                            placeholder="Pago con..."
                                            value={calcReceived}
                                            onChange={e => setCalcReceived(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-bold placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        {[20, 50, 100, 200, 500].map(amt => (
                                            <button 
                                                key={amt} 
                                                onClick={() => setCalcReceived(amt.toString())}
                                                className="px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/70 transition-colors border border-white/5"
                                            >
                                                ${amt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Cambio a entregar</span>
                                        <span className="text-[16px] font-black text-emerald-400 tabular-nums">
                                            ${Math.max(0, (parseFloat(calcReceived) || 0) - sale.total).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="px-4 pt-3 pb-4 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                            <span className="text-[7px] font-bold text-gray-300 dark:text-slate-600 uppercase tracking-[0.15em] whitespace-nowrap">
                                ✦ Gracias por su preferencia ✦
                            </span>
                            <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handlePrint}
                                disabled={printing}
                                className="group flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                            >
                                <Printer className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                {printing ? "Imprimiendo…" : "Reimprimir"}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-200 active:scale-95"
                            >
                                <X className="w-3.5 h-3.5" />
                                Nueva Venta
                            </button>
                        </div>

                        {/* QZ Tray Status */}
                        <div className={`flex items-center justify-center gap-1.5 pt-2 ${qzStatus === 'connected' ? 'text-emerald-500' : qzStatus === 'disconnected' ? 'text-amber-400' : 'text-gray-400'}`}>
                            {qzStatus === 'connected' ? (
                                <Wifi className="w-3 h-3" />
                            ) : qzStatus === 'disconnected' ? (
                                <WifiOff className="w-3 h-3" />
                            ) : null}
                            <span className="text-[8px] font-bold uppercase tracking-widest">
                                {qzStatus === 'connected' ? 'QZ Tray · Impresión directa' : qzStatus === 'disconnected' ? 'QZ Tray no detectado · Impresión con diálogo' : 'Verificando QZ Tray...'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
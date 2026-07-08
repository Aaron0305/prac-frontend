"use client";
// ============================================
// COMPONENT: PaymentModal — Cobro y cambio
// ============================================
import { useState } from "react";
import { X, CreditCard, Banknote, ArrowRightLeft, Check } from "lucide-react";
import { PaymentMethod } from "../../types/pos.types";

interface Props {
    total: number;
    onConfirm: (amountPaid: number, method: PaymentMethod) => void;
    onClose: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: "efectivo", label: "Efectivo", icon: <Banknote className="w-5 h-5" /> },
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export default function PaymentModal({ total, onConfirm, onClose }: Props) {
    const [method, setMethod] = useState<PaymentMethod>("efectivo");
    const [amountInput, setAmountInput] = useState("");

    const amountPaid = parseFloat(amountInput) || 0;
    const change = amountPaid - total;
    const isEnough = method !== "efectivo" || amountPaid >= total;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#1a3a6e] to-[#2b5797]">
                    <div>
                        <h2 className="text-xl font-black text-white">Cobrar</h2>
                        <p className="text-blue-100 text-sm">Total a pagar</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-white">${total.toFixed(2)}</p>
                        <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors mt-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Método de pago */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                            Método de pago
                        </label>
                        <div className="flex gap-2">
                            {PAYMENT_METHODS.map(pm => (
                                <button
                                    key={pm.id}
                                    onClick={() => setMethod(pm.id)}
                                    className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 transition-all duration-200 w-full ${
                                        method === pm.id
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                            : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                                    }`}
                                >
                                    {pm.icon}
                                    <span className="text-sm font-bold">{pm.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Monto recibido (solo efectivo) */}
                    {method === "efectivo" && (
                        <div>
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                Monto recibido
                            </label>
                            <input
                                type="number"
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                                placeholder="0.00"
                                className="w-full text-center text-2xl font-bold py-3 rounded-xl border-2 transition-all
                                           bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600
                                           text-gray-900 dark:text-white
                                           focus:outline-none focus:border-blue-500"
                                autoFocus
                            />

                            {/* Montos rápidos */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {QUICK_AMOUNTS.map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setAmountInput(String(a))}
                                        className={`flex-1 min-w-[4rem] py-1.5 text-sm rounded-lg border transition-all ${
                                            amountInput === String(a)
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-blue-400"
                                        }`}
                                    >
                                        ${a}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setAmountInput(total.toFixed(2))}
                                    className={`flex-1 min-w-[4rem] py-1.5 text-sm rounded-lg border transition-all font-medium ${
                                        amountInput === total.toFixed(2)
                                            ? "bg-green-600 text-white border-green-600"
                                            : "border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                                    }`}
                                >
                                    Exacto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Cambio */}
                    {method === "efectivo" && amountPaid > 0 && (
                        <div className={`flex justify-between items-center py-3 px-4 rounded-xl border ${
                            change >= 0
                                ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20"
                                : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                        }`}>
                            <span className={`text-sm font-semibold ${change >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                                {change >= 0 ? "💰 Cambio:" : "⚠️ Falta:"}
                            </span>
                            <span className={`text-xl font-black ${change >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                                ${Math.abs(change).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Botón confirmar */}
                    <button
                        onClick={() => isEnough && onConfirm(method === "efectivo" ? amountPaid : total, method)}
                        disabled={!isEnough}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg
                                   hover:from-green-600 hover:to-emerald-700 transition-all duration-200
                                   shadow-lg shadow-green-500/25 hover:shadow-green-500/40
                                   disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]
                                   flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Confirmar venta
                    </button>
                </div>
            </div>
        </div>
    );
}

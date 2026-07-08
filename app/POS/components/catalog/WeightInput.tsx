"use client";
// ============================================
// COMPONENT: WeightInput — Input para productos a granel
// ============================================
import { useState, useEffect } from "react";
import { Scale, DollarSign } from "lucide-react";

interface Props {
    unit: "g50" | "g100";
    onConfirm: (quantity: number) => void;
    onCancel: () => void;
    productName: string;
    pricePerUnit: number;
}

export default function WeightInput({ unit, onConfirm, onCancel, productName, pricePerUnit }: Props) {
    const [mode, setMode] = useState<"weight" | "money">("weight");
    const [value, setValue] = useState("");

    const numValue = parseFloat(value) || 0;
    
    // Cálculo bidireccional
    const computedQuantity = mode === "weight" ? numValue : (numValue / pricePerUnit);
    const computedPrice = mode === "weight" ? (numValue * pricePerUnit) : numValue;

    const weightPresets = [50, 100, 200, 250, 500, 1000];
        
    const moneyPresets = [10, 20, 50, 100];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{productName}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${pricePerUnit.toFixed(2)} / {unit}
                        </p>
                    </div>
                </div>

                {/* Selector de Modo */}
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                    <button
                        onClick={() => { setMode("weight"); setValue(""); }}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                            mode === "weight" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500"
                        }`}
                    >
                        <Scale className="w-4 h-4" /> Por Gramos
                    </button>
                    <button
                        onClick={() => { setMode("money"); setValue(""); }}
                        className={`flex-1 py-1.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                            mode === "money" ? "bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400" : "text-gray-500"
                        }`}
                    >
                        <DollarSign className="w-4 h-4" /> Por Dinero
                    </button>
                </div>

                {/* Input */}
                <div className="relative mb-4">
                    <input
                        type="number"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step={mode === "money" ? "10" : "50"}
                        className={`w-full text-center text-3xl font-bold py-4 px-4 rounded-xl border-2 transition-all
                                   bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600
                                   text-gray-900 dark:text-white
                                   focus:outline-none ${mode === "money" ? "focus:border-green-500" : "focus:border-blue-500"}`}
                        autoFocus
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-2xl font-semibold">
                        {mode === "money" ? "$" : ""}
                    </span>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg font-semibold">
                        {mode === "weight" ? unit : "MXN"}
                    </span>
                </div>

                {/* Presets */}
                <div className={`grid gap-2 mb-4 ${mode === "money" ? "grid-cols-4" : "grid-cols-3"}`}>
                    {(mode === "weight" ? weightPresets : moneyPresets).map(p => (
                        <button
                            key={p}
                            onClick={() => setValue(String(p))}
                            className={`py-2 px-1 rounded-lg text-sm font-bold border transition-all duration-150
                                ${value === String(p)
                                    ? (mode === "money" ? "bg-green-600 text-white border-green-600" : "bg-blue-600 text-white border-blue-600")
                                    : "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                                }`}
                        >
                            {mode === "money" ? "$" : ""}{p} {mode === "weight" ? unit : ""}
                        </button>
                    ))}
                </div>

                {/* Subtotal Informativo */}
                {numValue > 0 && (
                    <div className="flex flex-col gap-1 py-3 px-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 mb-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-600/70 dark:text-blue-400/70 font-semibold text-xs tracking-wider uppercase">Equivale a:</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">
                                {mode === "money" 
                                    ? `${computedQuantity.toFixed(0)} g` 
                                    : `$${computedPrice.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">A Cobrar:</span>
                            <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                                ${computedPrice.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Acciones */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => { if (numValue > 0) onConfirm(computedQuantity); }}
                        disabled={numValue <= 0}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        </div>
    );
}

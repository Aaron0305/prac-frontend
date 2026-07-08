// ============================================
// UTILS: calculations.ts — Cálculos del POS
// ============================================

/** Formatea un número como moneda mexicana */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    }).format(amount);
}

/** Calcula el cambio */
export function calcChange(amountPaid: number, total: number): number {
    return Math.max(0, amountPaid - total);
}

/** Calcula precio por peso (g → precio por kg) */
export function calcWeightPrice(pricePerKg: number, grams: number): number {
    return (pricePerKg / 1000) * grams;
}

/** Formatea la fecha en formato legible */
export function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Genera un folio de ticket */
export function generateFolio(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Date.now().toString().slice(-4)}`;
}

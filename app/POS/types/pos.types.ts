// ============================================
// TIPOS DEL POS — Tiendita
// ============================================

export type ProductCategory = "granel" | "dulces" | "galletas" | "cafe" | "bebidas" | "snack" | "comida_rapida" | "otros";

export type UnitType = "g50" | "g100" | "lt" | "pieza" | "porcion";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta";

export interface Product {
    id: string;
    name: string;
    category: ProductCategory;
    price: number;          // precio base por unidad/kg/etc.
    unit: UnitType;
    stock: number;
    emoji?: string;         // emoji (legacy/fallback)
    iconId?: string;        // react-icons icon ID (preferido)
    barcode?: string;       // código de barras (EAN-13, UPC, etc.)
    imageUrl?: string;
    isActive: boolean;


    costPrice?: number;
    profitMargin?: number;
    createdAt?: string;
}

export interface CartItem {
    product: Product;
    quantity: number;       // cantidad o peso ingresado
    subtotal: number;       // price × quantity
}

export interface Sale {
    id: string;
    items: CartItem[];
    total: number;
    amountPaid: number;
    change: number;
    paymentMethod: PaymentMethod;
    cashierName: string;
    createdAt: string;
    folio?: string;
    notes?: string;
}

export interface CartState {
    items: CartItem[];
    total: number;
    itemCount: number;
}

export interface ProductFormData {
    name: string;
    category: ProductCategory;
    price: string;
    unit: UnitType;
    stock: string;
    emoji: string;
    iconId: string;         // id del ícono react-icons
    barcode: string;        // código de barras manual o escaneado

    costPrice: string;
    profitMargin: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
    granel: "Granel",
    dulces: "Dulces",
    galletas: "Galletas y Pan Dulce",
    cafe: "Café y Frappés",
    bebidas: "Refrescos y Bebidas Frías",
    snack: "Snacks y Frituras",
    comida_rapida: "Comida (Sándwich, Maruchan)",
    otros: "Otros / Papelería Básica",
};

export const CATEGORY_EMOJIS: Record<ProductCategory, string> = {
    granel: "⚖️",
    dulces: "🍬",
    galletas: "🍪",
    cafe: "☕",
    bebidas: "🥤",
    snack: "🍿",
    comida_rapida: "🥪",
    otros: "🎒",
};

export const UNIT_LABELS: Record<UnitType, string> = {
    g50: "por 50g",
    g100: "por 100g",
    lt: "por litro",
    pieza: "por pieza",
    porcion: "por porción",
};

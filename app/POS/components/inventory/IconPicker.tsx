"use client";
// ============================================
// COMPONENT: IconPicker
// Librerías: Tabler (tb), Font Awesome (fa), Material (md), Phosphor (pi)
// ============================================

import { useState } from "react";
import { Search, X } from "lucide-react";

// ── Tabler Icons (tb) ────────────────────────────────────────────────────────
import {
    TbCoffee, TbCup, TbBread, TbSalad,
    TbMilk, TbBeer, TbIceCream2, TbCandy,
    TbLemon, TbApple, TbGlass, TbSpray,
    TbBottle, TbPackage, TbBox, TbTag,
    TbBuildingStore, TbStar, TbFlame, TbDroplet,
    TbPlant2, TbCarrot, TbGrain, TbEgg, TbChefHat,
    TbShoppingCart, TbToolsKitchen2, TbPepperOff,
    TbBrush, TbWashMachine, TbCheese, TbSoup, TbSalt, TbLollipop,
} from "react-icons/tb";

// ── Font Awesome (fa) ─────────────────────────────────────────────────────────
import {
    FaAppleAlt, FaCarrot, FaBreadSlice, FaCandyCane,
    FaCoffee, FaWineBottle, FaEgg,
    FaCheese, FaPizzaSlice, FaHamburger, FaHotdog,
    FaIceCream, FaLeaf, FaShoppingBasket, FaBox,
    FaPepperHot, FaCookie, FaCookieBite, FaMugHot, FaStroopwafel,
    FaBirthdayCake, FaUtensils, FaGlassMartini, FaMugHot as FaMugHot2
} from "react-icons/fa";

// ── Material Design (md) ──────────────────────────────────────────────────────
import {
    MdLocalGroceryStore, MdLocalCafe, MdOutlineFreeBreakfast,
    MdCleaningServices, MdSoap, MdIcecream, MdLunchDining,
    MdBlender, MdKitchen, MdFastfood, MdLocalPizza, MdLocalDrink, MdCake,
    MdRestaurant, MdLocalDining, MdLocalBar,
} from "react-icons/md";

// ── Phosphor Icons (pi) ───────────────────────────────────────────────────────
import {
    PiBowlFood, PiCoffee, PiOrange, PiCookingPot,
    PiBeerBottle, PiWine, PiStorefront, PiBroom,
    PiHandSoap, PiFirstAid, PiBandaids, PiPill,
    PiCookie, PiLeaf, PiCake, PiHamburger, PiPopcorn
} from "react-icons/pi";

// ─────────────────────────────────────────────────────────────────────────────

export interface PosIcon {
    id: string;
    label: string;
    component: React.ComponentType<{ size?: number; className?: string }>;
}

export const POS_ICON_GROUPS: { group: string; icons: PosIcon[] }[] = [
    {
        group: "☕ Café",
        icons: [
            { id: "tb-coffee",      label: "Café",            component: TbCoffee },
            { id: "tb-cup",         label: "Taza",            component: TbCup },
            { id: "pi-coffee",      label: "Café Phosphor",   component: PiCoffee },
            { id: "tb-pepper",      label: "Especias",        component: TbPepperOff },
            { id: "fa-coffee",      label: "Café FA",         component: FaCoffee },
            { id: "md-cafe",        label: "Café MD",         component: MdLocalCafe },
            { id: "md-breakfast",   label: "Desayuno",        component: MdOutlineFreeBreakfast },
            { id: "fa-mug-hot",     label: "Taza Caliente",   component: FaMugHot },
        ],
    },
    {
        group: "🥛 Lácteos",
        icons: [
            { id: "tb-milk",        label: "Leche",           component: TbMilk },
            { id: "fa-cheese",      label: "Queso",           component: FaCheese },
            { id: "tb-cheese",      label: "Queso/Rebanada",  component: TbCheese },
            { id: "tb-egg",         label: "Huevo",           component: TbEgg },
            { id: "fa-egg",         label: "Huevo FA",        component: FaEgg },
            { id: "tb-ice",         label: "Helado",          component: TbIceCream2 },
            { id: "md-icecream",    label: "Helado MD",       component: MdIcecream },
            { id: "fa-ice",         label: "Helado FA",       component: FaIceCream },
        ],
    },
    {
        group: "🌾 Abarrotes",
        icons: [
            { id: "tb-grain",       label: "Granos/Arroz",    component: TbGrain },
            { id: "tb-carrot",      label: "Zanahoria",       component: TbCarrot },
            { id: "fa-carrot",      label: "Verdura",         component: FaCarrot },
            { id: "tb-salad",       label: "Verduras",        component: TbSalad },
            { id: "tb-lemon",       label: "Limón",           component: TbLemon },
            { id: "pi-orange",      label: "Naranja/Cítrico", component: PiOrange },
            { id: "tb-apple",       label: "Manzana",         component: TbApple },
            { id: "fa-apple",       label: "Fruta",           component: FaAppleAlt },
            { id: "fa-leaf",        label: "Hoja/Hierbas",    component: FaLeaf },
            { id: "tb-plant",       label: "Planta",          component: TbPlant2 },
            { id: "pi-leaf",        label: "Verde",           component: PiLeaf },
            { id: "fa-pepper",      label: "Chile",           component: FaPepperHot },
        ],
    },
    {
        group: "🍞 Pan / Tortillas",
        icons: [
            { id: "tb-bread",       label: "Pan",             component: TbBread },
            { id: "fa-bread",       label: "Rebanada",        component: FaBreadSlice },
        ],
    },
    {
        group: "🥪 Comidas Rápidas",
        icons: [
            { id: "fa-hamburger",   label: "Hamburguesa",     component: FaHamburger },
            { id: "pi-hamburger",   label: "Burger Phosphor", component: PiHamburger },
            { id: "fa-hotdog",      label: "Hotdog",          component: FaHotdog },
            { id: "fa-pizza",       label: "Pizza",           component: FaPizzaSlice },
            { id: "md-pizza",       label: "Pizza MD",        component: MdLocalPizza },
            { id: "md-fastfood",    label: "Comida Rápida",   component: MdFastfood },
            { id: "md-lunch",       label: "Lunch/Sándwich",  component: MdLunchDining },
            { id: "pi-bowl",        label: "Ensalada/Tazón",  component: PiBowlFood },
            { id: "tb-soup",        label: "Sopa",            component: TbSoup },
            { id: "fa-utensils",    label: "Cubiertos",       component: FaUtensils },
            { id: "md-dining",      label: "Comedor",         component: MdLocalDining },
        ],
    },
    {
        group: "🥤 Bebidas Frias",
        icons: [
            { id: "md-drink",       label: "Refresco/Vaso",   component: MdLocalDrink },
            { id: "tb-droplet",     label: "Agua",            component: TbDroplet },
            { id: "pi-bottle",      label: "Botella",         component: PiBeerBottle },
            { id: "tb-bottle",      label: "Botella Tabler",  component: TbBottle },
            { id: "tb-beer",        label: "Bebida/Cerveza",  component: TbBeer },
            { id: "fa-wine",        label: "Energizante/Vino",component: FaWineBottle },
            { id: "tb-glass",       label: "Vaso de jugo",    component: TbGlass },
            { id: "pi-wine",        label: "Copa/Frappé",     component: PiWine },
            { id: "fa-martini",     label: "Bebida Preparada",component: FaGlassMartini },
            { id: "md-bar",         label: "Barra Bebidas",   component: MdLocalBar },
        ],
    },
    {
        group: "🍬 Snacks / Dulces",
        icons: [
            { id: "fa-cookie",      label: "Galleta",         component: FaCookie },
            { id: "fa-cookie-bite", label: "Galleta Mordida", component: FaCookieBite },
            { id: "fa-stroop",      label: "Waffle/Galleta",  component: FaStroopwafel },
            { id: "pi-cookie",      label: "Galleta Blanca",  component: PiCookie },
            { id: "pi-popcorn",     label: "Palomitas",       component: PiPopcorn },
            { id: "fa-candy",       label: "Dulce/Bastón",    component: FaCandyCane },
            { id: "tb-candy",       label: "Caramelo Menta",  component: TbCandy },
            { id: "tb-lollipop",    label: "Paleta/Caramelo", component: TbLollipop },
            { id: "md-cake",        label: "Pastelito",       component: MdCake },
            { id: "pi-cake",        label: "Pastel Phosphor", component: PiCake },
            { id: "fa-birthday",    label: "Pastel Cumple",   component: FaBirthdayCake },
        ],
    },
    {
        group: "📦 General",
        icons: [
            { id: "tb-package",     label: "Paquete",         component: TbPackage },
            { id: "tb-box",         label: "Caja Tabler",     component: TbBox },
            { id: "fa-box",         label: "Caja FA",         component: FaBox },
            { id: "tb-tag",         label: "Etiqueta",        component: TbTag },
            { id: "tb-store",       label: "Tienda Tabler",   component: TbBuildingStore },
            { id: "md-store",       label: "Tienda MD",       component: MdLocalGroceryStore },
            { id: "pi-store",       label: "Negocio",         component: PiStorefront },
            { id: "fa-basket",      label: "Canasta",         component: FaShoppingBasket },
            { id: "tb-cart",        label: "Carrito",         component: TbShoppingCart },
            { id: "tb-star",        label: "Favorito",        component: TbStar },
            { id: "tb-flame",       label: "Oferta/Hot",      component: TbFlame },
        ],
    },
];

// ── Render utilty ─────────────────────────────────────────────────────────────
export function renderPosIcon(iconId: string, size = 20, className = "") {
    for (const group of POS_ICON_GROUPS) {
        const found = group.icons.find(i => i.id === iconId);
        if (found) {
            const Icon = found.component;
            return <Icon size={size} className={className} />;
        }
    }
    return <TbPackage size={size} className={className} />;
}

// ── PICKER MODAL ─────────────────────────────────────────────────────────────
interface PickerProps {
    selected: string;
    onSelect: (iconId: string) => void;
    onClose: () => void;
}

export function IconPickerModal({ selected, onSelect, onClose }: PickerProps) {
    const [search, setSearch] = useState("");
    const [activeGroup, setActiveGroup] = useState(POS_ICON_GROUPS[0].group);

    const filteredGroups = search.trim()
        ? [{
            group: "Resultados",
            icons: POS_ICON_GROUPS.flatMap(g => g.icons).filter(i =>
                i.label.toLowerCase().includes(search.toLowerCase())
            ),
          }]
        : POS_ICON_GROUPS;

    const displayGroup = filteredGroups.find(g => g.group === activeGroup) ?? filteredGroups[0];

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border-color)", maxHeight: "80vh" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <h3 className="font-black text-base" style={{ color: "var(--text-primary)" }}>
                        Seleccionar ícono
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        style={{ color: "var(--text-tertiary)" }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar ícono... ej: café, leche, carne"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            style={{
                                background: "var(--surface-alt)",
                                border: "1px solid var(--border-color)",
                                color: "var(--text-primary)",
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar de grupos */}
                    {!search && (
                        <div className="w-36 flex-shrink-0 overflow-y-auto py-2" style={{ borderRight: "1px solid var(--border-color)" }}>
                            {POS_ICON_GROUPS.map(g => (
                                <button
                                    key={g.group}
                                    onClick={() => setActiveGroup(g.group)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold transition-colors"
                                    style={{
                                        color: activeGroup === g.group ? "rgb(139 92 246)" : "var(--text-secondary)",
                                        background: activeGroup === g.group ? "rgb(139 92 246 / 0.1)" : "transparent",
                                    }}
                                >
                                    {g.group}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Grid de íconos */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-5 gap-2">
                            {(displayGroup?.icons ?? []).map(icon => {
                                const Icon = icon.component;
                                const isSelected = selected === icon.id;
                                return (
                                    <button
                                        key={icon.id}
                                        onClick={() => { onSelect(icon.id); onClose(); }}
                                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-150 hover:scale-105"
                                        style={{
                                            background: isSelected ? "rgb(139 92 246 / 0.15)" : "var(--surface-alt)",
                                            border: `2px solid ${isSelected ? "rgb(139 92 246)" : "transparent"}`,
                                            color: isSelected ? "rgb(139 92 246)" : "var(--text-secondary)",
                                        }}
                                        title={icon.label}
                                    >
                                        <Icon size={22} />
                                        <span className="text-[9px] leading-tight text-center line-clamp-1 w-full" style={{ color: "var(--text-tertiary)" }}>
                                            {icon.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

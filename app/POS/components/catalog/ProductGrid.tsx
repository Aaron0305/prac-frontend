"use client";
// ============================================
// COMPONENT: ProductGrid
// ============================================
import { useState, useEffect } from "react";
import { PackageSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../../types/pos.types";
import ProductCard from "./ProductCard";

interface Props {
    products: Product[];
    onAdd: (product: Product, quantity: number) => void;
}

export default function ProductGrid({ products, onAdd }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12; // 12 fits better in grid (3x4 or 4x3)

    useEffect(() => {
        setCurrentPage(1);
    }, [products.length]);

    const totalPages = Math.ceil(products.length / itemsPerPage);
    const visibleCount = currentPage * itemsPerPage;
    const paginated = products.slice(0, visibleCount);

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center">
                <PackageSearch className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Sin productos</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Prueba con otra búsqueda o categoría</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginated.map(product => (
                    <ProductCard key={product.id} product={product} onAdd={onAdd} />
                ))}
            </div>

            {visibleCount < products.length && (
                <div className="flex justify-center mt-2 relative z-20">
                    <button 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-6 py-2.5 rounded-xl border-2 border-transparent bg-white dark:bg-slate-800 shadow-md hover:shadow-lg text-[var(--brand-blue-medium)] hover:text-[var(--brand-blue-dark)] hover:border-[var(--brand-blue-light)] transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
                    >
                        Cargar más productos...
                    </button>
                </div>
            )}
        </div>
    );
}

import React, { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import ProductCard from '../product/ProductCard';

interface HomeProductRowProps {
  /** Petit label en éyebrow (ex: "CATÉGORIE"). */
  eyebrow?: string;
  title: string;
  icon?: React.ReactNode;
  products: Product[];
  onViewAll: () => void;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  /** Réduit la marge haute (1re rangée, juste sous le Hero raccourci). */
  tightTop?: boolean;
}

/**
 * Rangée produit de l'accueil : éyebrow + titre + « Voir tout », puis carrousel horizontal
 * de cartes (défile, snap). Ne rend rien si aucun produit — évite les sections vides.
 */
const HomeProductRow: React.FC<HomeProductRowProps> = ({
  eyebrow,
  title,
  icon,
  products,
  onViewAll,
  onAddToCart,
  onProductClick,
  tightTop = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!products.length) return null;

  return (
    <section
      className={`relative z-10 w-full max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8 ${
        tightTop ? 'mt-2 md:mt-3' : 'mt-8 md:mt-12'
      }`}
    >
      {/* Bandeau d'en-tête (card pleine largeur de section) - Version Premium */}
      <div className="relative overflow-hidden flex items-center justify-between gap-4 mb-4 md:mb-5 rounded-xl border border-xeption-gold/20 bg-[#0a0a0c]/60 backdrop-blur-xl px-4 md:px-6 py-4 md:py-5 shadow-[0_0_30px_rgba(255,215,0,0.15)] group transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(255,215,0,0.25)]">
        
        {/* Ligne lumineuse au sommet pour le côté "bijou" */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/50 to-transparent opacity-60"></div>
        
        {/* Halo doré dynamique au survol */}
        <div className="absolute inset-0 bg-gradient-to-r from-xeption-gold/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

        <div className="min-w-0 relative z-10">
          {eyebrow && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-[2px] w-6 bg-xeption-gold shadow-[0_0_10px_#ffd700]" />
              <span className="text-[10px] font-tech font-bold uppercase tracking-[0.2em] text-xeption-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
                {eyebrow}
              </span>
            </div>
          )}
          <h2 className="flex items-center gap-3 text-2xl md:text-3xl font-bold font-tech uppercase text-white tracking-wide truncate drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
            {icon && (
               <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-110">{icon}</span>
            )}
            {title}
          </h2>
        </div>
        <div className="shrink-0 flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Produits précédents"
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-xeption-gold hover:text-black hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:border-xeption-gold transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Produits suivants"
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-xeption-gold hover:text-black hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:border-xeption-gold transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onViewAll}
            className="group inline-flex items-center gap-1.5 px-3 py-2 ml-1 rounded-md text-[11px] md:text-xs font-tech font-bold uppercase tracking-wider text-white/80 hover:text-xeption-gold transition-colors whitespace-nowrap"
          >
            Voir tout
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 group-hover:text-xeption-gold transition-all" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-3 md:gap-4 overflow-x-auto pb-2 snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="shrink-0 snap-start w-[calc((100%-0.75rem)/2)] md:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]"
          >
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onProductClick={onProductClick}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeProductRow;

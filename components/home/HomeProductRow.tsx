import React, { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import ProductCard from '../product/ProductCard';

interface HomeProductRowProps {
  /** Petit label en éyebrow (ex: "CATÉGORIE"). */
  eyebrow?: string;
  title: string;
  /** Titre court sur mobile si le libellé complet risque de déborder. */
  mobileTitle?: string;
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
  mobileTitle,
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
      <div className="relative overflow-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4 md:mb-5 rounded-xl border border-xeption-gold/20 bg-[#0a0a0c]/60 backdrop-blur-xl px-4 md:px-6 py-4 md:py-5 shadow-[0_0_30px_rgba(255,215,0,0.15)] group transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(255,215,0,0.25)]">
        
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
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl sm:text-2xl md:text-3xl font-bold font-tech uppercase text-white tracking-wide leading-snug drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
            {icon && (
               <span className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-110 shrink-0">{icon}</span>
            )}
            <span className="min-w-0 break-words">
              <span className="sm:hidden">{mobileTitle ?? title}</span>
              <span className="hidden sm:inline">{title}</span>
            </span>
          </h2>
        </div>
        <div className="shrink-0 flex items-center gap-2 relative z-10 self-end sm:self-auto">
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

      <div className="relative">
        <div
          ref={trackRef}
          className="home-product-row-scroll flex gap-3 md:gap-4 overflow-x-auto overscroll-x-contain pb-3 md:pb-2 snap-x snap-mandatory scroll-smooth md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="shrink-0 snap-start w-[calc((100%-1.5rem)/2.5)] md:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]"
            >
              <ProductCard
                product={product}
                onAddToCart={onAddToCart}
                onProductClick={onProductClick}
              />
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-black/80 to-transparent md:hidden"
          aria-hidden
        />
      </div>

      <style>{`
        .home-product-row-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 215, 0, 0.45) rgba(255, 255, 255, 0.08);
        }
        .home-product-row-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .home-product-row-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
        }
        .home-product-row-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.45);
          border-radius: 9999px;
        }
        @media (min-width: 768px) {
          .home-product-row-scroll {
            scrollbar-width: none;
          }
        }
      `}</style>
    </section>
  );
};

export default HomeProductRow;

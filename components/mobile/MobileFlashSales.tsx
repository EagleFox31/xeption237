import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import { getProductSlug } from '../../utils/slug';
import { getProductDisplayName } from '../../utils/productDisplay';
import { optimizeImage } from '../../utils/mediaOptimization';
import ProductCardImage from '../common/ProductCardImage';

export interface MobileFlashSalesProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  title?: string;
  viewAllRoute?: string;
  viewAllLabel?: string;
  mode?: 'promo' | 'category';
  className?: string;
}

export const MobileFlashSales: React.FC<MobileFlashSalesProps> = ({
  products,
  onAddToCart,
  title = 'Ventes Flash',
  viewAllRoute,
  viewAllLabel,
  mode = 'promo',
  className = '',
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // En mode promo : prioriser les réductions réelles et vedettes
  // En mode category : afficher directement les produits de la catégorie
  const displayList = mode === 'promo'
    ? products
        .filter((p) => p.isPromo || (p.oldPrice && p.oldPrice > p.price))
        .concat(products.filter((p) => p.isFeatured && !p.isPromo))
        .slice(0, 10)
    : products.slice(0, 10);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -180 : 180;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const getDiscountBadge = (product: Product): { label: string; color: string } | null => {
    if (product.oldPrice && product.oldPrice > product.price) {
      const discount = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      return { label: `-${discount}%`, color: 'bg-red-500 text-white' };
    }
    if (mode === 'promo' && product.isPromo) {
      return { label: 'PROMO', color: 'bg-red-500 text-white' };
    }
    if (product.condition === 'refurbished') {
      return { label: 'Occasion certifiée', color: 'bg-zinc-800 text-amber-300 border border-amber-400/40' };
    }
    return null;
  };

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  if (displayList.length === 0) {
    return null;
  }

  return (
    <section className={`py-2 w-full ${className}`}>
      {/* En-tête : Titre + lien Voir Tout + flèches < > */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h3 className="text-white font-tech font-bold text-base tracking-wide flex items-center gap-1.5">
          {title}
        </h3>

        <div className="flex items-center space-x-2">
          {viewAllRoute && (
            <button
              type="button"
              onClick={() => navigate(viewAllRoute)}
              className="text-[11px] font-tech font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 uppercase tracking-wider transition-colors active:scale-95"
            >
              <span>{viewAllLabel || 'Voir tout'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="p-1 text-zinc-500 hover:text-white transition-colors active:scale-90"
              aria-label="Faire défiler vers la gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="p-1 text-zinc-500 hover:text-white transition-colors active:scale-90"
              aria-label="Faire défiler vers la droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carrousel horizontal de cartes de produits */}
      <div
        ref={scrollRef}
        className="flex space-x-3 overflow-x-auto px-4 pb-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
      >
        {displayList.map((product) => {
          const badge = getDiscountBadge(product);
          const displayName = getProductDisplayName(product);
          const slug = getProductSlug(product);

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${slug}`)}
              className="w-[150px] sm:w-[160px] shrink-0 bg-[#121214] border border-zinc-800/80 rounded-2xl p-2 flex flex-col justify-between shadow-lg cursor-pointer hover:border-zinc-700 active:scale-[0.98] transition-all snap-start"
            >
              {/* Vignette carrée blanche mettant en valeur le produit (conforme maquette) */}
              <div className="w-full aspect-square bg-white rounded-xl relative p-2 flex items-center justify-center overflow-hidden">
                {/* Badge contextuel (réduction réelle ou occasion certifiée) */}
                {badge && (
                  <span className={`absolute top-1.5 left-1.5 ${badge.color} text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none z-10 uppercase tracking-tight`}>
                    {badge.label}
                  </span>
                )}

                {/* Photo du produit optimisée avec LQIP flou et lazy loading */}
                <ProductCardImage
                  src={optimizeImage(product.image, 240)}
                  alt={displayName}
                  width={240}
                  height={240}
                  sizes="160px"
                  loading="lazy"
                  placeholderClassName="bg-white/80"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logos/apple.svg';
                  }}
                />

                {/* Bouton circulaire noir d'ajout rapide sur l'image */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className="w-6 h-6 rounded-full bg-black/90 hover:bg-black text-white flex items-center justify-center absolute bottom-1.5 right-1.5 shadow-md active:scale-90 transition-transform"
                  aria-label={`Ajouter ${displayName} au panier`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ligne inférieure : Prix formaté en FCFA + bouton or */}
              <div className="mt-2.5 pt-1 flex items-center justify-between gap-1">
                <span className="font-tech text-white text-xs font-bold truncate">
                  {formatPrice(product.price)}
                </span>

                {/* Bouton carré or avec caddie */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className="w-7 h-7 shrink-0 rounded-lg bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.4)] active:scale-90 transition-transform"
                  aria-label={`Acheter ${displayName}`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MobileFlashSales;

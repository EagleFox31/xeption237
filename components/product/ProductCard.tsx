import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../../types';
import { optimizeImage } from '../../utils/mediaOptimization';
import { getProductDisplayName, normalizeSamsungGalaxySpelling } from '../../utils/productDisplay';
import { ProductBadgeChips } from './ProductBadgeChips';
import ProductCardImage from '../common/ProductCardImage';
import { productSpecSummary } from '../../utils/productSpecSummary';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

/**
 * Carte produit standard (dark premium). Source unique partagée par la grille boutique
 * (ProductList) et les rangées de l'accueil (HomeProductRow) → aspect strictement identique.
 * Remplit la largeur de son conteneur (grille ou item de carrousel à largeur fixe).
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onProductClick }) => (
  <div
    className="group relative h-full bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-xeption-gold/50 transition-all duration-300 flex flex-col overflow-hidden hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:-translate-y-1 cursor-pointer rounded-lg"
    onClick={() => onProductClick && onProductClick(product)}
  >
    {product.isPromo && (
      <div className="absolute top-2 right-2 z-20 animate-pulse-slow">
        <div className="bg-red-600 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,0,0.6)] rounded-sm border border-red-400">
          Promo
        </div>
      </div>
    )}

    <div className="relative aspect-square overflow-hidden border-b border-white/5 bg-[#09090b]">
      <ProductCardImage
        src={optimizeImage(product.image, 560)}
        alt={`${getProductDisplayName(product)} Cameroun`}
        width={560}
        height={560}
        placeholderClassName="bg-white/[0.04]"
        className="absolute inset-0 w-full h-full object-contain object-center motion-safe:group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)] opacity-50 pointer-events-none" />
    </div>

    <div className="p-2 md:p-3 flex-1 flex flex-col relative">
      <div className="mb-1">
        <h3 className="text-sm md:text-base font-bold text-white font-tech uppercase tracking-wide group-hover:text-xeption-gold transition-colors truncate drop-shadow-md">
          {getProductDisplayName(product)}
        </h3>
        <ProductBadgeChips product={product} size="sm" theme="dark" className="mt-1.5" />
      </div>
      <p className="text-[10px] md:text-[11px] text-gray-300 mb-1.5 line-clamp-2 leading-snug">
        {productSpecSummary(product) || normalizeSamsungGalaxySpelling(product.description || '')}
      </p>
      {product.reviews && product.reviews.length > 0 && product.rating != null && (
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={9}
                className="text-xeption-gold"
                fill={i <= Math.round(product.rating!) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="text-[9px] text-gray-400">({product.reviews.length})</span>
        </div>
      )}
      <div className="mt-auto pt-2 border-t border-white/10">
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm md:text-lg font-bold text-white font-tech drop-shadow-md">
              {product.price.toLocaleString('fr-FR')}
            </span>
            <span className="text-[8px] md:text-[10px] text-xeption-gold font-bold uppercase">FCFA</span>
          </div>
          {product.oldPrice && product.oldPrice > product.price && (
            <>
              <span className="text-[10px] md:text-xs font-mono tabular-nums text-gray-400 line-through">
                {product.oldPrice.toLocaleString('fr-FR')}
              </span>
              <span className="text-[9px] md:text-[10px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded">
                -{Math.round((1 - product.price / product.oldPrice) * 100)}%
              </span>
            </>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-xeption-gold text-black font-tech font-bold uppercase text-[11px] md:text-xs tracking-wider py-2 md:py-2.5 rounded-md hover:bg-white transition-colors"
          aria-label={`Acheter ${getProductDisplayName(product)}`}
        >
          <ShoppingCart className="w-4 h-4" /> Acheter
        </button>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </div>
);

export default ProductCard;

import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../../types';
import { optimizeImage } from '../../utils/mediaOptimization';
import { getProductDisplayName, normalizeSamsungGalaxySpelling } from '../../utils/productDisplay';
import { ProductBadgeChips } from '../product/ProductBadgeChips';
import ProductCardImage from '../common/ProductCardImage';

interface ProductListRowProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick?: (product: Product) => void;
}

const ProductListRow: React.FC<ProductListRowProps> = ({ product, onAddToCart, onProductClick }) => (
  <div
    className="group flex gap-3 sm:gap-4 p-3 sm:p-4 bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-xeption-gold/50 rounded-lg cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(255,215,0,0.12)]"
    onClick={() => onProductClick?.(product)}
  >
    <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 bg-black/50 rounded-md border border-white/10 p-2 flex items-center justify-center overflow-hidden">
      {product.isPromo && (
        <span className="absolute top-1 right-1 z-10 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 font-tech uppercase rounded-sm">
          Promo
        </span>
      )}
      <ProductCardImage
        src={optimizeImage(product.image, 200)}
        alt={getProductDisplayName(product)}
        width={200}
        height={200}
        className="w-full h-full object-contain"
      />
    </div>

    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-bold text-white font-tech uppercase tracking-wide group-hover:text-xeption-gold transition-colors line-clamp-2">
          {getProductDisplayName(product)}
        </h3>
        <ProductBadgeChips product={product} size="sm" theme="dark" className="mt-1.5" />
        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 hidden sm:block">
          {normalizeSamsungGalaxySpelling(product.description || '')}
        </p>
        {product.reviews && product.reviews.length > 0 && product.rating != null && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={10}
                  className="text-xeption-gold"
                  fill={i <= Math.round(product.rating!) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-[9px] text-gray-500">({product.reviews.length})</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-2 shrink-0">
        <div className="text-right">
          <div className="flex items-end justify-end gap-2">
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-base sm:text-xl font-bold text-white font-tech">
                {product.price.toLocaleString('fr-FR')}
              </span>
              <span className="text-[10px] text-xeption-gold font-bold uppercase">FCFA</span>
            </div>
            {product.oldPrice ? (
              <span className="inline-flex items-baseline gap-1 shrink-0 border-l border-white/20 pl-2 text-red-400">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-tech font-bold">
                  Avant
                </span>
                <span className="text-xs sm:text-sm font-mono tabular-nums font-semibold">
                  {product.oldPrice.toLocaleString('fr-FR')}
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase font-bold">FCFA</span>
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-xeption-gold text-black text-[10px] font-tech font-bold uppercase hover:bg-white transition-colors rounded-sm"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>
    </div>
  </div>
);

export default ProductListRow;

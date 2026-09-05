import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { optimizeImage, optimizeProductThumb } from '../../utils/mediaOptimization';
import { getProductDisplayName } from '../../utils/productDisplay';
import ProductCardImage from '../common/ProductCardImage';

interface HeroProductShowcaseProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  variant: 'carousel' | 'strip';
}

const DESKTOP_SLIDE_SIZE = 3;

const HeroProductCard: React.FC<{
  product: Product;
  onProductClick?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  compact?: boolean;
  dense?: boolean;
}> = ({ product, onProductClick, onAddToCart, compact, dense }) => {
  const displayName = getProductDisplayName(product);
  return (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onProductClick?.(product)}
    onKeyDown={(e) => e.key === 'Enter' && onProductClick?.(product)}
    className={`group relative bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 hover:border-xeption-gold/40 transition-all duration-300 flex flex-col overflow-hidden rounded-lg cursor-pointer min-w-0 ${
      compact ? 'min-w-[42vw] max-w-[42vw] snap-center' : 'w-full'
    }`}
  >
    {product.isPromo && (
      <div className="absolute top-1.5 right-1.5 z-20">
        <span className="bg-red-600 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase rounded-sm border border-red-400 shadow-md shadow-red-900/50">
          Promo
        </span>
      </div>
    )}
    {product.condition === 'new' && (
      <div className="absolute top-1.5 left-1.5 z-20">
        <span className="bg-emerald-500/90 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase rounded-sm flex items-center gap-0.5 border border-emerald-400 shadow-md shadow-emerald-900/50">
          <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" /> Neuf
        </span>
      </div>
    )}
    <div
      className={`relative border-b border-white/5 overflow-hidden ${
        compact
          ? 'aspect-square bg-black/40 flex items-center justify-center p-2'
          : dense
            ? 'aspect-square bg-white'
            : 'aspect-[4/3] bg-black/40 flex items-center justify-center p-4'
      }`}
    >
      <ProductCardImage
        src={dense ? optimizeProductThumb(product.image, 400) : optimizeImage(product.image, 400)}
        alt={displayName}
        width={400}
        height={400}
        placeholderClassName={dense ? 'bg-white/80' : 'bg-black/30'}
        className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
          dense ? 'object-cover object-center' : 'object-contain'
        }`}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart(product);
        }}
        className={`absolute bottom-2 right-2 bg-xeption-gold text-black rounded-full shadow-lg opacity-90 hover:opacity-100 z-10 ${
          dense ? 'p-2' : 'p-2.5 md:p-3'
        }`}
        aria-label="Ajouter au panier"
      >
        <ShoppingCart className={dense ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>
    </div>
    <div className={dense ? 'p-2' : 'p-2.5 md:p-3'}>
      <h3
        className={`font-bold text-white font-tech uppercase tracking-wide truncate group-hover:text-xeption-gold transition-colors ${
          dense ? 'text-xs md:text-sm' : 'text-sm md:text-base'
        }`}
      >
        {displayName}
      </h3>
      <div className="flex items-baseline gap-1 mt-0.5">
        {product.oldPrice && (
          <span className="text-[9px] md:text-[11px] text-red-400 line-through font-mono">
            {product.oldPrice.toLocaleString('fr-FR')}
          </span>
        )}
        <span className={`font-bold text-white font-tech ${dense ? 'text-sm' : 'text-base md:text-lg'}`}>
          {product.price.toLocaleString('fr-FR')}
        </span>
        <span className="text-[8px] md:text-[9px] text-xeption-gold font-bold uppercase">FCFA</span>
      </div>
    </div>
  </div>
  );
};

export const TopVentesHeading: React.FC<{
  centered?: boolean;
  controls?: React.ReactNode;
  className?: string;
  dense?: boolean;
}> = ({ centered, controls, className = '', dense }) => (
  <div
    className={`flex items-end justify-between gap-2 min-w-0 ${dense ? 'mb-3' : 'mb-4'} ${
      centered ? 'text-center flex-col items-center' : ''
    } ${className}`}
  >
    <div className={`min-w-0 ${centered ? 'text-center' : ''}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${centered ? 'justify-center' : ''}`}>
        <span className="w-6 h-0.5 bg-xeption-gold shadow-[0_0_8px_rgba(255,215,0,0.6)] shrink-0" />
        <span className="text-xeption-gold font-tech font-bold tracking-[0.15em] uppercase text-[10px] md:text-xs">
          À ne pas manquer
        </span>
      </div>
      <h2
        className={`font-bold text-white font-tech uppercase leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] ${
          dense ? 'text-xl lg:text-2xl' : 'text-2xl sm:text-3xl lg:text-4xl'
        }`}
      >
        Top{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold via-yellow-100 to-xeption-goldDim">
          Ventes
        </span>
      </h2>
    </div>
    {controls}
  </div>
);

function useProductSlides(products: Product[], slideSize: number, autoPlay = true) {
  const slides = useMemo(() => {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += slideSize) {
      chunks.push(products.slice(i, i + slideSize));
    }
    return chunks;
  }, [products, slideSize]);

  const [slide, setSlide] = useState(0);
  const maxSlide = Math.max(0, slides.length - 1);

  useEffect(() => {
    if (slide > maxSlide) setSlide(maxSlide);
  }, [slide, maxSlide]);

  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlide((s) => (s >= maxSlide ? 0 : s + 1));
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoPlay, slides.length, maxSlide]);

  const currentSlide = slides[slide] ?? products.slice(0, slideSize);

  const carouselControls =
    slides.length > 1 ? (
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setSlide((s) => (s <= 0 ? maxSlide : s - 1))}
          className="p-1.5 rounded-full border border-xeption-gold/50 hover:border-xeption-gold text-xeption-gold hover:text-white transition-colors bg-black/40 hover:bg-xeption-gold/20"
          aria-label="Produits précédents"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          type="button"
          onClick={() => setSlide((s) => (s >= maxSlide ? 0 : s + 1))}
          className="p-1.5 rounded-full border border-xeption-gold/50 hover:border-xeption-gold text-xeption-gold hover:text-white transition-colors bg-black/40 hover:bg-xeption-gold/20"
          aria-label="Produits suivants"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    ) : null;

  const dots =
    slides.length > 1 ? (
      <div className="flex justify-center gap-1.5 mt-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlide(i)}
            className={`h-1 rounded-full transition-all ${i === slide ? 'w-5 bg-xeption-gold' : 'w-1.5 bg-white/30'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    ) : null;

  return { slides, slide, currentSlide, carouselControls, dots };
}

/** Desktop hero : 3 produits visibles, colonne droite élargie */
export const HeroDesktopProductSection: React.FC<{
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}> = ({ products, onProductClick, onAddToCart }) => {
  const { currentSlide, carouselControls, dots } = useProductSlides(
    products,
    DESKTOP_SLIDE_SIZE
  );

  if (products.length === 0) {
    return (
      <div className="min-w-0 rounded-lg border border-white/10 bg-black/40 p-6 text-center text-gray-400 text-sm">
        Catalogue en chargement…
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full">
      <TopVentesHeading controls={carouselControls} dense />
      <div className="grid grid-cols-3 gap-2 min-w-0 w-full transition-opacity duration-500">
        {currentSlide.map((product) => (
          <HeroProductCard
            key={product.id}
            product={product}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            dense
          />
        ))}
      </div>
      {dots}
    </div>
  );
};

const HeroProductShowcase: React.FC<HeroProductShowcaseProps> = ({
  products,
  onProductClick,
  onAddToCart,
  variant,
}) => {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/40 p-6 text-center text-gray-400 text-sm">
        Catalogue en chargement…
      </div>
    );
  }

  if (variant === 'strip') {
    return (
      <div>
        <TopVentesHeading centered />
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 -mx-1 px-1">
          {products.map((product) => (
            <HeroProductCard
              key={product.id}
              product={product}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  const { currentSlide, carouselControls, dots } = useProductSlides(products, 2);

  return (
    <div className="relative min-w-0">
      <TopVentesHeading controls={carouselControls} />
      <div className="grid grid-cols-2 gap-3 min-w-0 transition-opacity duration-500">
        {currentSlide.map((product) => (
          <HeroProductCard
            key={product.id}
            product={product}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
      {dots}
    </div>
  );
};

export default HeroProductShowcase;

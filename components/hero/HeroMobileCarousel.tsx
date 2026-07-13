import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { optimizeImage } from '../../utils/mediaOptimization';
import { getProductDisplayName } from '../../utils/productDisplay';
import ProductCardImage from '../common/ProductCardImage';
import HeroWelcomeSlide from './HeroWelcomeSlide';

interface HeroMobileCarouselProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

type Slide =
  | { type: 'welcome' }
  | { type: 'product'; product: Product };

const HeroMobileCarousel: React.FC<HeroMobileCarouselProps> = ({
  products,
  onProductClick,
  onAddToCart,
}) => {
  const slides = useMemo<Slide[]>(() => {
    const items: Slide[] = [{ type: 'welcome' }];
    products.forEach((product) => items.push({ type: 'product', product }));
    return items;
  }, [products]);

  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slideWidth, setSlideWidth] = useState(0);
  const [trackHeight, setTrackHeight] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const maxIndex = slides.length - 1;

  const measureActiveSlide = useCallback(() => {
    const slideEl = slideRefs.current[index];
    if (slideEl) setTrackHeight(slideEl.offsetHeight);
  }, [index]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      setSlideWidth(el.clientWidth);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [index, maxIndex]);

  useEffect(() => {
    measureActiveSlide();
  }, [measureActiveSlide, slideWidth, slides.length]);

  useEffect(() => {
    const slideEl = slideRefs.current[index];
    if (!slideEl) return;

    const ro = new ResizeObserver(() => measureActiveSlide());
    ro.observe(slideEl);
    return () => ro.disconnect();
  }, [index, measureActiveSlide]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(goNext, 4500);
    return () => window.clearInterval(id);
  }, [slides.length, goNext]);

  const [touchStart, setTouchStart] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (delta > 50) goPrev();
    if (delta < -50) goNext();
    setTouchStart(null);
  };

  const translatePx = slideWidth > 0 ? index * slideWidth : 0;

  return (
    <div className="relative w-full min-w-0 max-w-full">
      <div
        ref={trackRef}
        className="w-full min-w-0 overflow-hidden touch-pan-y transition-[height] duration-500 ease-out"
        style={{ height: trackHeight ?? 'auto' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex min-w-0 items-start transition-transform duration-500 ease-out will-change-transform"
          style={{
            width: slideWidth > 0 ? slideWidth * slides.length : '100%',
            transform: `translate3d(-${translatePx}px, 0, 0)`,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="shrink-0 box-border"
              style={{ width: slideWidth > 0 ? slideWidth : '100%' }}
            >
              {slide.type === 'welcome' ? (
                <div className="px-0.5">
                  <HeroWelcomeSlide compact />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onProductClick?.(slide.product)}
                  onKeyDown={(e) => e.key === 'Enter' && onProductClick?.(slide.product)}
                  className="w-full min-w-0 group cursor-pointer px-0.5"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="w-6 h-0.5 bg-xeption-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                    <p className="text-center text-xeption-gold font-tech font-bold text-xs uppercase tracking-[0.2em]">
                      Top vente
                    </p>
                    <span className="w-6 h-0.5 bg-xeption-gold shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                  </div>

                  <div
                    className="relative w-full max-w-full mb-3 rounded-xl overflow-hidden border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.45)] group-hover:border-xeption-gold/35 transition-colors box-border"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-[#141414] to-[#080808]" />
                    <div
                      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.18)_0%,_transparent_68%)]"
                    />
                    <div className="absolute inset-0 tech-pattern opacity-[0.04] pointer-events-none" />

                    <div className="relative aspect-[4/3] min-h-[210px] flex items-center justify-center p-1 sm:p-2">
                      {slide.product.isPromo && (
                        <span className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 font-tech uppercase rounded-sm z-10 shadow-md">
                          Promo
                        </span>
                      )}
                      {slide.product.condition === 'new' && (
                        <span className="absolute top-2 left-2 bg-emerald-500/95 text-white text-[8px] font-bold px-1.5 py-0.5 font-tech uppercase rounded-sm z-10 flex items-center gap-0.5 shadow-md">
                          <Sparkles className="w-2.5 h-2.5 shrink-0" /> Neuf
                        </span>
                      )}
                      <ProductCardImage
                        src={optimizeImage(slide.product.image, 640)}
                        alt={getProductDisplayName(slide.product)}
                        width={640}
                        height={640}
                        loading="eager"
                        className="relative z-[1] w-auto h-auto max-h-[88%] max-w-[92%] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] group-hover:scale-[1.04] transition-transform duration-300"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(slide.product);
                        }}
                        className="absolute bottom-2 right-2 bg-xeption-gold text-black p-2 rounded-full shadow-[0_4px_16px_rgba(255,215,0,0.45)] z-10 hover:scale-105 transition-transform"
                        aria-label="Ajouter au panier"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white font-tech uppercase tracking-wide text-center line-clamp-2 px-1 group-hover:text-xeption-gold transition-colors">
                    {getProductDisplayName(slide.product)}
                  </h3>
                  <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 mt-2 px-1">
                    {slide.product.oldPrice && (
                      <span className="text-xs text-red-400 line-through font-mono">
                        {slide.product.oldPrice.toLocaleString('fr-FR')}
                      </span>
                    )}
                    <span className="text-lg font-bold text-white font-tech">
                      {slide.product.price.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-[10px] text-xeption-gold font-bold uppercase">FCFA</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 w-full min-w-0 px-1">
          <button
            type="button"
            onClick={goPrev}
            className="p-2 shrink-0 rounded-full border border-white/40 bg-white/10 text-white hover:text-xeption-gold hover:border-xeption-gold/60 transition-colors"
            aria-label="Slide précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5 justify-center flex-1 min-w-0 overflow-hidden">
            {slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all shrink-0 ${
                  i === index ? 'w-6 bg-xeption-gold' : 'w-2 bg-white/45'
                }`}
                aria-label={
                  slide.type === 'welcome'
                    ? 'Message de bienvenue'
                    : `Produit ${getProductDisplayName(slide.product)}`
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="p-2 shrink-0 rounded-full border border-white/40 bg-white/10 text-white hover:text-xeption-gold hover:border-xeption-gold/60 transition-colors"
            aria-label="Slide suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default HeroMobileCarousel;

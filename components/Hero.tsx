
import React from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { HeroDesktopProductSection } from './hero/HeroProductShowcase';
import HeroWelcomeSlide from './hero/HeroWelcomeSlide';
import HeroMobileCarousel from './hero/HeroMobileCarousel';

interface HeroProps {
  products: Product[];
  onShopNow: () => void;
  onNavigateTroc?: () => void;
  onProductClick?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

const HeroCtaButtons: React.FC<{
  onShopNow: () => void;
  onNavigateTroc?: () => void;
  dense?: boolean;
  pinBottom?: boolean;
}> = ({ onShopNow, onNavigateTroc, dense, pinBottom }) => (
  <div
    className={`flex flex-row gap-2 w-full min-w-0 max-w-full border-t border-white/10 ${
      pinBottom ? 'mt-auto pt-3' : dense ? 'pt-3 mt-3' : 'pt-4 lg:pt-5 mt-4 lg:mt-5'
    }`}
  >
    <button
      type="button"
      onClick={onShopNow}
      className="group flex-1 basis-0 min-w-0 px-2 lg:px-4 py-2.5 lg:py-3 rounded-lg lg:rounded-none bg-xeption-gold text-black font-tech font-bold text-xs lg:text-sm leading-snug uppercase tracking-wide lg:tracking-wider shadow-[0_0_16px_rgba(255,215,0,0.35)] hover:shadow-[0_0_24px_rgba(255,215,0,0.45)] transition-all flex items-center justify-center gap-1"
    >
      <span className="truncate lg:hidden">Explorer</span>
      <span className="truncate hidden lg:inline">Explorer le shop</span>
      <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
    {onNavigateTroc && (
      <button
        type="button"
        onClick={onNavigateTroc}
        className="flex-1 basis-0 min-w-0 px-2 lg:px-4 py-2.5 lg:py-3 rounded-lg lg:rounded-none border-2 lg:border border-xeption-gold/70 lg:border-xeption-gold/30 text-xeption-gold font-tech font-bold text-xs lg:text-sm uppercase tracking-wide lg:tracking-wider bg-xeption-gold/15 lg:bg-transparent hover:bg-xeption-gold/20 lg:hover:bg-xeption-gold/10 transition-all flex items-center justify-center gap-1.5"
      >
        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate lg:hidden">Troc</span>
        <span className="truncate hidden lg:inline">TROQUER Mon téléphone</span>
      </button>
    )}
  </div>
);

const HeroCardShell: React.FC<{
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  fillHeight?: boolean;
}> = ({ children, className = '', compact, fillHeight }) => (
  <div
    className={`relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/75 backdrop-blur-xl shadow-2xl hover:border-xeption-gold/20 transition-colors box-border ${
      fillHeight ? 'h-full flex flex-col' : ''
    } ${className}`}
  >
    <div className="absolute inset-0 tech-pattern opacity-[0.07] pointer-events-none" />
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xeption-gold/50 to-transparent" />
    <div
      className={`relative z-10 w-full max-w-full overflow-hidden box-border ${
        compact ? 'p-4 lg:p-5' : 'p-4 sm:p-6 md:p-8'
      } ${fillHeight ? 'flex flex-col flex-1 h-full min-h-0' : ''}`}
    >
      {children}
    </div>
  </div>
);

const Hero: React.FC<HeroProps> = ({
  products,
  onShopNow,
  onNavigateTroc,
  onProductClick,
  onAddToCart,
}) => {
  return (
    <section className="relative z-10 w-full min-w-0 max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-2 md:pt-3 md:pb-3 overflow-x-hidden box-border">
      <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-xeption-gold/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-xeption-red/5 rounded-full blur-[70px] pointer-events-none" />

      {/* Mobile */}
      <div className="lg:hidden w-full min-w-0">
        <HeroCardShell className="w-full min-w-0">
          <HeroMobileCarousel
            products={products}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
          />
          <HeroCtaButtons
            onShopNow={onShopNow}
            onNavigateTroc={onNavigateTroc}
          />
        </HeroCardShell>
      </div>

      {/* Desktop — colonne gauche étroite, 3 produits à droite */}
      <div
        className="hidden lg:grid lg:grid-cols-[minmax(0,34%)_minmax(0,66%)] lg:gap-6 items-stretch min-w-0"
      >
        <HeroCardShell className="text-left" compact fillHeight>
          <div className="flex flex-col h-full min-h-0">
            <HeroWelcomeSlide desktopCompact />
            <HeroCtaButtons
              onShopNow={onShopNow}
              onNavigateTroc={onNavigateTroc}
              dense
              pinBottom
            />
          </div>
        </HeroCardShell>

        <HeroDesktopProductSection
          products={products}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
        />
      </div>
    </section>
  );
};

export default Hero;

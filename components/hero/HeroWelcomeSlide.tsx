import React from 'react';
import { Truck, CreditCard, Banknote } from 'lucide-react';

interface HeroWelcomeSlideProps {
  compact?: boolean;
  /** Desktop hero : aligné à gauche dans la colonne étroite */
  desktopCompact?: boolean;
}

const HeroWelcomeSlide: React.FC<HeroWelcomeSlideProps> = ({ compact, desktopCompact }) => (
  <div
    className={`relative ${compact || desktopCompact ? 'px-1' : ''} ${desktopCompact ? 'text-left' : 'text-center'}`}
  >
    <div className="absolute inset-0 bg-black/40 blur-[40px] rounded-full pointer-events-none" />
    <div className="relative z-10">
      <p
        className={`font-tech text-xeption-gold uppercase tracking-[0.25em] mb-2 ${
          desktopCompact ? 'text-xs' : 'text-[10px]'
        }`}
      >
        Bienvenue sur Xeption · 237
      </p>

      <h1
        className={`font-bold tracking-tight leading-tight mb-2 ${
          desktopCompact
            ? 'text-3xl lg:text-[2.5rem]'
            : compact
              ? 'text-2xl sm:text-3xl'
              : 'text-3xl sm:text-4xl lg:text-[2.5rem]'
        }`}
      >
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold via-yellow-100 to-xeption-goldDim font-tech">
          Smartphones, PC & accessoires
        </span>
        <span
          className={`block text-white font-tech uppercase tracking-wide mt-2 ${
            desktopCompact
              ? 'text-xl lg:text-2xl'
              : compact
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl lg:text-[1.65rem]'
          }`}
        >
          au meilleur prix au Mboa
        </span>
      </h1>

      <div className={`flex flex-wrap items-center gap-2 mt-5 ${desktopCompact ? 'justify-start' : 'justify-center'}`}>
        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-md border border-white/10 shadow-sm">
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] md:text-xs text-white font-tech uppercase tracking-wide">Livraison gratuite (237)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-md border border-white/10 shadow-sm">
          <CreditCard className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[10px] md:text-xs text-white font-tech uppercase tracking-wide">OM / MoMo</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-md border border-white/10 shadow-sm">
          <Banknote className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[10px] md:text-xs text-white font-tech uppercase tracking-wide">Cash à la livraison</span>
        </div>
      </div>
    </div>
  </div>
);

export default HeroWelcomeSlide;

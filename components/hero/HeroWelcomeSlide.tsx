import React from 'react';
import { Truck, CreditCard, Banknote } from 'lucide-react';

interface HeroWelcomeSlideProps {
  compact?: boolean;
  /** Desktop hero : aligné à gauche dans la colonne étroite */
  desktopCompact?: boolean;
}

const HeroWelcomeSlide: React.FC<HeroWelcomeSlideProps> = ({ compact, desktopCompact }) => {
  // Colonne desktop étroite : badges sur une seule ligne pour ne pas rallonger la carte.
  const badgeClass = `flex items-center gap-1.5 bg-white/10 rounded-md border border-white/10 shadow-sm ${
    desktopCompact ? 'px-2 py-1' : 'px-2.5 py-1.5'
  }`;
  const badgeTextClass = `text-white font-tech uppercase tracking-wide ${
    desktopCompact ? 'text-[10px] whitespace-nowrap' : 'text-[10px] md:text-xs'
  }`;
  return (
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
            ? 'text-3xl lg:text-[1.9rem]'
            : compact
              ? 'text-2xl sm:text-3xl'
              : 'text-3xl sm:text-4xl lg:text-[2.5rem]'
        }`}
      >
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold via-yellow-100 to-xeption-goldDim font-tech">
          <span className="block sm:inline">Smartphones,</span>{' '}
          <span className="block sm:inline">PC & accessoires</span>
        </span>
        <span
          className={`block text-white font-tech uppercase tracking-wide mt-2 ${
            desktopCompact
              ? 'text-lg lg:text-xl'
              : compact
                ? 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl lg:text-[1.65rem]'
          }`}
        >
          au meilleur prix au Mboa
        </span>
      </h1>

      <div className={`flex flex-wrap items-center gap-1.5 ${desktopCompact ? 'mt-3 justify-start' : 'mt-5 justify-center'}`}>
        <div className={badgeClass}>
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          <span className={badgeTextClass}>Livraison gratuite (237)</span>
        </div>
        <div className={badgeClass}>
          <CreditCard className="w-3.5 h-3.5 text-orange-400" />
          <span className={badgeTextClass}>OM / MoMo</span>
        </div>
        <div className={badgeClass}>
          <Banknote className="w-3.5 h-3.5 text-green-400" />
          <span className={badgeTextClass}>Cash à la livraison</span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default HeroWelcomeSlide;

import React from 'react';

interface HeroWelcomeSlideProps {
  compact?: boolean;
  /** Desktop hero : aligné à gauche dans la colonne étroite */
  desktopCompact?: boolean;
}

const HeroWelcomeSlide: React.FC<HeroWelcomeSlideProps> = ({ compact, desktopCompact }) => (
  <div
    className={`${compact || desktopCompact ? 'px-1' : ''} ${desktopCompact ? 'text-left' : 'text-center'}`}
  >
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

    <p
      className={`text-gray-300 leading-relaxed max-w-lg text-sm ${
        desktopCompact ? '' : 'mx-auto'
      } lg:mx-0`}
    >
      iPhone, Samsung, MacBook, gaming — livraison partout au 237, paiement{' '}
      <span className="text-orange-400 font-semibold">Orange Money</span> ou{' '}
      <span className="text-yellow-400 font-semibold">MoMo</span>, garantie incluse.
    </p>
  </div>
);

export default HeroWelcomeSlide;

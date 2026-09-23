import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface MobileHeroSlide {
  id: string;
  badge?: string;
  title: string;
  highlightText: string;
  suffixText?: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  imageAlt?: string;
  glowColor?: string;
  isCampaign?: boolean;
  sponsorLabel?: string;
}

export interface MobileHeroBannerProps {
  slides?: MobileHeroSlide[];
  onCtaClick?: (slide: MobileHeroSlide) => void;
  className?: string;
}

/**
 * Slides par défaut pour le carrousel mobile Xeption.
 * Emplacement N°1 ("Spot d'or") pour valoriser les offres clés et les campagnes publicitaires.
 */
export const DEFAULT_MOBILE_HERO_SLIDES: MobileHeroSlide[] = [
  {
    id: 'tech-flagship',
    title: 'Le meilleur',
    highlightText: 'de la Tech',
    suffixText: 'au Cameroun',
    ctaText: 'Découvrir le catalogue',
    ctaLink: '/shop',
    image: '/hero-phones-clean.png',
    imageAlt: 'Smartphones haut de gamme Xeption',
    glowColor: 'bg-amber-500/15',
  },
  {
    id: 'smart-troc',
    title: 'Ton ancien téléphone',
    highlightText: 'vaut du Cash',
    suffixText: 'reprise immédiate',
    ctaText: 'Calculer mon prix',
    ctaLink: '/troc',
    image: '/hero-troc.jpg',
    imageAlt: 'Reprise Smart Troc Xeption',
    glowColor: 'bg-yellow-500/20',
  },
  {
    id: 'marketplace',
    title: 'Téléphone d\'occasion',
    highlightText: 'moins cher',
    suffixText: 'vérifié par Xeption',
    ctaText: 'Voir les annonces',
    ctaLink: '/marketplace',
    image: '/hero-phones-clean.png',
    imageAlt: 'Téléphones d\'occasion vérifiés par Xeption',
    glowColor: 'bg-emerald-500/15',
  },
  {
    id: 'pc-gaming',
    title: 'PC & MacBook',
    highlightText: 'puissants',
    suffixText: 'travail & gaming',
    ctaText: 'Voir les PC',
    ctaLink: '/shop?cat=computer',
    image: '/hero-laptop.png',
    imageAlt: 'Ordinateurs et laptops Xeption',
    glowColor: 'bg-purple-500/15',
  },
  {
    id: 'ventes-flash',
    title: 'Ventes Flash',
    highlightText: "jusqu'à -20%",
    suffixText: 'sur iPhone & Samsung',
    ctaText: 'Voir les promos',
    ctaLink: '/shop?promo=1',
    image: '/hero-flash.jpg',
    imageAlt: 'Promotions et ventes flash',
    glowColor: 'bg-rose-500/15',
  },
  {
    id: 'reconditionne',
    title: 'Occasion vérifiée',
    highlightText: 'comme neuf',
    suffixText: 'garantie boutique',
    ctaText: 'Voir les offres',
    ctaLink: '/shop?condition=refurbished',
    image: '/hero-refurbished.jpg',
    imageAlt: 'Appareils occasion comme neuf garantis',
    glowColor: 'bg-emerald-500/15',
  },
];

export const MobileHeroBanner: React.FC<MobileHeroBannerProps> = ({
  slides = DEFAULT_MOBILE_HERO_SLIDES,
  onCtaClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = slides.length;

  const handleCta = (slide: MobileHeroSlide) => {
    if (onCtaClick) {
      onCtaClick(slide);
    } else if (slide.ctaLink.startsWith('http')) {
      window.open(slide.ctaLink, '_blank', 'noopener,noreferrer');
    } else {
      navigate(slide.ctaLink);
    }
  };

  const scrollToSlide = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const slideElem = container.children[index] as HTMLElement | undefined;
    if (slideElem) {
      container.scrollTo({
        left: slideElem.offsetLeft - 16, // compenser le padding gauche (px-4 = 16px)
        behavior: 'smooth',
      });
      setActiveSlide(index);
    }
  }, []);

  // Détection fluide du slide actif au défilement
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollPosition = container.scrollLeft;
    const firstChild = container.children[0] as HTMLElement | undefined;
    if (!firstChild) return;

    const cardWidth = firstChild.offsetWidth;
    const gap = 12; // gap-3 = 12px
    const index = Math.round(scrollPosition / (cardWidth + gap));
    const clampedIndex = Math.max(0, Math.min(index, totalSlides - 1));

    if (clampedIndex !== activeSlide) {
      setActiveSlide(clampedIndex);
    }
  };

  // Autoplay : rotation automatique toutes les 5s (mise en pause quand l'utilisateur touche l'écran)
  useEffect(() => {
    if (totalSlides <= 1) return;

    const interval = setInterval(() => {
      if (!isInteractingRef.current) {
        setActiveSlide((prev) => {
          const next = (prev + 1) % totalSlides;
          scrollToSlide(next);
          return next;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides, scrollToSlide]);

  const handleTouchStart = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, 4000);
  };

  return (
    <div className={`py-2 w-full select-none ${className}`}>
      {/* Conteneur défilant horizontal avec prévisualisation des cartes adjacentes (peek effect) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleTouchStart}
        onMouseLeave={handleTouchEnd}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-4 pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onClick={() => handleCta(slide)}
            className="w-[89vw] sm:w-[92vw] max-w-[420px] shrink-0 snap-center rounded-2xl bg-[#0e0e12] border border-white/10 hover:border-amber-400/40 transition-all duration-300 overflow-hidden shadow-2xl relative flex flex-col justify-between cursor-pointer active:scale-[0.99]"
          >
            {/* Lueur subtile en arrière plan */}
            <div
              className={`absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 ${
                slide.glowColor || 'bg-amber-500/10'
              } rounded-full blur-3xl pointer-events-none`}
            />

            <div className="flex items-center justify-between p-4 min-h-[195px] sm:min-h-[210px] relative z-10">
              {/* Image / Visuel */}
              <div className="w-[45%] sm:w-[46%] shrink-0 relative flex items-center justify-center">
                <img
                  src={slide.image}
                  alt={slide.imageAlt || slide.title}
                  className="w-full h-auto max-h-[165px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:scale-105"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>

              {/* Accroche & Bouton CTA */}
              <div className="w-[55%] sm:w-[54%] pl-3 flex flex-col justify-center text-left">
                <h2 className="font-tech text-[15px] sm:text-[17px] font-black tracking-tight text-white leading-tight uppercase">
                  {slide.title} <br />
                  <span className="text-amber-400">{slide.highlightText}</span>{' '}
                  {slide.suffixText && (
                    <>
                      <br />
                      <span className="text-white/80 text-[11px] sm:text-xs font-bold tracking-normal">
                        {slide.suffixText}
                      </span>
                    </>
                  )}
                </h2>

                <div className="mt-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCta(slide);
                    }}
                    className="px-4 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-tech text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.35)] active:scale-95 transition-all text-center inline-block"
                  >
                    {slide.ctaText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicateurs de pagination (dots) synchronisés en temps réel */}
      {totalSlides > 1 && (
        <div className="pt-2 pb-0.5 flex items-center justify-center space-x-1.5">
          {slides.map((_, dot) => (
            <button
              key={dot}
              type="button"
              onClick={() => scrollToSlide(dot)}
              className={`transition-all duration-300 ${
                activeSlide === dot
                  ? 'w-6 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'w-1.5 h-1.5 rounded-full bg-zinc-600 hover:bg-zinc-500'
              }`}
              aria-label={`Aller au slide ${dot + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileHeroBanner;


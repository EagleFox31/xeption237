import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Headphones, Laptop, Smartphone, Tablet, Wallet, Watch, type LucideIcon } from 'lucide-react';
import type { LandingIcon, LandingPageDef } from '../../content/seo/types';
import { Product } from '../../types';
import { resolveLandingIcon } from '../../utils/contentMeta';
import { optimizeImage } from '../../utils/mediaOptimization';
import { landingPath } from '../../utils/routes';

export const LANDING_ICONS: Record<LandingIcon, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  watch: Watch,
  headphones: Headphones,
  wallet: Wallet,
};

interface LandingCardProps {
  landing: LandingPageDef;
  /** Produit vitrine du rayon (photo) ; pictogramme seul si absent. */
  cover?: Product;
  productCount: number;
}

/** Carte de rayon : photo produit, nom, nombre de modèles, appel à l'action explicite. */
const LandingCard: React.FC<LandingCardProps> = ({ landing, cover, productCount }) => {
  const Icon = LANDING_ICONS[resolveLandingIcon(landing)];
  return (
    <Link
      to={landingPath(landing.slug)}
      className="group flex flex-col h-full rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0c]/90 backdrop-blur-md hover:border-xeption-gold/60 hover:shadow-[0_0_25px_rgba(255,215,0,0.15)] transition-all"
    >
      <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden">
        {cover?.image ? (
          <img
            src={optimizeImage(cover.image, 400)}
            alt=""
            loading="lazy"
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1f] to-black">
            <Icon className="w-12 h-12 text-xeption-gold/80" aria-hidden />
          </div>
        )}
        <span className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/80 flex items-center justify-center">
          <Icon className="w-4 h-4 text-xeption-gold" aria-hidden />
        </span>
      </div>
      <div className="flex flex-col flex-1 p-3">
        <span className="font-bold text-sm text-white leading-snug group-hover:text-xeption-gold transition-colors">
          {landing.navLabel}
        </span>
        {productCount > 0 && (
          <span className="mt-1 text-xs text-gray-400">
            {productCount} modèle{productCount > 1 ? 's' : ''}
          </span>
        )}
        <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-tech font-bold uppercase tracking-wider text-xeption-gold">
          Voir le rayon
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" aria-hidden />
        </span>
      </div>
    </Link>
  );
};

export default LandingCard;

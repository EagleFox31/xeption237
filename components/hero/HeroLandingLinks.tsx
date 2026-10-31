import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { LANDING_PAGES, pickBySlugs } from '../../content/seo';
import { resolveLandingIcon } from '../../utils/contentMeta';
import { landingPath } from '../../utils/routes';
import { LANDING_ICONS } from '../content/LandingCard';

/**
 * Rayons mis en avant dès l'arrivée : les requêtes les plus cherchées (marque, budget, reconditionné).
 * Liens HTML réels, ancres descriptives : maillage interne depuis l'accueil et raccourci pour le client pressé.
 */
export const HERO_LANDING_SLUGS = [
  'iphone-cameroun',
  'smartphones-samsung-cameroun',
  'telephones-moins-100000-fcfa',
  'smartphones-xiaomi-redmi-poco-cameroun',
  'pc-portables-reconditionnes-cameroun',
  'ecouteurs-casques-bluetooth-cameroun',
];

/** Sous `xl`, la colonne est trop étroite : les rayons au-delà passent dans le bloc de cartes plus bas. */
const LINKS_BELOW_XL = 4;

const HeroLandingLinks: React.FC<{ className?: string }> = ({ className = '' }) => {
  const landings = pickBySlugs(LANDING_PAGES, HERO_LANDING_SLUGS);
  if (!landings.length) return null;
  return (
    <nav aria-label="Rayons populaires" className={className}>
      <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1.5">Rayons populaires</p>
      <ul className="grid grid-cols-2 gap-x-3 border-t border-white/10">
        {landings.map((landing, index) => {
          const Icon = LANDING_ICONS[resolveLandingIcon(landing)];
          return (
            <li
              key={landing.slug}
              className={`border-b border-white/10 ${index >= LINKS_BELOW_XL ? 'hidden xl:list-item' : ''}`}
            >
              <Link
                to={landingPath(landing.slug)}
                className="group flex items-center gap-2 py-1.5 text-[12px] leading-tight font-semibold text-gray-200 hover:text-xeption-gold transition-colors"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-xeption-gold" aria-hidden />
                <span className="flex-1 min-w-0">{landing.navLabel}</span>
                <ChevronRight className="w-3 h-3 shrink-0 text-gray-500 group-hover:text-xeption-gold" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default HeroLandingLinks;

import React, { useMemo } from 'react';
import { GUIDES, LANDING_PAGES, pickBySlugs } from '../../content/seo';
import { Product } from '../../types';
import {
  buildCardSections,
  buildGuideCards,
  buildLandingCards,
  type CardSectionDef,
} from '../../utils/contentCards';
import { INSTITUTIONAL_SECTION_CLASS } from '../../constants/institutionalPageStyles';
import GuideCard from './GuideCard';
import LandingCard from './LandingCard';

interface RelatedCardsProps {
  title: string;
  /** Slugs à afficher, dans cet ordre ; absent = tout le contenu. */
  slugs?: string[];
  /** Catalogue pour les photos ; vide (prérendu, chargement) → pictogrammes, liens intacts. */
  products?: Product[];
  className?: string;
}

/** Coque commune : titre + grille de cartes. Pendant visuel de RelatedLinks pour rayons et guides. */
const CardGridSection: React.FC<{ title: string; className?: string; children: React.ReactNode }> = ({
  title,
  className = `mt-6 ${INSTITUTIONAL_SECTION_CLASS}`,
  children,
}) => (
  <nav className={className} aria-label={title}>
    <h2 className="text-lg md:text-xl font-tech font-bold uppercase tracking-wide text-white mb-4">{title}</h2>
    <ul className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{children}</ul>
  </nav>
);

export const RelatedLandingCards: React.FC<RelatedCardsProps> = ({ title, slugs, products = [], className }) => {
  const cards = useMemo(
    () => buildLandingCards(slugs ? pickBySlugs(LANDING_PAGES, slugs) : LANDING_PAGES, products),
    [slugs, products],
  );
  if (!cards.length) return null;
  return (
    <CardGridSection title={title} className={className}>
      {cards.map(({ landing, cover, productCount }) => (
        <li key={landing.slug}>
          <LandingCard landing={landing} cover={cover} productCount={productCount} />
        </li>
      ))}
    </CardGridSection>
  );
};

export const RelatedGuideCards: React.FC<RelatedCardsProps> = ({ title, slugs, products = [], className }) => {
  const cards = useMemo(() => buildGuideCards(slugs ? pickBySlugs(GUIDES, slugs) : GUIDES, products), [slugs, products]);
  if (!cards.length) return null;
  return (
    <CardGridSection title={title} className={className}>
      {cards.map(({ guide, fallbackProduct }) => (
        <li key={guide.slug}>
          <GuideCard guide={guide} fallbackProduct={fallbackProduct} />
        </li>
      ))}
    </CardGridSection>
  );
};

/** Plusieurs sections de cartes sur une même page, sans photo en double d'une section à l'autre. */
export const RelatedCardSections: React.FC<{ sections: CardSectionDef[]; products?: Product[] }> = ({
  sections,
  products = [],
}) => {
  const built = useMemo(() => buildCardSections(sections, products), [sections, products]);
  return (
    <>
      {built.map((section) =>
        section.cards.length ? (
          <CardGridSection key={section.title} title={section.title}>
            {section.kind === 'landings'
              ? section.cards.map(({ landing, cover, productCount }) => (
                  <li key={landing.slug}>
                    <LandingCard landing={landing} cover={cover} productCount={productCount} />
                  </li>
                ))
              : section.cards.map(({ guide, fallbackProduct }) => (
                  <li key={guide.slug}>
                    <GuideCard guide={guide} fallbackProduct={fallbackProduct} />
                  </li>
                ))}
          </CardGridSection>
        ) : null,
      )}
    </>
  );
};

import type { ArticleDef, LandingPageDef } from '../content/seo/types';
import { GUIDES, LANDING_PAGES, pickBySlugs } from '../content/seo';
import { Product } from '../types';
import { selectProducts } from './landingPageFilter';

export interface LandingCardData {
  landing: LandingPageDef;
  cover?: Product;
  productCount: number;
}

export interface GuideCardData {
  guide: ArticleDef;
  fallbackProduct?: Product;
}

/**
 * Photo vitrine : premier produit illustré pas encore utilisé par une autre carte (évite les doublons).
 * `used` est partagé entre les listes d'une même page et enrichi au passage.
 */
export const pickCover = (products: Product[], used: Set<string>): Product | undefined => {
  const cover = products.find((p) => p.image && !used.has(p.image)) ?? products.find((p) => p.image);
  if (cover?.image) used.add(cover.image);
  return cover;
};

export const buildLandingCards = (
  landings: LandingPageDef[],
  products: Product[],
  used: Set<string> = new Set(),
): LandingCardData[] =>
  landings.map((landing) => {
    const selection = selectProducts(products, landing.filter, landing.sort);
    return { landing, cover: pickCover(selection, used), productCount: selection.length };
  });

/** Un guide avec vidéo a déjà son aperçu : la photo produit ne sert qu'aux guides sans vidéo. */
export const buildGuideCards = (
  guides: ArticleDef[],
  products: Product[],
  used: Set<string> = new Set(),
): GuideCardData[] =>
  guides.map((guide) => ({
    guide,
    fallbackProduct:
      guide.videos?.length || !guide.products
        ? undefined
        : pickCover(selectProducts(products, guide.products.filter, guide.products.sort), used),
  }));

export type CardSectionDef = { kind: 'landings' | 'guides'; title: string; /** Absent = tout le contenu. */ slugs?: string[] };

export type CardSectionData =
  | { kind: 'landings'; title: string; cards: LandingCardData[] }
  | { kind: 'guides'; title: string; cards: GuideCardData[] };

/**
 * Sections de cartes d'une même page : une photo n'y apparaît qu'une fois.
 * Les sections sont servies dans l'ordre d'affichage, la première garde donc ses photos préférées.
 */
export const buildCardSections = (sections: CardSectionDef[], products: Product[]): CardSectionData[] => {
  const used = new Set<string>();
  return sections.map(({ kind, title, slugs }): CardSectionData =>
    kind === 'landings'
      ? { kind, title, cards: buildLandingCards(slugs ? pickBySlugs(LANDING_PAGES, slugs) : LANDING_PAGES, products, used) }
      : { kind, title, cards: buildGuideCards(slugs ? pickBySlugs(GUIDES, slugs) : GUIDES, products, used) },
  );
};

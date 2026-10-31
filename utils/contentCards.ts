import type { ArticleDef, LandingPageDef } from '../content/seo/types';
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

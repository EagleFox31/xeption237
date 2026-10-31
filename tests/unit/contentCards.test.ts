import { describe, it, expect } from 'vitest';
import { buildGuideCards, buildLandingCards, pickCover } from '../../utils/contentCards';
import { GUIDES, LANDING_PAGES } from '../../content/seo';
import { Product } from '../../types';

const product = (id: string, image?: string) => ({ id, image } as Product);

describe('pickCover', () => {
  it('prend la première photo pas encore utilisée et la réserve', () => {
    const used = new Set(['a.jpg']);
    const cover = pickCover([product('1', 'a.jpg'), product('2', 'b.jpg')], used);
    expect(cover?.id).toBe('2');
    expect(used.has('b.jpg')).toBe(true);
  });

  it('réutilise une photo plutôt que rien quand toutes sont prises', () => {
    expect(pickCover([product('1', 'a.jpg')], new Set(['a.jpg']))?.id).toBe('1');
  });

  it('ignore les produits sans photo', () => {
    expect(pickCover([product('1')], new Set())).toBeUndefined();
  });
});

describe('buildLandingCards / buildGuideCards', () => {
  it('catalogue vide (prérendu) : une carte par contenu, sans photo, compteur à 0', () => {
    const cards = buildLandingCards(LANDING_PAGES, []);
    expect(cards).toHaveLength(LANDING_PAGES.length);
    expect(cards.every((c) => !c.cover && c.productCount === 0)).toBe(true);
  });

  it('un guide avec vidéo ne consomme pas de photo produit', () => {
    const cards = buildGuideCards(GUIDES, [product('1', 'a.jpg')]);
    cards.filter((c) => c.guide.videos?.length).forEach((c) => expect(c.fallbackProduct).toBeUndefined());
  });
});

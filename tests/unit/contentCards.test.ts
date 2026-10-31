import { describe, it, expect } from 'vitest';
import { buildCardSections, buildGuideCards, buildLandingCards, pickCover } from '../../utils/contentCards';
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

describe('buildCardSections', () => {
  const iphoneLanding = LANDING_PAGES.find((l) => l.filter.brands?.includes('Apple'))!;
  const iphone = (id: string, image: string) =>
    ({ id, name: `iPhone 1${id}`, brand: 'Apple', category: 'phones', image, stock: 1 } as Product);

  it('une même photo ne sert pas deux fois sur la page, la première section est servie en premier', () => {
    const [first, second] = buildCardSections(
      [
        { kind: 'landings', title: 'Rayons', slugs: [iphoneLanding.slug] },
        { kind: 'landings', title: 'Autres rayons', slugs: [iphoneLanding.slug] },
      ],
      [iphone('1', 'a.jpg'), iphone('2', 'b.jpg')],
    );
    expect(first.kind === 'landings' && first.cards[0].cover?.image).toBe('a.jpg');
    expect(second.kind === 'landings' && second.cards[0].cover?.image).toBe('b.jpg');
  });

  it('pur : deux appels donnent le même résultat', () => {
    const defs = [{ kind: 'landings' as const, title: 'Rayons' }];
    const products = [iphone('1', 'a.jpg')];
    expect(buildCardSections(defs, products)).toEqual(buildCardSections(defs, products));
  });
});

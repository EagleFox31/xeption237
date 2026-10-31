import { describe, it, expect } from 'vitest';
import {
  matchesProductFilter,
  selectProducts,
  getGuidesForProduct,
  getPrimaryLandingForProduct,
} from '../../utils/landingPageFilter';
import { GUIDES, LANDING_PAGES } from '../../content/seo';
import { CATEGORY_SLUGS } from '../../constants/dbSchema';
import type { Product } from '../../types';

const p = (o: Partial<Product>): Product => ({
  id: o.id ?? 'x', name: 'Produit', description: '', price: 50000, category: 'phones', image: '', stock: 1, ...o,
});

describe('matchesProductFilter', () => {
  it('filtre par catégorie (ordinateurs = computer)', () => {
    const pc = p({ category: CATEGORY_SLUGS.ORDINATEURS });
    expect(matchesProductFilter(pc, { categories: ['computer'] })).toBe(true);
    expect(matchesProductFilter(pc, { categories: ['phones'] })).toBe(false);
  });

  it('marque par brandName, insensible casse/accents', () => {
    expect(matchesProductFilter(p({ brandName: 'Samsung' }), { brands: ['samsung'] })).toBe(true);
    expect(matchesProductFilter(p({ brandName: 'Xiaomi' }), { brands: ['Samsung'] })).toBe(false);
  });

  it('repli sur le nom quand la marque est absente', () => {
    expect(matchesProductFilter(p({ name: 'iPhone 13 Pro' }), { brands: ['Apple'], nameIncludes: ['iphone'] })).toBe(true);
  });

  it('bornes de prix incluses', () => {
    const f = { maxPrice: 100000, minPrice: 1 };
    expect(matchesProductFilter(p({ price: 100000 }), f)).toBe(true);
    expect(matchesProductFilter(p({ price: 100001 }), f)).toBe(false);
    expect(matchesProductFilter(p({ price: 0 }), f)).toBe(false);
  });

  it('état : un produit sans condition est neuf', () => {
    expect(matchesProductFilter(p({}), { conditions: ['refurbished'] })).toBe(false);
    expect(matchesProductFilter(p({ condition: 'refurbished' }), { conditions: ['refurbished'] })).toBe(true);
  });

  it('inStockOnly', () => {
    expect(matchesProductFilter(p({ stock: 0 }), { inStockOnly: true })).toBe(false);
  });
});

describe('selectProducts', () => {
  const list = Object.freeze([
    p({ id: 'a', price: 300, stock: 0 }),
    p({ id: 'b', price: 100 }),
    p({ id: 'c', price: 200, releaseYear: 2025 }),
  ]) as unknown as Product[];

  it('tri prix croissant, en stock en premier, sans muter', () => {
    expect(selectProducts(list, {}, 'price-asc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('tri prix décroissant et limite', () => {
    expect(selectProducts(list, {}, 'price-desc', 1).map((x) => x.id)).toEqual(['c']);
  });

  it('tri nouveautés', () => {
    expect(selectProducts(list, {}, 'newest')[0].id).toBe('c');
  });

  it('liste vide', () => {
    expect(selectProducts([], { categories: ['phones'] })).toEqual([]);
  });
});

describe('liens produit → contenus', () => {
  const iphone = p({ name: 'iPhone 12', brandName: 'Apple', condition: 'refurbished', price: 250000 });

  it('un iPhone reconditionné affiche le guide de vérification', () => {
    const slugs = getGuidesForProduct(iphone, GUIDES).map((g) => g.slug);
    expect(slugs).toContain('verifier-iphone-occasion');
  });

  it('landing principale la plus spécifique', () => {
    expect(getPrimaryLandingForProduct(iphone, LANDING_PAGES)?.slug).toBe('iphone-cameroun');
    const redmi = p({ name: 'Redmi A5', brandName: 'Xiaomi', price: 60000 });
    expect(getPrimaryLandingForProduct(redmi, LANDING_PAGES)?.slug).toBe('smartphones-xiaomi-redmi-poco-cameroun');
    const cheap = p({ name: 'Tecno Spark 20', brandName: 'Tecno', price: 60000 });
    expect(getPrimaryLandingForProduct(cheap, LANDING_PAGES)?.slug).toBe('telephones-moins-100000-fcfa');
  });
});

describe('rayons accessoires et comparatifs', () => {
  const acc = (name: string) => p({ name, category: CATEGORY_SLUGS.ACCESSORIES, brandName: 'Samsung' });
  const landingOf = (product: Product) => getPrimaryLandingForProduct(product, LANDING_PAGES)?.slug;
  const guidesOf = (product: Product) => getGuidesForProduct(product, GUIDES).map((g) => g.slug);

  it('montres, audio et chargeurs ne se chevauchent pas', () => {
    expect(landingOf(acc('Samsung Galaxy Watch8 Classic'))).toBe('montres-connectees-samsung-cameroun');
    expect(landingOf(acc('Samsung Galaxy Fit3'))).toBe('montres-connectees-samsung-cameroun');
    expect(landingOf(acc('Samsung Galaxy Buds3 Pro'))).toBe('ecouteurs-casques-bluetooth-cameroun');
    expect(landingOf(acc('Écouteurs CMF buds pro 2'))).toBe('ecouteurs-casques-bluetooth-cameroun');
    expect(landingOf(acc('Chargeur Ordinateur Portable HP'))).toBeUndefined();
    expect(guidesOf(acc('Chargeur Ordinateur Portable HP'))).toContain('choisir-chargeur-pc-portable');
    expect(guidesOf(acc('Samsung Galaxy Buds FE'))).not.toContain('choisir-chargeur-pc-portable');
  });

  it('un téléphone hors accessoires reste hors des rayons accessoires', () => {
    expect(landingOf(p({ name: 'Samsung Galaxy A55', brandName: 'Samsung' }))).toBe('smartphones-samsung-cameroun');
  });

  it('comparatifs rattachés aux bonnes fiches', () => {
    expect(guidesOf(p({ name: 'iPhone 12pro 128 Go', brandName: 'Apple' }))).toContain('iphone-12-ou-iphone-13');
    expect(guidesOf(p({ name: 'iPhone 14 128 Go', brandName: 'Apple' }))).not.toContain('iphone-12-ou-iphone-13');
    expect(guidesOf(p({ name: 'Google Pixel 7a 128 Go' }))).toContain('google-pixel-7-ou-samsung-galaxy-a55');
    expect(guidesOf(p({ name: 'Samsung Galaxy A55 128 Go' }))).toContain('google-pixel-7-ou-samsung-galaxy-a55');
  });
});

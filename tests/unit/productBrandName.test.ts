import { describe, it, expect } from 'vitest';
import { attachBrandNames, resolveProductBrandName } from '../../utils/productBrand';
import type { Product } from '../../types';

const APPLE_ID = '0b6f2d3a-1c2e-4a5b-8c9d-0e1f2a3b4c5d';
const brands = [
  { id: APPLE_ID, name: 'Apple', slug: 'apple' },
  { id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d', name: 'Xiaomi', slug: 'xiaomi' },
];

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1', name: 'Produit', description: '', price: 1000, category: 'phones', image: '', stock: 1,
  ...overrides,
});

describe('resolveProductBrandName', () => {
  it('traduit un uuid de marque en nom lisible', () => {
    expect(resolveProductBrandName(product({ brand: APPLE_ID, name: 'iPhone 13' }), brands)).toBe('Apple');
  });

  it('infère la marque depuis le nom quand brand est absent', () => {
    expect(resolveProductBrandName(product({ name: 'Xiaomi Redmi A5' }), brands)).toBe('Xiaomi');
  });

  it("n'expose jamais un uuid orphelin", () => {
    const name = resolveProductBrandName(
      product({ brand: '11111111-2222-4333-8444-555555555555', name: 'Objet inconnu' }),
      brands,
    );
    expect(name).toBeUndefined();
  });
});

describe('attachBrandNames', () => {
  it("ajoute brandName sans muter l'entrée", () => {
    const input = [product({ brand: APPLE_ID })];
    const out = attachBrandNames(input, brands);
    expect(out[0].brandName).toBe('Apple');
    expect(input[0].brandName).toBeUndefined();
  });
});

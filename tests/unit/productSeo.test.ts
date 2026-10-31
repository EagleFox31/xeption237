import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PRODUCT_SEO_TITLE_MARKER,
  SEO_DESCRIPTION_MAX_LENGTH,
  buildProductSeoDescription,
  buildProductSeoTitle,
  truncateAtWord,
} from '../../utils/productSeo';

describe('buildProductSeoTitle', () => {
  it('reprend la requête « prix Cameroun » avec le montant', () => {
    expect(buildProductSeoTitle('Xiaomi Redmi 15', 100000)).toBe(
      `Xiaomi Redmi 15 prix Cameroun : ${(100000).toLocaleString('fr-FR')} FCFA | Xeption`,
    );
  });

  it('omet le montant sans prix', () => {
    expect(buildProductSeoTitle('Pixel 10', 0)).toBe('Pixel 10 prix Cameroun | Xeption');
    expect(buildProductSeoTitle('Pixel 10', null)).toBe('Pixel 10 prix Cameroun | Xeption');
  });

  it('reste aligné sur la garde du prérendu', () => {
    const prerender = readFileSync(resolve(__dirname, '../../scripts/prerender.mjs'), 'utf8');
    expect(prerender).toContain(`const PRODUCT_TITLE_MARKER = '${PRODUCT_SEO_TITLE_MARKER}';`);
  });
});

describe('truncateAtWord', () => {
  it('laisse intact un texte assez court', () => {
    expect(truncateAtWord('  Grand   écran ', 50)).toBe('Grand écran');
  });

  it('coupe sur un espace et ajoute une ellipse', () => {
    const out = truncateAtWord('Grand écran fluide pour une navigation agréable', 22);
    expect(out).toBe('Grand écran fluide…');
    expect(out.length).toBeLessThanOrEqual(22);
  });

  it('retire la ponctuation pendante avant l’ellipse', () => {
    expect(truncateAtWord('Batterie 7000 mAh, charge rapide incluse', 20)).toBe('Batterie 7000 mAh…');
  });
});

describe('buildProductSeoDescription', () => {
  it('met le prix et le stock en tête', () => {
    const out = buildProductSeoDescription({
      displayName: 'Tecno Spark 50',
      description: 'Batterie 7000 mAh.',
      price: 65000,
      inStock: true,
    });
    expect(out).toBe(`${(65000).toLocaleString('fr-FR')} FCFA · En stock. Batterie 7000 mAh.`);
  });

  it('se rabat sur un texte par défaut sans description ni prix', () => {
    const out = buildProductSeoDescription({ displayName: 'Pixel 10', description: '', price: 0, inStock: false });
    expect(out.startsWith('Sur commande. Pixel 10 disponible chez Xeption Network.')).toBe(true);
  });

  it('respecte la longueur maximale', () => {
    const out = buildProductSeoDescription({
      displayName: 'X',
      description: 'mot '.repeat(100),
      price: 1000,
      inStock: true,
    });
    expect(out.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX_LENGTH);
    expect(out.endsWith('…')).toBe(true);
  });
});

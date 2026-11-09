import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { productJsonLd } from '../../utils/seo';
import { FREE_DELIVERY_THRESHOLD_XAF } from '../../constants/delivery';

const root = resolve(__dirname, '../..');
const offerOf = (price: number) =>
  productJsonLd({ name: 'Test', price, url: 'https://www.xeptionetwork.shop/product/test' }).offers as Record<string, any>;

describe('productJsonLd — données marchandes', () => {
  it('publie la politique de retour des CGV (15 jours, retour en boutique)', () => {
    const policy = offerOf(50000).hasMerchantReturnPolicy;
    expect(policy).toMatchObject({
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'CM',
      merchantReturnDays: 15,
      returnMethod: 'https://schema.org/ReturnInStore',
    });
  });

  it('publie une livraison offerte dès le seuil', () => {
    const shipping = offerOf(FREE_DELIVERY_THRESHOLD_XAF).shippingDetails;
    expect(shipping.shippingRate).toEqual({ '@type': 'MonetaryAmount', value: 0, currency: 'XAF' });
    expect(shipping.shippingDestination.addressCountry).toBe('CM');
  });

  it("n'invente pas de tarif de livraison sous le seuil", () => {
    expect(offerOf(FREE_DELIVERY_THRESHOLD_XAF - 1).shippingDetails).toBeUndefined();
  });
});

describe('fourre-tout SPA (soft 404)', () => {
  it('vercel.json réécrit les URL inconnues vers le shell brut, pas vers l’accueil prérendu', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
    const catchAll = vercel.rewrites.find((r: { source: string }) => r.source.startsWith('/((?!assets/'));
    expect(catchAll.destination).toBe('/spa.html');
  });

  it('le prérendu écrit bien ce shell', () => {
    const prerender = readFileSync(resolve(root, 'scripts/prerender.mjs'), 'utf8');
    expect(prerender).toContain("const SPA_FALLBACK_FILE = 'spa.html';");
  });

  it('le routeur a une route fourre-tout noindex', () => {
    const app = readFileSync(resolve(root, 'App.tsx'), 'utf8');
    expect(app).toMatch(/<Route path="\*" element={<NotFoundPage \/>} \/>/);
    const page = readFileSync(resolve(root, 'pages/NotFoundPage.tsx'), 'utf8');
    expect(page).toMatch(/\bnoindex\b/);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SHOP_PRICE_OFFER_CAP_RATIO,
  capCreditToShopPrice,
  findLowestShopPrice,
  isSameShopModel,
  shopModelTokens,
  shopPriceCreditCap,
  shopPriceSearchToken,
} from '../utils/shopPriceCap';
import { computeOfferV2 } from '../utils/trocPricing';
import type { TrocDeviceForm } from '../types';

const SHOP = [
  { name: 'Google Pixel 8 Pro 128 Go', price: '260000' },
  { name: 'Google Pixel 8 Pro 256 Go', price: '280000' },
  { name: 'Google Pixel 8a 128 Go', price: '175000' },
  { name: 'Google Pixel 8 5G', price: '165000' },
  { name: 'Google Pixel 8 Pro 128 Go Non scellé (US/Japan)', price: '205000' },
];

describe('Plafond prix boutique — correspondance du modèle', () => {
  it('retire la marque répétée en tête du modèle', () => {
    expect(shopModelTokens('Google', 'Google Pixel 8 Pro')).toEqual(['pixel', '8', 'pro']);
  });

  it('ne confond pas une déclinaison (Pixel 8 ≠ Pixel 8 Pro ≠ Pixel 8a)', () => {
    expect(findLowestShopPrice('Google', 'Pixel 8 Pro', SHOP)).toBe(205000);
    expect(findLowestShopPrice('Google', 'Pixel 8', SHOP)).toBe(165000);
    expect(findLowestShopPrice('Google', 'Pixel 8a', SHOP)).toBe(175000);
  });

  it('S23 ne prend pas le prix du S23 Ultra', () => {
    expect(isSameShopModel('Samsung Galaxy S23 Ultra 256 Go', ['s23'])).toBe(false);
    expect(isSameShopModel('Samsung Galaxy S23 128 Go', ['s23'])).toBe(true);
  });

  it('modèle sans chiffre ou absent de la boutique → pas de plafond', () => {
    expect(findLowestShopPrice('Apple', 'iPhone', [{ name: 'Apple iPhone 13', price: 300000 }])).toBeNull();
    expect(findLowestShopPrice('Google', 'Pixel 9', SHOP)).toBeNull();
    expect(shopPriceSearchToken('Apple', 'iPhone')).toBeNull();
    expect(shopPriceSearchToken('Google', 'Pixel 8 Pro')).toBe('8');
  });

  it('ignore les prix nuls, invalides ou sans nom', () => {
    expect(
      findLowestShopPrice('Google', 'Pixel 8 Pro', [
        { name: 'Google Pixel 8 Pro', price: 0 },
        { name: null, price: 1000 },
        { name: 'Google Pixel 8 Pro', price: 'abc' },
      ]),
    ).toBeNull();
  });
});

describe('Plafond prix boutique — montant', () => {
  it('plafonne au ratio du prix le plus bas, arrondi au pas inférieur', () => {
    expect(shopPriceCreditCap(205000)).toBe(Math.floor((205000 * SHOP_PRICE_OFFER_CAP_RATIO) / 5000) * 5000);
    expect(shopPriceCreditCap(null)).toBeNull();
    expect(shopPriceCreditCap(0)).toBeNull();
  });

  it("ne touche pas une offre déjà sous le plafond, ni une offre refusée", () => {
    expect(capCreditToShopPrice(100000, 205000)).toBe(100000);
    expect(capCreditToShopPrice(0, 205000)).toBe(0);
    expect(capCreditToShopPrice(365000, null)).toBe(365000);
  });

  it('cas réel : une offre de 365 000 sur un modèle vendu 205 000 est ramenée sous le prix boutique', () => {
    const capped = capCreditToShopPrice(365000, 205000);
    expect(capped).toBeLessThan(205000);
    expect(capped).toBe(shopPriceCreditCap(205000));
  });
});

describe('computeOfferV2 — intégration du plafond', () => {
  const form = {
    deviceBrand: 'Google',
    deviceModel: 'Pixel 8 Pro',
    powersOn: true,
    hasWaterDamage: false,
  } as unknown as TrocDeviceForm;
  const HIGH_MARKET_BASE = 700000;

  it("le crédit et le cash ne dépassent jamais le plafond boutique", () => {
    const free = computeOfferV2(form, HIGH_MARKET_BASE, null, false);
    const capped = computeOfferV2(form, HIGH_MARKET_BASE, null, false, 205000);
    const cap = shopPriceCreditCap(205000)!;
    expect(free.tradeInValueCredit).toBeGreaterThan(cap);
    expect(capped.tradeInValueCredit).toBe(cap);
    expect(capped.tradeInValueCash).toBeLessThanOrEqual(cap);
  });

  it('sans prix boutique, le résultat est inchangé (non-régression)', () => {
    expect(computeOfferV2(form, HIGH_MARKET_BASE, null, false, null)).toEqual(
      computeOfferV2(form, HIGH_MARKET_BASE, null, false),
    );
  });
});

describe('Copies client / serveur', () => {
  it('utils/shopPriceCap.ts et _shared/shopPriceCap.ts sont identiques', () => {
    const root = resolve(__dirname, '..');
    const client = readFileSync(resolve(root, 'utils/shopPriceCap.ts'), 'utf8');
    const server = readFileSync(resolve(root, 'supabase/functions/_shared/shopPriceCap.ts'), 'utf8');
    expect(server).toBe(client);
  });
});

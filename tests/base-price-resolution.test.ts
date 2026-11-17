import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  SHOP_BASE_ROUNDING_XAF,
  SHOP_TO_TRADE_IN_BASE_RATIO,
  resolveFirstBasePrice,
  shopPriceToBasePrice,
} from '../utils/basePriceResolution';
import { findLowestShopPrice } from '../utils/shopPriceCap';

// Catalogue boutique fictif (noms et prix de forme réelle, aucune donnée client).
const SHOP = [
  { name: 'Google Pixel 8 Pro 128 Go', price: '260000' },
  { name: 'Google Pixel 8 Pro 256 Go', price: '280000' },
  { name: 'Google Pixel 8 Pro 128 Go Non scellé', price: '205000' },
  { name: 'Google Pixel 8a 128 Go', price: '175000' },
];

describe('shopPriceToBasePrice', () => {
  it('convertit le prix boutique en base de reprise, arrondie au pas inférieur', () => {
    // 205 000 × 1,7 = 348 500 → 345 000
    expect(shopPriceToBasePrice(205_000)).toBe(345_000);
    const base = shopPriceToBasePrice(123_456)!;
    expect(base % SHOP_BASE_ROUNDING_XAF).toBe(0);
    expect(base).toBeLessThanOrEqual(123_456 * SHOP_TO_TRADE_IN_BASE_RATIO);
  });

  it.each([null, undefined, 0, -1, Number.NaN])('pas de prix boutique exploitable (%s) → null', (value) => {
    expect(shopPriceToBasePrice(value as number | null | undefined)).toBeNull();
  });
});

describe('resolveFirstBasePrice', () => {
  it('le catalogue de reprise prime : les sources suivantes ne sont pas appelées', async () => {
    const shop = vi.fn(() => 345_000);
    const market = vi.fn(async () => 1_090_000);
    const result = await resolveFirstBasePrice([
      { source: 'catalog', load: () => 300_000 },
      { source: 'shop', load: shop },
      { source: 'market', load: market },
    ]);
    expect(result).toEqual({ basePrice: 300_000, source: 'catalog' });
    expect(shop).not.toHaveBeenCalled();
    expect(market).not.toHaveBeenCalled();
  });

  it('Given un Pixel 8 Pro hors catalogue de reprise, When la boutique le vend, Then la base vient du prix boutique, pas du marché', async () => {
    const market = vi.fn(async () => 1_090_000);
    const lowest = findLowestShopPrice('Google', 'Pixel 8 Pro', SHOP);
    const result = await resolveFirstBasePrice([
      { source: 'catalog', load: () => 0 },
      { source: 'shop', load: async () => shopPriceToBasePrice(await Promise.resolve(lowest)) },
      { source: 'market', load: market },
    ]);
    expect(result).toEqual({ basePrice: 345_000, source: 'shop' });
    expect(market).not.toHaveBeenCalled();
  });

  it('modèle absent de la boutique → market-price-intel (comportement antérieur)', async () => {
    const lowest = findLowestShopPrice('Google', 'Pixel 5', SHOP);
    const result = await resolveFirstBasePrice([
      { source: 'shop', load: () => shopPriceToBasePrice(lowest) },
      { source: 'market', load: async () => 150_000 },
    ]);
    expect(result).toEqual({ basePrice: 150_000, source: 'market' });
  });

  it('une source en erreur est ignorée, pas bloquante', async () => {
    const result = await resolveFirstBasePrice([
      { source: 'shop', load: async () => { throw new Error('réseau'); } },
      { source: 'market', load: async () => 200_000 },
    ]);
    expect(result).toEqual({ basePrice: 200_000, source: 'market' });
  });

  it('aucune source → base 0, source none (le serveur refuse avec no_base_price)', async () => {
    const result = await resolveFirstBasePrice([
      { source: 'shop', load: () => null },
      { source: 'market', load: async () => undefined },
    ]);
    expect(result).toEqual({ basePrice: 0, source: 'none' });
  });
});

describe('Copies client / serveur', () => {
  it('utils/basePriceResolution.ts et _shared/basePriceResolution.ts sont identiques', () => {
    const root = resolve(__dirname, '..');
    const client = readFileSync(resolve(root, 'utils/basePriceResolution.ts'), 'utf8');
    const server = readFileSync(resolve(root, 'supabase/functions/_shared/basePriceResolution.ts'), 'utf8');
    expect(server).toBe(client);
  });
});

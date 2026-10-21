import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dedupeBrandOptions, normalizeProductName } from '../supabase/functions/_shared/telegramProductCreate';
import { normalizeSamsungGalaxySpelling } from '../utils/productDisplay';

describe('bot Telegram : nom et marque normalisés avant création', () => {
  it('corrige Galaxie en Galaxy et compacte les espaces', () => {
    expect(normalizeProductName('  Samsung  galaxie   A15 ')).toBe('Samsung Galaxy A15');
    expect(normalizeProductName('iPhone 13')).toBe('iPhone 13');
  });

  it('reste aligné sur la règle Galaxy de la vitrine', () => {
    for (const raw of ['Galaxie S24', 'GALAXIE Tab', 'Galaxy A05']) {
      expect(normalizeProductName(raw)).toBe(normalizeSamsungGalaxySpelling(raw));
    }
  });

  it('ne propose qu’une seule marque Samsung', () => {
    const brands = [
      { id: '1', name: 'Apple', slug: 'apple' },
      { id: '2', name: 'Samsung Galaxy', slug: 'samsung-galaxy' },
      { id: '3', name: 'Samsung', slug: 'samsung' },
    ];
    expect(dedupeBrandOptions(brands).map((b) => b.id)).toEqual(['1', '3']);
  });

  it('garde les variantes Samsung si aucune entrée canonique', () => {
    const brands = [{ id: '2', name: 'Samsung Galaxy', slug: 'samsung-galaxy' }];
    expect(dedupeBrandOptions(brands)).toEqual(brands);
  });

  it('le bot applique la normalisation au nom saisi et au sélecteur de marque', () => {
    const bot = readFileSync('supabase/functions/telegram-bot-entry/index.ts', 'utf8');
    expect(bot).toContain('const name = normalizeProductName(rawName);');
    expect(bot).toContain('dedupeBrandOptions(');
  });
});

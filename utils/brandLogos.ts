import type { BrandRef } from './productBrand';

/** Slug Simple Icons (cdn.simpleicons.org) — fallback lettre si absent */
const SIMPLE_ICON_SLUG: Record<string, string> = {
  apple: 'apple',
  samsung: 'samsung',
  'samsung-galaxy': 'samsung',
  xiaomi: 'xiaomi',
  'google-pixel': 'google',
  huawei: 'huawei',
  infinix: 'infinix',
  tecno: 'tecno',
  blackview: 'blackview',
  oppo: 'oppo',
  honor: 'honor',
  oneplus: 'oneplus',
  nokia: 'nokia',
  motorola: 'motorola',
  cmf: 'nothing',
  oraimo: 'oraimo',
};

const resolveSlug = (brand: BrandRef): string | null => {
  const slug = (brand.slug || brand.name).toLowerCase().trim();
  if (SIMPLE_ICON_SLUG[slug]) return SIMPLE_ICON_SLUG[slug];
  const byName = brand.name.toLowerCase();
  if (byName.includes('samsung')) return 'samsung';
  if (byName.includes('apple') || byName.includes('iphone') || byName.includes('ipad')) return 'apple';
  if (byName.includes('google') || byName.includes('pixel')) return 'google';
  if (byName.includes('xiaomi') || byName.includes('redmi')) return 'xiaomi';
  return SIMPLE_ICON_SLUG[slug] ?? null;
};

/** URL logo marque (Simple Icons CDN) ou null → afficher initiale */
export const getBrandLogoUrl = (brand: BrandRef, color = '1a1a1a'): string | null => {
  const iconSlug = resolveSlug(brand);
  if (!iconSlug) return null;
  return `https://cdn.simpleicons.org/${iconSlug}/${color}`;
};

export const getBrandInitial = (name: string): string =>
  (name.trim().charAt(0) || '?').toUpperCase();

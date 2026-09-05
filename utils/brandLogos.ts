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

/** Logos locaux `/public/logos` — tailles hero pour affichage décoratif */
const LOCAL_BRAND_LOGOS: Record<string, { path: string; heroH: number; heroMaxW: number }> = {
  apple: { path: '/logos/apple.svg', heroH: 88, heroMaxW: 88 },
  samsung: { path: '/logos/samsung.svg', heroH: 72, heroMaxW: 220 },
  xiaomi: { path: '/logos/xiaomi.svg', heroH: 88, heroMaxW: 88 },
  google: { path: '/logos/google.svg', heroH: 80, heroMaxW: 80 },
  huawei: { path: '/logos/huawei.svg', heroH: 56, heroMaxW: 160 },
  honor: { path: '/logos/honor.svg', heroH: 56, heroMaxW: 140 },
  oppo: { path: '/logos/oppo.svg', heroH: 56, heroMaxW: 120 },
  oneplus: { path: '/logos/oneplus.svg', heroH: 56, heroMaxW: 140 },
  nokia: { path: '/logos/nokia.svg', heroH: 56, heroMaxW: 120 },
  vivo: { path: '/logos/vivo.svg', heroH: 56, heroMaxW: 120 },
  infinix: { path: '/logos/infinix.svg', heroH: 48, heroMaxW: 140 },
  asus: { path: '/logos/asus.svg', heroH: 56, heroMaxW: 120 },
  acer: { path: '/logos/acer.svg', heroH: 56, heroMaxW: 120 },
  dell: { path: '/logos/dell.svg', heroH: 56, heroMaxW: 120 },
  hp: { path: '/logos/hp.svg', heroH: 56, heroMaxW: 80 },
  lenovo: { path: '/logos/lenovo.svg', heroH: 48, heroMaxW: 140 },
  microsoft: { path: '/logos/microsoft.svg', heroH: 56, heroMaxW: 160 },
  msi: { path: '/logos/msi.svg', heroH: 56, heroMaxW: 120 },
  sony: { path: '/logos/sony.svg', heroH: 48, heroMaxW: 120 },
  jbl: { path: '/logos/jbl.svg', heroH: 56, heroMaxW: 100 },
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

export const brandNameToRef = (name: string): BrandRef => {
  const trimmed = name.trim();
  const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
  return { id: slug, name: trimmed, slug };
};

export type BrandHeroLogoAsset =
  | { kind: 'local'; path: string; heroH: number; heroMaxW: number }
  | { kind: 'cdn'; url: string; heroH: number; heroMaxW: number };

/** Logo grand format pour fond sombre (local prioritaire, sinon Simple Icons blanc). */
export const resolveBrandHeroLogo = (brandName: string): BrandHeroLogoAsset | null => {
  const brand = brandNameToRef(brandName);
  const slug = resolveSlug(brand);
  if (!slug) return null;

  const local = LOCAL_BRAND_LOGOS[slug];
  if (local) return { kind: 'local', ...local };

  const url = getBrandLogoUrl(brand, 'FFFFFF');
  if (!url) return null;
  return { kind: 'cdn', url, heroH: 80, heroMaxW: 80 };
};

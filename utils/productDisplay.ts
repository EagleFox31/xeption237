import type { Product } from '../types';

export type ProductBadgeVariant =
  | 'certified'
  | 'sealed'
  | 'unsealed'
  | 'origin'
  | 'sim';

export type ProductBadge = {
  id: string;
  label: string;
  variant: ProductBadgeVariant;
};

/** Samsung Galaxy — corrige « Galaxie » (français) vers la graphie officielle. */
export function normalizeSamsungGalaxySpelling(text: string): string {
  return text.replace(/\bGalaxie\b/gi, 'Galaxy');
}

const specValue = (product: Product, label: string): string | null => {
  const hit = product.specs?.find(
    (s) => s.label.trim().toLowerCase() === label.toLowerCase(),
  );
  return hit?.value?.trim() || null;
};

const parseOriginFromName = (name: string): string | null => {
  const match = name.match(/\(([^)]+)\)\s*$/);
  return match?.[1]?.trim() || null;
};

/** Nom catalogue sans conditionnement, SIM ni provenance entre parenthèses. */
export function getProductDisplayName(product: Pick<Product, 'name' | 'specs'>): string {
  let name = normalizeSamsungGalaxySpelling((product.name || '').trim());

  // Provenance en fin de nom
  name = name.replace(/\s*\([^)]*\)\s*$/g, '');
  // Phrases entières (ordre important — évite le « Goé » si on coupe « scellé »)
  name = name.replace(/\s+non[\s-]*scell[ée]\s*/gi, ' ');
  name = name.replace(/\s+scell[ée]\s*/gi, ' ');
  name = name.replace(/\s+(sim\+esim|1sim|2sims?)\b/gi, ' ');
  // Corruption résiduelle type « 256 Goé »
  name = name.replace(/(\d+)\s*goé\b/gi, '$1 Go');
  name = name.replace(/\s+\bon\b\s*$/gi, '');

  name = name.replace(/\s+/g, ' ').trim();
  name = normalizeSamsungGalaxySpelling(name);
  return name || normalizeSamsungGalaxySpelling(product.name);
}

export function getProductBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = [];
  const packagingSpec = specValue(product, 'Conditionnement');
  const packagingFromName = /\bnon[\s-]*scell[ée]\b/i.test(product.name)
    ? 'Non scellé'
    : /\bscell[ée]\b/i.test(product.name) && !/\bnon[\s-]*scell[ée]\b/i.test(product.name)
      ? 'Scellé'
      : null;
  const packaging = packagingSpec || packagingFromName;

  const isSealed =
    product.condition === 'new' ||
    packaging?.toLowerCase() === 'scellé' ||
    packaging?.toLowerCase() === 'scelle';

  const isUnsealed =
    packaging?.toLowerCase() === 'non scellé' ||
    packaging?.toLowerCase() === 'non scelle';

  if (isSealed) {
    badges.push({ id: 'sealed', label: 'Scellé', variant: 'sealed' });
  } else if (isUnsealed) {
    badges.push({ id: 'unsealed', label: 'Non scellé', variant: 'unsealed' });
  }

  if (product.condition === 'refurbished') {
    badges.push({ id: 'certified', label: 'Xeption Certified', variant: 'certified' });
  }

  const origin = specValue(product, 'Origine') || parseOriginFromName(product.name);
  if (origin) {
    badges.push({ id: 'origin', label: origin, variant: 'origin' });
  }

  const sim = specValue(product, 'SIM');
  if (sim) {
    badges.push({ id: 'sim', label: sim, variant: 'sim' });
  }

  return badges;
}

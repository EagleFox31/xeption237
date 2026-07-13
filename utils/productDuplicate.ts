import type { Product } from '../types';

export const normalizeCommercialName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sameId = (a?: string, b?: string) => (a || '').trim() === (b || '').trim();

/** Champs obligatoires avant enregistrement */
export const validateProductForSave = (product: Product): string[] => {
  const errors: string[] = [];
  const name = product.name?.trim() || '';

  if (name.length < 2) {
    errors.push('Nom commercial obligatoire (au moins 2 caractères).');
  }
  if (!product.category?.trim()) {
    errors.push('Catégorie obligatoire.');
  }
  if (!product.price || product.price <= 0) {
    errors.push('Prix obligatoire (supérieur à 0 FCFA).');
  }
  if ((product.stock ?? 0) < 0) {
    errors.push('Stock invalide.');
  }

  const img = product.image?.trim() || '';
  if (!img || /placeholder/i.test(img)) {
    errors.push('Image principale obligatoire (uploadez une photo, pas le placeholder).');
  }

  return errors;
};

type DuplicateMatch = {
  product: Product;
  level: 'exact' | 'name-brand' | 'name-only';
};

/** Doublon strict : nom + marque + gamme. */
export const findDuplicateProduct = (
  products: Product[],
  candidate: Product,
  excludeId?: string
): Product | undefined => {
  const normName = normalizeCommercialName(candidate.name);
  if (!normName) return undefined;

  const brand = (candidate.brand || '').trim();
  const range = (candidate.productRange || '').trim();

  return products.find((p) => {
    if (excludeId && p.id === excludeId) return false;
    if (normalizeCommercialName(p.name) !== normName) return false;
    return sameId(p.brand, brand) && sameId(p.productRange, range);
  });
};

/** Même nom + marque (gamme peut différer). */
export const findDuplicateByNameAndBrand = (
  products: Product[],
  candidate: Product,
  excludeId?: string
): Product | undefined => {
  const normName = normalizeCommercialName(candidate.name);
  if (!normName) return undefined;

  const brand = (candidate.brand || '').trim();
  if (!brand) return undefined;

  return products.find((p) => {
    if (excludeId && p.id === excludeId) return false;
    if (normalizeCommercialName(p.name) !== normName) return false;
    return sameId(p.brand, brand);
  });
};

/** Même nom commercial (marque / gamme peuvent différer ou être vides). */
export const findDuplicateByNameOnly = (
  products: Product[],
  candidate: Product,
  excludeId?: string
): Product | undefined => {
  const normName = normalizeCommercialName(candidate.name);
  if (!normName) return undefined;

  return products.find((p) => {
    if (excludeId && p.id === excludeId) return false;
    return normalizeCommercialName(p.name) === normName;
  });
};

/** Cherche le doublon le plus pertinent (strict → nom+marque → nom seul). */
export const findBestDuplicateMatch = (
  products: Product[],
  candidate: Product,
  excludeId?: string
): DuplicateMatch | undefined => {
  const exact = findDuplicateProduct(products, candidate, excludeId);
  if (exact) return { product: exact, level: 'exact' };

  const nameBrand = findDuplicateByNameAndBrand(products, candidate, excludeId);
  if (nameBrand) return { product: nameBrand, level: 'name-brand' };

  const nameOnly = findDuplicateByNameOnly(products, candidate, excludeId);
  if (nameOnly) return { product: nameOnly, level: 'name-only' };

  return undefined;
};

import type { Product } from '../types';

/**
 * Un produit est visible en vitrine sauf s'il est explicitement masqué
 * (créé depuis Telegram, en attente de validation direction, ou refusé).
 * La RLS laisse le staff lire les masqués : la vitrine doit donc filtrer elle-même.
 */
export const isStorefrontVisible = (product: Pick<Product, 'isPublished'>): boolean =>
  product.isPublished !== false;

export const filterStorefrontProducts = <T extends Pick<Product, 'isPublished'>>(products: readonly T[]): T[] =>
  products.filter(isStorefrontVisible);

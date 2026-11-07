import type { Product } from '../types';
import { getProductDisplayName } from './productDisplay';
import { productPath } from './routes';

export interface PriceTableRow {
  name: string;
  path: string;
  condition: 'Neuf' | 'Reconditionné';
  price: number;
  inStock: boolean;
}

/** Lignes du tableau de prix : produits à prix connu, du moins cher au plus cher. */
export const buildPriceTableRows = (products: Product[]): PriceTableRow[] =>
  products
    .filter((p) => p.price > 0)
    .map((p) => ({
      name: getProductDisplayName(p),
      path: productPath(p),
      condition: p.condition === 'refurbished' ? ('Reconditionné' as const) : ('Neuf' as const),
      price: p.price,
      inStock: p.stock > 0,
    }))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'fr'));

/** Date lisible du relevé (« 7 novembre 2026 ») : celle du rendu, donc du prix affiché. */
export const formatPriceTableDate = (date: Date): string =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Douala' });

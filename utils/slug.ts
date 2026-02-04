import { Product } from '../types';

export const slugify = (input: string): string => {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
};

export const getProductSlug = (product: Product): string => {
  const base = slugify(product.name || 'product');
  return `${base}-${product.id}`;
};

export const parseProductIdFromSlug = (slug: string): string | null => {
  const match = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (match) return match[1];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    return slug;
  }
  return null;
};

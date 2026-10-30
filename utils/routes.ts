import { Product } from '../types';
import { getProductSlug } from './slug';

/** Constructeurs d'URL publiques : source unique pour les liens crawlables. */
export const productPath = (product: Product): string => `/product/${getProductSlug(product)}`;
export const landingPath = (slug: string): string => `/categorie/${slug}`;
export const guidePath = (slug: string): string => `/guides/${slug}`;
export const helpPath = (slug?: string): string => (slug ? `/aide/${slug}` : '/aide');
export const GUIDES_INDEX_PATH = '/guides';

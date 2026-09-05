import type { Product } from '../types';

/** Similarité 0–1 (Levenshtein normalisée) — fallback typo uniquement */
const stringSimilarity = (a: string, b: string): number => {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return (longerLength - costs[s2.length]) / longerLength;
};

const productHaystack = (p: Product): string =>
  [p.name, p.description, p.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/**
 * Score de pertinence pour une requête (0 = pas de match).
 * Multi-mots : tous les mots doivent apparaître (évite « iphone 11 » → iPhone 17).
 */
export const scoreProductSearch = (product: Product, query: string): number => {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const name = product.name.toLowerCase();
  const haystack = productHaystack(product);

  if (name === q) return 100;
  if (name.startsWith(q)) return 95;
  if (name.includes(q)) return 85;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allInHaystack = tokens.every((t) => haystack.includes(t));
    if (!allInHaystack) return 0;
    const allInName = tokens.every((t) => name.includes(t));
    return allInName ? 70 + tokens.length * 3 : 55;
  }

  // Un seul mot : sous-chaîne ou typo proche
  if (haystack.includes(q)) return 50;
  if (stringSimilarity(name, q) >= 0.82) return 25;
  return 0;
};

export const matchesProductSearch = (product: Product, query: string): boolean =>
  scoreProductSearch(product, query) > 0;

export const searchProducts = (
  products: Product[],
  query: string,
  limit?: number,
): Product[] => {
  const q = query.trim();
  if (!q) return products;

  const ranked = products
    .map((product) => ({ product, score: scoreProductSearch(product, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.product.name.localeCompare(b.product.name, 'fr');
    });

  const list = ranked.map((row) => row.product);
  return limit != null ? list.slice(0, limit) : list;
};

/** Limite du dropdown header (scroll si besoin) */
export const HEADER_SEARCH_PREVIEW_LIMIT = 12;

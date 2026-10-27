/**
 * Rapprochement tolérant d'un modèle saisi par le client avec le catalogue trade_in_models.
 * "Galaxy Z Fold5", "z fold 5", "Z Flod 5" → "Z Fold 5" ; "iphone 15 promax" → "iPhone 15 Pro Max".
 * Les chiffres doivent être identiques : une faute de frappe ne fait jamais changer de génération.
 * Fonction pure (sans API Deno) : testée côté Vitest.
 */
export type CatalogModel = { id: string; brand: string; model_name: string; base_price: number | null };

// Mots de gamme souvent ajoutés ou omis par les clients, ignorés des deux côtés.
const NOISE_WORDS = /\b(galaxy|smartphone|telephone|phone|5g|4g)\b/g;

export const compactModel = (value: string, brand = ''): string => {
  let s = (value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const b = (brand || '').toLowerCase().trim();
  if (b) s = s.split(b).join(' ');
  return s.replace(NOISE_WORDS, ' ').replace(/[^a-z0-9]+/g, '');
};

const digitsOf = (s: string): string => (s.match(/\d+/g) || []).join('-');

/** Distance d'édition avec transposition (« flod » → « fold » = 1 faute). */
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
};

const similarity = (a: string, b: string): number =>
  a && b ? 1 - levenshtein(a, b) / Math.max(a.length, b.length) : 0;

export const MIN_MODEL_SIMILARITY = 0.75;

export function matchTradeInModel(brand: string, model: string, catalog: CatalogModel[]): CatalogModel | null {
  const brandKey = compactModel(brand);
  const candidates = catalog.filter((row) => {
    if (!brandKey) return true;
    const rowBrand = compactModel(row.brand);
    return rowBrand === brandKey || similarity(rowBrand, brandKey) >= MIN_MODEL_SIMILARITY;
  });

  let best: CatalogModel | null = null;
  let bestScore = 0;
  for (const row of candidates) {
    const query = compactModel(model, row.brand);
    const target = compactModel(row.model_name, row.brand);
    if (!query || !target || digitsOf(query) !== digitsOf(target)) continue;
    const score = similarity(query, target);
    if (score > bestScore) { best = row; bestScore = score; }
  }
  return bestScore >= MIN_MODEL_SIMILARITY ? best : null;
}

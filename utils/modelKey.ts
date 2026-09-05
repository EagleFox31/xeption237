/**
 * Clé canonique marque+modèle, version CLIENT (navigateur).
 * DOIT rester identique à supabase/functions/_shared/marketKey.ts (runtime Deno) :
 * les deux normalisent pareil pour que les clés matchent entre front et tables market_* / phone_releases.
 * (Duplication assumée : frontière client/edge, pas d'import partagé possible.)
 */
export const normalizeModelKey = (brand: string, model: string): string => {
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // diacritiques combinants
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const b = norm(brand);
  const m = norm(model);
  if (!b && !m) return '';
  if (!b) return m;
  if (!m) return b;
  return `${b}_${m}`;
};

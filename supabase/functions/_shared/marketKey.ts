/**
 * Clé canonique marque+modèle pour les tables market_* (snapshots, trend, demand).
 * PARTAGÉE entre get-market-trend (lecture) et snapshot-market-prices (écriture) :
 * si les deux côtés ne calculent pas la clé à l'identique, les lectures échouent
 * silencieusement (jointure ratée). Une seule source de vérité = ce fichier.
 */
export const buildModelKey = (brand: string, model: string): string => {
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

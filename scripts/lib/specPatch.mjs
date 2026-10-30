/** Logique pure de correction de specs produit (testable sans base de données). */

export const normLabel = (label = '') =>
  label.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const applySpecPatch = (specs, { set = [], remove = [] }) => {
  // Un label réécrit par `set` n'est jamais retiré : sinon il serait supprimé puis rajouté en fin de liste à chaque passe.
  const kept = new Set(set.map((s) => normLabel(s.label)));
  const removed = new Set(remove.map(normLabel).filter((label) => !kept.has(label)));
  const next = (Array.isArray(specs) ? specs : []).filter((s) => !removed.has(normLabel(s.label)));
  for (const patch of set) {
    const idx = next.findIndex((s) => normLabel(s.label) === normLabel(patch.label));
    if (idx >= 0) next[idx] = { ...next[idx], value: patch.value };
    else next.push({ label: patch.label, value: patch.value });
  }
  return next;
};

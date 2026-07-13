/**
 * Aléatoire déterministe — même seed = même résultat pour tous les visiteurs.
 * Utilisé pour faire tourner les sélections (hero, mises en avant) sans backend.
 */

// Constantes du générateur congruentiel linéaire (LCG), variante "Numerical Recipes".
// Choisies pour leur bonne distribution sur 32 bits — ne pas les modifier.
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const UINT32_MAX = 0x100000000;

/** Lundi (minuit, heure locale) de la semaine contenant `date`. */
const mondayOfWeek = (date: Date): Date => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = (d.getDay() + 6) % 7; // 0 = lundi, …, 6 = dimanche
  d.setDate(d.getDate() - dayOfWeek);
  return d;
};

/**
 * Seed encodant le lundi de la semaine courante : `YYYYMMDD`.
 * Stable du lundi au dimanche (liens partageables cohérents),
 * change à chaque nouveau lundi quel que soit le jour de l'an.
 */
export const weekSeed = (now: Date = new Date()): number => {
  const monday = mondayOfWeek(now);
  return monday.getFullYear() * 10000 + (monday.getMonth() + 1) * 100 + monday.getDate();
};

/**
 * Mélange (Fisher-Yates) piloté par un LCG seedé.
 * Même `seed` → même ordre, sans muter le tableau d'entrée.
 */
export const seededShuffle = <T>(arr: T[], seed: number): T[] => {
  let state = seed;
  const nextRandom = (): number => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) & 0xffffffff;
    return (state >>> 0) / UINT32_MAX;
  };

  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

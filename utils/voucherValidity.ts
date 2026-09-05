/**
 * Validité du bon de reprise Smart Troc.
 *
 * Le crédit de reprise est un *plafond* qui se déprécie avec le marché : plus
 * l'appareil repris est récent, plus l'estimation tient longtemps. On indexe donc
 * la durée de validité du bon sur l'année de sortie du modèle repris
 * (`phone_releases.release_year`), pas sur la possession (legacy, non gérée).
 *
 * Barème (âge = année courante − release_year) :
 *   • récent   (≤ 1 an)      → 14 jours
 *   • moyen    (≤ 3 ans)     → 10 jours
 *   • ancien / inconnu       →  7 jours (conservateur : on ne s'engage pas long sur une valeur volatile)
 */

export const VOUCHER_VALIDITY_DAYS = {
  RECENT: 14,
  MID: 10,
  OLD: 7,
} as const;

/** Seuils d'âge (en années) séparant les paliers de validité. */
export const VOUCHER_AGE_THRESHOLDS = {
  RECENT_MAX_YEARS: 1,
  MID_MAX_YEARS: 3,
} as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface VoucherExpiry {
  /** Échéance ISO (UTC) à stocker dans `trade_in_requests.voucher_expires_at`. */
  expiresAt: string;
  /** Nombre de jours de validité appliqué (pour affichage / logs). */
  validityDays: number;
}

/**
 * Calcule l'échéance du bon à partir de l'année de sortie du modèle repris.
 * `now` est injectable pour la testabilité (défaut = maintenant).
 * `releaseYear` null/inconnu → palier le plus court (OLD, 7 j).
 */
export const computeVoucherExpiry = (
  releaseYear: number | null | undefined,
  now: Date = new Date(),
): VoucherExpiry => {
  const validityDays = resolveValidityDays(releaseYear, now);
  const expiresAt = new Date(now.getTime() + validityDays * MS_PER_DAY).toISOString();
  return { expiresAt, validityDays };
};

/**
 * Forfait historique appliqué aux dossiers émis AVANT le barème 7/10/14 j :
 * ils n'ont pas de `voucher_expires_at` en base. On ne veut pas afficher
 * « expiré » sur un bon que la boutique honore encore.
 */
export const LEGACY_VOUCHER_FALLBACK_DAYS = 30;

/**
 * Échéance à AFFICHER pour un bon déjà émis (écran + PDF).
 *
 * ⚠️ Ne pas confondre avec `computeVoucherExpiry`, qui *calcule* l'échéance à la
 * création du bon. Ici on ne fait que relire ce qui a été stocké, avec repli
 * legacy. Une seule source pour les deux rendus du bon.
 */
export const resolveVoucherExpiryIso = (
  expiresAt: string | null | undefined,
  createdAt: string,
): string => {
  if (expiresAt) return expiresAt;
  const created = new Date(createdAt).getTime();
  // Date d'émission illisible : on ne fabrique pas une échéance fantaisiste.
  if (!Number.isFinite(created)) return createdAt;
  return new Date(created + LEGACY_VOUCHER_FALLBACK_DAYS * MS_PER_DAY).toISOString();
};

/** Nombre de jours de validité affiché sur le bon (barème ou forfait legacy 30 j). */
export const resolveVoucherValidityDays = (
  expiresAt: string | null | undefined,
  createdAt: string,
): number => {
  if (expiresAt) {
    const created = new Date(createdAt).getTime();
    const expires = new Date(expiresAt).getTime();
    if (Number.isFinite(created) && Number.isFinite(expires) && expires > created) {
      return Math.round((expires - created) / MS_PER_DAY);
    }
  }
  return LEGACY_VOUCHER_FALLBACK_DAYS;
};

/** Palier de validité (jours) pour une année de sortie donnée. Exporté pour les tests. */
export const resolveValidityDays = (
  releaseYear: number | null | undefined,
  now: Date = new Date(),
): number => {
  if (releaseYear == null || !Number.isFinite(releaseYear)) return VOUCHER_VALIDITY_DAYS.OLD;
  const ageYears = now.getFullYear() - releaseYear;
  if (ageYears <= VOUCHER_AGE_THRESHOLDS.RECENT_MAX_YEARS) return VOUCHER_VALIDITY_DAYS.RECENT;
  if (ageYears <= VOUCHER_AGE_THRESHOLDS.MID_MAX_YEARS) return VOUCHER_VALIDITY_DAYS.MID;
  return VOUCHER_VALIDITY_DAYS.OLD;
};

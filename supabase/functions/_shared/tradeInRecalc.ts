/**
 * Recalcul d'une offre troc existante (action staff `recalculate` de save-trade-in).
 * Pur et sans I/O : la fonction relit le dossier, recalcule avec le même computeOfferV2,
 * puis n'écrit que si l'offre a changé (second appel = zéro écriture).
 */

/** Un bon déjà utilisé en boutique ne doit plus bouger. */
export const RECALC_LOCKED_STATUSES = new Set(['completed']);

/** Ré-expose une ligne trade_in_requests sous la forme du body attendu par computeOfferV2. */
export const tradeInRowToPricingInput = (row: Record<string, unknown>) => ({
  deviceBrand:     String(row.device_brand ?? ''),
  deviceModel:     String(row.device_model ?? ''),
  batteryHealth:   row.battery_health ?? undefined,
  screenCondition: row.screen_condition ?? undefined,
  bodyCondition:   row.body_condition ?? undefined,
  cameraCondition: row.camera_condition ?? undefined,
  previousRepairs: row.previous_repairs ?? undefined,
  powersOn:        row.powers_on ?? undefined,
  chargesNormally: row.charges_normally ?? undefined,
  biometricsWork:  row.biometrics_work ?? undefined,
  hasWaterDamage:  row.has_water_damage ?? undefined,
  hasOriginalBox:  row.has_original_box ?? undefined,
  hasInvoice:      row.has_invoice ?? undefined,
});

/** Colonnes d'offre recalculées ; renvoie null si rien ne change (no-op idempotent). */
export const offerPatchIfChanged = (
  row: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> | null => {
  const changed = Object.keys(next).some((key) => (row[key] ?? null) !== (next[key] ?? null));
  return changed ? next : null;
};

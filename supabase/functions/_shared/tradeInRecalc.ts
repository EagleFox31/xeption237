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

/** Colonnes que le client a vues sur son écran de résultat. */
const CUSTOMER_VISIBLE_OFFER_KEYS = ['trade_in_value', 'trade_in_value_cash', 'blocker_reason'] as const;

/** Séparateur des champs lu par toNotificationView (_shared/staffNotify.ts). */
const FIELD_SEPARATOR = ' — ';

const formatDateFr = (iso: unknown): string | null => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala' })
    : null;
};

/**
 * Tâche staff « prévenir le client » après un recalcul qui change ce que le client a vu.
 * Aucun canal ne joint le client automatiquement : un membre du staff lui écrit et suit la réponse.
 * dedup_key porte la nouvelle valeur : un retry ne duplique rien, un nouveau recalcul différent
 * crée une nouvelle tâche. Renvoie null si l'offre visible n'a pas bougé ou sans téléphone client.
 */
export const customerContactTask = (
  row: Record<string, unknown>,
  patch: Record<string, unknown>,
) => {
  const visibleChanged = CUSTOMER_VISIBLE_OFFER_KEYS.some(
    (key) => key in patch && (row[key] ?? null) !== (patch[key] ?? null),
  );
  const phone = String(row.customer_phone ?? '').trim();
  if (!visibleChanged || !phone) return null;

  const ref = String(row.voucher_reference ?? '').trim() || String(row.id);
  const credit = Number(patch.trade_in_value ?? 0);
  const blocker = patch.blocker_reason ?? null;
  const expires = formatDateFr(row.voucher_expires_at);
  const fields = [
    `${String(row.device_brand ?? '')} ${String(row.device_model ?? '')}`.trim(),
    `Client : ${String(row.customer_name ?? '').trim() || 'sans nom'} (${phone})`,
    "Le client a vu une autre offre à l'estimation : lui écrire sur WhatsApp depuis le numéro boutique",
    blocker || credit <= 0
      ? `Offre corrigée : refusée (${String(blocker ?? 'valeur nulle')})`
      : `Offre corrigée : ${credit} FCFA bon d'achat / ${Number(patch.trade_in_value_cash ?? 0)} FCFA cash`,
  ];
  if (!blocker && credit > 0) {
    fields.push(`Joindre le bon ${ref} (bouton Télécharger dans le dossier)${expires ? `, valable jusqu'au ${expires}` : ''}`);
  }
  return {
    event_type: 'troc_submitted',
    title: 'À faire — prévenir le client (offre corrigée)',
    message: fields.join(FIELD_SEPARATOR),
    link_to_tab: 'troc',
    link_to_id: ref,
    dedup_key: `troc.contact-client.${ref}.${blocker ?? credit}`,
  };
};

/**
 * Smart Troc tranche 3 — logique pure du rachat en boutique (machine à états + validité du bon).
 * Aucune dépendance I/O : testable unitairement, réutilisée par useTrocManager + l'UI admin.
 *
 * Politique d'expiration (décidée 2026-07-21) : période de grâce de 7 jours après `voucher_expires_at`.
 *   • valide          → clôture normale
 *   • grâce (≤ 7 j)   → clôture possible avec MOTIF obligatoire (tracé)
 *   • périmé (> 7 j)   → RÉ-ÉVALUATION forcée (crédit recalculé), l'ancien crédit est caduc
 *   • sans échéance    → dossiers legacy pré-tranche 2, pas de contrainte
 */
import type { TradeInRequest } from '../types';

export type TrocStatus = TradeInRequest['status'];
export type RedemptionState = 'valid' | 'grace' | 'stale' | 'no_expiry';

/** Jours de grâce après l'échéance pendant lesquels un override (avec motif) reste possible. */
export const REDEMPTION_GRACE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Machine à états du rachat. Clé = statut courant, valeur = statuts atteignables.
 * `completed | refused | cancelled` sont terminaux (aucune sortie).
 */
export const TROC_TRANSITIONS: Record<TrocStatus, TrocStatus[]> = {
  in_progress: ['cancelled'],
  pending: ['validated', 'refused', 'cancelled'],
  accepted: ['validated', 'refused', 'cancelled'],
  validated: ['completed', 'cancelled'],
  completed: [],
  refused: [],
  cancelled: [],
};

/** Une transition de statut est-elle autorisée par la machine à états ? */
export const canTransition = (from: TrocStatus, to: TrocStatus): boolean =>
  TROC_TRANSITIONS[from]?.includes(to) ?? false;

/**
 * Jours restants avant l'échéance du bon (négatif = dépassé). null si pas d'échéance.
 * Arrondi au jour entier vers le haut côté positif (« expire dans N j »).
 */
export const voucherDaysLeft = (
  request: Pick<TradeInRequest, 'voucher_expires_at'>,
  now: Date = new Date(),
): number | null => {
  if (!request.voucher_expires_at) return null;
  const diffMs = new Date(request.voucher_expires_at).getTime() - now.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
};

/** État de validité du bon vis-à-vis de l'échéance + grâce. */
export const redemptionState = (
  request: Pick<TradeInRequest, 'voucher_expires_at'>,
  now: Date = new Date(),
): RedemptionState => {
  if (!request.voucher_expires_at) return 'no_expiry';
  const expires = new Date(request.voucher_expires_at).getTime();
  const t = now.getTime();
  if (t <= expires) return 'valid';
  if (t <= expires + REDEMPTION_GRACE_DAYS * MS_PER_DAY) return 'grace';
  return 'stale';
};

export interface CompletionGate {
  /** La clôture est-elle permise en l'état (compte tenu du motif fourni) ? */
  allowed: boolean;
  /** Grâce : un motif est obligatoire pour forcer la clôture. */
  needsReason: boolean;
  /** Périmé : le crédit doit être recalculé (ré-évaluation) avant toute clôture. */
  needsReeval: boolean;
  state: RedemptionState;
}

/**
 * Évalue si un dossier peut être clôturé (`→ completed`) au regard de l'expiration.
 * Ne vérifie PAS la machine à états (utiliser `canTransition` en amont).
 */
export const evaluateCompletion = (
  request: Pick<TradeInRequest, 'voucher_expires_at'>,
  now: Date = new Date(),
  hasReason = false,
): CompletionGate => {
  const state = redemptionState(request, now);
  switch (state) {
    case 'valid':
    case 'no_expiry':
      return { allowed: true, needsReason: false, needsReeval: false, state };
    case 'grace':
      return { allowed: hasReason, needsReason: true, needsReeval: false, state };
    case 'stale':
      return { allowed: false, needsReason: false, needsReeval: true, state };
  }
};

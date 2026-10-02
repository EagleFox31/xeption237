/**
 * Détection de doublons de dossiers SMART TROC.
 *
 * Motivation : un client peut soumettre plusieurs demandes accidentellement
 * (paiement re-tenté, session interrompue, client testant) ou intentionnellement
 * (fraude, IMEI identique). Sans dédup côté staff, on rappelle 2× le même client
 * ou on paie 2× le même appareil.
 *
 * Signal : même numéro téléphone OU même IMEI dans une fenêtre glissante paramétrable.
 * On ignore les dossiers terminaux (dérivés de la machine à états) pour ne pas alerter
 * sur du legacy déjà traité.
 *
 * Retour : `Map<requestId, otherIds[]>` — chaque entrée pointe vers les AUTRES dossiers
 * du même groupe. Permet à l'UI d'afficher le badge ET de linker vers les concurrents.
 */

import type { TradeInRequest } from '../types';
import { isTerminalStatus } from './trocRedemption';

export interface DetectDuplicatesOptions {
  /** Fenêtre glissante en jours (par défaut : 90). */
  windowDays?: number;
  /** Longueur minimale du téléphone (après strip non-digits) pour matcher. Évite les match sur '000' ou champ vide. */
  minPhoneLength?: number;
  /** Horloge injectable (test). */
  now?: () => Date;
}

/**
 * @returns Map<requestId, otherIds[]>. Absent si aucun doublon détecté.
 */
export const detectDuplicates = (
  requests: readonly TradeInRequest[],
  opts: DetectDuplicatesOptions = {},
): Map<string, string[]> => {
  const windowDays = opts.windowDays ?? 90;
  const minPhoneLength = opts.minPhoneLength ?? 8;
  const now = (opts.now ?? (() => new Date()))();
  const cutoff = now.getTime() - windowDays * 86_400_000;

  const active = requests.filter((r) => {
    if (new Date(r.created_at).getTime() < cutoff) return false;
    return !isTerminalStatus(r.status);
  });

  const groups = new Map<string, string[]>();

  const groupBy = (key: string | null | undefined, id: string) => {
    if (!key) return;
    const list = groups.get(key) ?? [];
    if (!list.includes(id)) list.push(id);
    groups.set(key, list);
  };

  // Normalisation : strip non-digits + retire préfixe pays CM (237) s'il est là.
  // "+237 699 111 111", "237699111111", "699111111", "699-111-111" → même clé "699111111".
  const normalizePhone = (raw: string | null | undefined): string => {
    const digits = (raw ?? '').replace(/\D/g, '');
    return digits.replace(/^237/, '');
  };

  for (const r of active) {
    const phone = normalizePhone(r.customer_phone);
    if (phone.length >= minPhoneLength) groupBy(`phone:${phone}`, r.id);
    const imei = (r.imei ?? '').trim();
    if (imei) groupBy(`imei:${imei}`, r.id);
  }

  const result = new Map<string, string[]>();
  for (const ids of groups.values()) {
    if (ids.length <= 1) continue;
    for (const id of ids) {
      const others = ids.filter((x) => x !== id);
      const existing = result.get(id) ?? [];
      for (const o of others) {
        if (!existing.includes(o)) existing.push(o);
      }
      result.set(id, existing);
    }
  }
  return result;
};

/** Le dossier est-il flaggé comme doublon ? */
export const isDuplicate = (
  requestId: string,
  duplicates: Map<string, string[]>,
): boolean => duplicates.has(requestId);

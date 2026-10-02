/**
 * Métriques du funnel SMART TROC — calculs purs à partir de `TradeInRequest[]`
 * et de l'historique de transitions (`trade_in_status_history`).
 *
 * Toute la data est déjà en base (requests + status_history populé par trigger),
 * donc rien à instrumenter de plus. Les métriques AMONT (vues, abandons par step
 * du formulaire côté client) sont dans GA4 — ce module ne les couvre pas.
 *
 * Pur : aucune I/O, aucun side effect. Testable, mémoisable, portable.
 */

import type { TradeInRequest } from '../types';
import {
  TROC_TRANSITIONS,
  TROC_STATUS_LABELS,
  type TrocStatus,
} from './trocRedemption';

export interface StatusHistoryEntry {
  request_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string; // ISO
}

export interface FunnelStep {
  status: TrocStatus;
  label: string;
  count: number;
  /** % par rapport à l'étape d'entrée (= `pending`). */
  pctFromEntry: number;
  /** % par rapport à l'étape précédente dans l'ordre du pipeline (null pour la 1re). */
  pctFromPrev: number | null;
}

export interface FunnelKpis {
  /** Dossiers créés dans la fenêtre (hors `in_progress` tant qu'ils ne sont pas soumis). */
  totalSubmissions: number;
  /** Dossiers arrivés à `completed`. */
  successful: number;
  /** completed / totalSubmissions. */
  conversionRate: number;
  /** (refused + cancelled) / totalSubmissions — abandons/refus explicites. */
  abandonRate: number;
  /** Temps médian entre `pending` et `completed` en jours (null si trop peu de données). */
  medianDaysToComplete: number | null;
}

/** Ordre canonique du pipeline SMART TROC — reflété dans l'UI du funnel. */
export const PIPELINE_ORDER: readonly TrocStatus[] = [
  'pending',
  'accepted',
  'contacted',
  'appointment',
  'validated',
  'completed',
];

/** `in_progress` n'est pas une soumission ; on ne le compte pas dans le funnel. */
const SUBMITTED_STATUSES: ReadonlySet<TrocStatus> = new Set<TrocStatus>(
  (Object.keys(TROC_TRANSITIONS) as TrocStatus[]).filter((s) => s !== 'in_progress'),
);

/** Clôtures qui comptent comme abandon (vs clôture positive `completed`). */
const ABANDONED_STATUSES: ReadonlySet<TrocStatus> = new Set<TrocStatus>(['refused', 'cancelled']);

/** Filtrage par fenêtre glissante à partir de `created_at`. */
export const filterByPeriod = (
  requests: readonly TradeInRequest[],
  periodDays: number | 'all',
  now: Date = new Date(),
): TradeInRequest[] => {
  if (periodDays === 'all') return [...requests];
  const cutoff = now.getTime() - periodDays * 86_400_000;
  return requests.filter((r) => new Date(r.created_at).getTime() >= cutoff);
};

/**
 * Compte les dossiers par statut. Un dossier au statut `completed` est aussi
 * compté dans toutes les étapes qu'il a traversées (via l'historique) pour
 * refléter la décroissance monotone du funnel. Si l'historique est manquant
 * (dossier legacy pré-migration 20260923_005), on retombe sur son statut actuel.
 */
export const computeStepCounts = (
  requests: readonly TradeInRequest[],
  history: readonly StatusHistoryEntry[],
): Map<TrocStatus, number> => {
  const historyByRequest = new Map<string, Set<string>>();
  for (const h of history) {
    const set = historyByRequest.get(h.request_id) ?? new Set<string>();
    set.add(h.to_status);
    historyByRequest.set(h.request_id, set);
  }

  const counts = new Map<TrocStatus, number>();
  for (const status of PIPELINE_ORDER) counts.set(status, 0);

  for (const r of requests) {
    if (!SUBMITTED_STATUSES.has(r.status)) continue;
    const visited = historyByRequest.get(r.id);
    for (const step of PIPELINE_ORDER) {
      // Dossier compté à une étape s'il y est passé OU si son statut courant la contient ou l'a dépassée.
      const wasThere = visited?.has(step) ?? false;
      const isAtOrPast = PIPELINE_ORDER.indexOf(r.status) >= PIPELINE_ORDER.indexOf(step);
      if (wasThere || isAtOrPast) counts.set(step, (counts.get(step) ?? 0) + 1);
    }
  }
  return counts;
};

/** Construit les étapes du funnel avec % relatifs. */
export const buildFunnel = (
  requests: readonly TradeInRequest[],
  history: readonly StatusHistoryEntry[],
): FunnelStep[] => {
  const counts = computeStepCounts(requests, history);
  const entry = counts.get(PIPELINE_ORDER[0]) ?? 0;

  return PIPELINE_ORDER.map((status, i) => {
    const count = counts.get(status) ?? 0;
    const prevCount = i === 0 ? null : counts.get(PIPELINE_ORDER[i - 1]) ?? 0;
    return {
      status,
      label: TROC_STATUS_LABELS[status],
      count,
      pctFromEntry: entry === 0 ? 0 : (count / entry) * 100,
      pctFromPrev: prevCount == null ? null : prevCount === 0 ? 0 : (count / prevCount) * 100,
    };
  });
};

/**
 * Médiane d'un échantillon en nombres. Retourne null pour un échantillon vide.
 * Impl simple O(n log n) ; largement suffisant pour les volumes attendus (< 10k).
 */
export const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Temps médian entre deux statuts, exprimé en jours. Retourne null si moins de
 * 3 dossiers ont effectivement traversé les deux statuts (bruit statistique).
 */
export const medianTransitionDays = (
  history: readonly StatusHistoryEntry[],
  from: TrocStatus,
  to: TrocStatus,
  minSample: number = 3,
): number | null => {
  // Pour chaque request, prend la 1re entrée dans `from` et la 1re entrée dans `to`.
  const byRequest = new Map<string, { from?: number; to?: number }>();
  for (const h of history) {
    const key = h.request_id;
    const slot = byRequest.get(key) ?? {};
    const ts = new Date(h.changed_at).getTime();
    if (h.to_status === from && slot.from === undefined) slot.from = ts;
    if (h.to_status === to   && slot.to   === undefined) slot.to   = ts;
    byRequest.set(key, slot);
  }

  const durationsDays: number[] = [];
  for (const { from: f, to: t } of byRequest.values()) {
    if (f == null || t == null || t < f) continue;
    durationsDays.push((t - f) / 86_400_000);
  }

  if (durationsDays.length < minSample) return null;
  return median(durationsDays);
};

export const computeKpis = (
  requests: readonly TradeInRequest[],
  history: readonly StatusHistoryEntry[],
): FunnelKpis => {
  const submitted = requests.filter((r) => SUBMITTED_STATUSES.has(r.status));
  const total = submitted.length;
  const successful = submitted.filter((r) => r.status === 'completed').length;
  const abandoned = submitted.filter((r) => ABANDONED_STATUSES.has(r.status)).length;
  const medianDays = medianTransitionDays(history, 'pending', 'completed');

  return {
    totalSubmissions: total,
    successful,
    conversionRate: total === 0 ? 0 : successful / total,
    abandonRate: total === 0 ? 0 : abandoned / total,
    medianDaysToComplete: medianDays,
  };
};

/**
 * Série temporelle : nombre de soumissions par jour sur la fenêtre demandée.
 * Clé = date `YYYY-MM-DD` en UTC. Les jours sans soumission sont présents à 0
 * pour que l'UI puisse tracer une ligne continue.
 */
export const buildSubmissionsPerDay = (
  requests: readonly TradeInRequest[],
  periodDays: number,
  now: Date = new Date(),
): { date: string; count: number }[] => {
  const buckets = new Map<string, number>();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (periodDays - 1));

  for (let i = 0; i < periodDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  const windowStart = start.getTime();
  for (const r of requests) {
    const t = new Date(r.created_at).getTime();
    if (t < windowStart) continue;
    const key = new Date(t).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
};

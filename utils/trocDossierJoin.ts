import type { TradeInRequest, TrocPayment, TrocSession } from '../types';

export type TrocDossierRowKind = 'dossier' | 'awaiting_voucher';

export interface TrocDossierRow {
  id: string;
  kind: TrocDossierRowKind;
  request: TradeInRequest | null;
  payment: TrocPayment | null;
  session: TrocSession | null;
  tier: TrocPayment['tier'] | null;
  sortAt: string;
}

const parseTime = (iso: string): number => new Date(iso).getTime();

export const normalizeCameroonPhone = (raw?: string | null): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '').replace(/^237/, '');
  if (digits.length < 9) return null;
  return digits.slice(-9);
};

export const phonesMatch = (a?: string | null, b?: string | null): boolean => {
  const na = normalizeCameroonPhone(a);
  const nb = normalizeCameroonPhone(b);
  return Boolean(na && nb && na === nb);
};

const isBetterPayment = (candidate: TrocPayment, current: TrocPayment | null): boolean => {
  if (!current) return true;
  if (candidate.status === 'paid' && current.status !== 'paid') return true;
  if (current.status === 'paid' && candidate.status !== 'paid') return false;
  return parseTime(candidate.created_at) > parseTime(current.created_at);
};

/** Préfère un paiement `paid`, sinon le plus récent par session. */
export function pickBestPaymentPerSession(payments: TrocPayment[]): Map<string, TrocPayment> {
  const map = new Map<string, TrocPayment>();
  for (const p of payments) {
    const existing = map.get(p.session_key);
    if (!existing || isBetterPayment(p, existing)) {
      map.set(p.session_key, p);
    }
  }
  return map;
}

/** FK trade_in_request_id → session_key → troc_sessions.trade_in_id */
function pickPaymentForRequest(
  req: TradeInRequest,
  sessions: TrocSession[],
  paymentBySession: Map<string, TrocPayment>,
  allPayments: TrocPayment[],
): TrocPayment | null {
  let best: TrocPayment | null = null;

  for (const p of allPayments) {
    if (p.trade_in_request_id === req.id && isBetterPayment(p, best)) {
      best = p;
    }
  }
  if (best) return best;

  if (req.session_key) {
    const direct = paymentBySession.get(req.session_key);
    if (direct) return direct;
  }

  for (const s of sessions) {
    if (s.trade_in_id !== req.id) continue;
    const p = paymentBySession.get(s.session_key);
    if (p) return p;
  }

  return null;
}

export function buildTrocDossierRows(
  requests: TradeInRequest[],
  sessions: TrocSession[],
  payments: TrocPayment[],
): TrocDossierRow[] {
  const paymentBySession = pickBestPaymentPerSession(payments);
  const sessionByKey = new Map<string, TrocSession>();
  for (const s of sessions) {
    sessionByKey.set(s.session_key, s);
  }

  const linkedPaymentIds = new Set<string>();
  const rows: TrocDossierRow[] = [];

  for (const req of requests) {
    const payment = pickPaymentForRequest(req, sessions, paymentBySession, payments);
    if (payment) linkedPaymentIds.add(payment.id);

    const session =
      (req.session_key ? sessionByKey.get(req.session_key) : null) ??
      (payment ? sessionByKey.get(payment.session_key) : null);

    rows.push({
      id: req.id,
      kind: 'dossier',
      request: req,
      payment,
      session,
      tier: req.tier ?? payment?.tier ?? null,
      sortAt: req.created_at,
    });
  }

  for (const payment of payments) {
    if (linkedPaymentIds.has(payment.id)) continue;
    if (payment.trade_in_request_id && requests.some((r) => r.id === payment.trade_in_request_id)) {
      continue;
    }
    if (
      requests.some(
        (r) => r.session_key === payment.session_key && r.status === 'in_progress',
      )
    ) {
      continue;
    }

    const session = sessionByKey.get(payment.session_key) ?? null;
    if (
      session?.trade_in_id &&
      requests.some((r) => r.id === session.trade_in_id)
    ) {
      continue;
    }

    rows.push({
      id: `pay-${payment.id}`,
      kind: 'awaiting_voucher',
      request: null,
      payment,
      session,
      tier: payment.tier,
      sortAt: payment.paid_at ?? payment.created_at,
    });
  }

  rows.sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1));
  return rows;
}

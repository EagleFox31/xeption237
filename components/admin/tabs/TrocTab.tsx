import React, { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { TradeInRequest, TrocSession, TrocPayment } from '../../../types';
import TableShell from '../shared/TableShell';
import { TrocDetailsModal } from '../modals/TrocDetailsModal';
import { PaymentChannelBadge, PaymentStatusBadge, TierBadge } from '../shared/trocTableBadges';
import { buildTrocDossierRows, phonesMatch } from '../../../utils/trocDossierJoin';

interface TrocTabProps {
  requests: TradeInRequest[];
  sessions: TrocSession[];
  payments: TrocPayment[];
  isLoadingPayments?: boolean;
  onRefresh?: () => void;
  onUpdateStatus: (id: string, status: TradeInRequest['status']) => void;
}

type FilterValue = TradeInRequest['status'] | 'all';
type PaymentFilterValue = TrocPayment['status'] | 'all';
type TierFilterValue = TrocPayment['tier'] | 'all';

const STEPS: Array<{ key: TrocSession['last_step']; label: string }> = [
  { key: 'form', label: 'Formulaire' },
  { key: 'photos', label: 'Photos' },
  { key: 'imei', label: 'IMEI' },
  { key: 'result', label: 'Résultat' },
  { key: 'voucher', label: 'Bon émis' },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'En attente', value: 'pending' },
  { label: 'Accepté', value: 'accepted' },
  { label: 'Validé', value: 'validated' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Refusé', value: 'refused' },
];

const SCORE_COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-500/20 text-green-400',
  orange: 'bg-orange-500/20 text-orange-400',
  red: 'bg-red-500/20 text-red-400',
};

const TRADE_IN_GRADE_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  pieces: 'Pièces',
  refuse: 'Refusé',
};

const BLOCKER_LABELS: Record<string, string> = {
  powers_off: 'Ne s’allume pas',
  water_damage: 'Dégâts d’eau',
  no_base_price: 'Modèle non référencé',
};

const OWNERSHIP_LABELS: Record<string, string> = {
  first: '1er',
  second: '2e',
  third_plus: '3e+',
  unknown: '?',
};

const formatFCFA = (amount?: number) =>
  amount != null ? new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' F' : '—';

const formatXaf = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '.');

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATUS_LABELS: Record<TradeInRequest['status'], string> = {
  in_progress: 'En cours',
  pending: 'En attente',
  accepted: 'Accepté',
  validated: 'Validé',
  completed: 'Terminé',
  refused: 'Refusé',
  cancelled: 'Annulé',
};

const countAtFunnelStep = (sessions: TrocSession[], step: TrocSession['last_step']) => {
  const order = ['form', 'photos', 'imei', 'result', 'voucher'];
  const minIdx = order.indexOf(step);
  return sessions.filter((s) => order.indexOf(s.last_step) >= minIdx).length;
};

const FunnelStrip: React.FC<{ sessions: TrocSession[] }> = ({ sessions }) => {
  const total = sessions.length;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <span className="text-[10px] font-tech uppercase tracking-widest text-white/70">Funnel 30j</span>
      {STEPS.map(({ key, label }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80"
        >
          {label}
          <span className="font-tech font-bold text-white">{countAtFunnelStep(sessions, key)}</span>
        </span>
      ))}
    </div>
  );
};

export const TrocTab: React.FC<TrocTabProps> = ({
  requests,
  sessions,
  payments,
  isLoadingPayments = false,
  onRefresh,
  onUpdateStatus,
}) => {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterValue>('all');
  const [tierFilter, setTierFilter] = useState<TierFilterValue>('all');
  const [search, setSearch] = useState('');
  const [showFunnel, setShowFunnel] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);

  const allRows = useMemo(
    () => buildTrocDossierRows(requests, sessions, payments),
    [requests, sessions, payments],
  );

  const filtered = useMemo(() => {
    let list = allRows;

    if (filter !== 'all') {
      list = list.filter((row) => row.kind === 'dossier' && row.request?.status === filter);
    }

    if (paymentFilter !== 'all') {
      list = list.filter((row) => row.payment?.status === paymentFilter);
    }

    if (tierFilter !== 'all') {
      list = list.filter((row) => row.tier === tierFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((row) => {
        const req = row.request;
        const pay = row.payment;
        const session = row.session;
        return (
          req?.customer_name?.toLowerCase().includes(q) ||
          req?.customer_phone?.includes(q) ||
          req?.device_brand?.toLowerCase().includes(q) ||
          req?.device_model?.toLowerCase().includes(q) ||
          req?.voucher_reference?.toLowerCase().includes(q) ||
          pay?.reference.toLowerCase().includes(q) ||
          pay?.phone.toLowerCase().includes(q) ||
          pay?.customer_name?.toLowerCase().includes(q) ||
          pay?.customer_phone?.includes(q) ||
          pay?.session_key.toLowerCase().includes(q) ||
          session?.device_brand?.toLowerCase().includes(q) ||
          session?.device_model?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [allRows, filter, paymentFilter, tierFilter, search]);

  const dossierCount = filtered.filter((r) => r.kind === 'dossier').length;
  const awaitingCount = filtered.filter((r) => r.kind === 'awaiting_voucher').length;
  const totalValue = filtered.reduce((sum, row) => sum + (row.request?.trade_in_value ?? 0), 0);
  const pendingCount = filtered.filter(
    (row) => row.kind === 'dossier' && row.request?.status === 'pending',
  ).length;

  const revenueByTier = {
    express: payments
      .filter((p) => p.status === 'paid' && p.tier === 'express')
      .reduce((s, p) => s + Number(p.amount ?? 0), 0),
    premium: payments
      .filter((p) => p.status === 'paid' && p.tier === 'premium')
      .reduce((s, p) => s + Number(p.amount ?? 0), 0),
    safety: payments
      .filter((p) => p.status === 'paid' && p.tier === 'safety')
      .reduce((s, p) => s + Number(p.amount ?? 0), 0),
  };
  const grandTotal = revenueByTier.express + revenueByTier.premium + revenueByTier.safety;

  const paymentCounts = {
    all: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    failed: payments.filter((p) => p.status === 'failed').length,
    expired: payments.filter((p) => p.status === 'expired').length,
  };

  const paymentFilterOptions = [
    { id: 'all', label: `Paiement: tous (${paymentCounts.all})` },
    { id: 'pending', label: `Attente (${paymentCounts.pending})` },
    { id: 'paid', label: `Payés (${paymentCounts.paid})` },
    { id: 'failed', label: `Échoués (${paymentCounts.failed})` },
    { id: 'expired', label: `Expirés (${paymentCounts.expired})` },
  ];

  const tierFilterOptions = [
    { id: 'all', label: 'Tous paliers' },
    { id: 'express', label: 'Express' },
    { id: 'premium', label: 'Premium' },
    { id: 'safety', label: 'Sûreté' },
  ];

  const isRefreshing = isLoadingPayments;

  return (
    <div className="animate-in fade-in h-full min-h-0 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 shrink-0 text-xs text-white">
        <span>
          <strong className="font-tech text-base">{dossierCount}</strong>
          <span className="ml-1">dossiers</span>
          <span className="text-white/50 ml-1">/ {requests.length}</span>
          {awaitingCount > 0 && (
            <span className="text-white/50 ml-1">· {awaitingCount} bon(s) non émis</span>
          )}
        </span>
        <span>
          <strong className="text-yellow-300 font-tech">{pendingCount}</strong>
          <span className="ml-1">en attente</span>
        </span>
        <span className="text-xeption-gold font-mono font-bold">{formatFCFA(totalValue)}</span>
        <span className="text-white/40">·</span>
        <span>
          Encaissé <strong className="text-xeption-gold font-mono">{formatXaf(grandTotal)}</strong> F
        </span>
        <span>Express <strong className="font-mono">{formatXaf(revenueByTier.express)}</strong></span>
        <span>Premium <strong className="font-mono">{formatXaf(revenueByTier.premium)}</strong></span>
        <span>Sûreté <strong className="font-mono">{formatXaf(revenueByTier.safety)}</strong></span>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFunnel((v) => !v)}
            className="text-[10px] font-tech uppercase tracking-widest text-white/70 hover:text-white transition-colors"
          >
            Funnel {showFunnel ? '▲' : '▼'}
          </button>
        )}
      </div>

      {showFunnel && <FunnelStrip sessions={sessions} />}

      <div className="flex-1 min-h-0 relative">
        <TableShell
          className="h-full min-h-0"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Client, appareil, référence, téléphone…"
          filterOptions={FILTERS.map((f) => ({ id: f.value, label: f.label }))}
          filterValue={filter}
          onFilterChange={(id) => setFilter(id as FilterValue)}
          resultCount={filtered.length}
          resultLabel="dossier"
          toolbarAddon={
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentFilterValue)}
                className="bg-black/60 border border-white/25 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm outline-none focus:border-xeption-gold cursor-pointer"
                aria-label="Filtrer par statut paiement"
              >
                {paymentFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as TierFilterValue)}
                className="bg-black/60 border border-white/25 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm outline-none focus:border-xeption-gold cursor-pointer"
                aria-label="Filtrer par palier"
              >
                {tierFilterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-sm border border-white/20 bg-black/50 p-2 text-white/80 hover:text-white disabled:opacity-60"
                  aria-label="Actualiser"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          }
        >
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-white/60 text-xs uppercase tracking-wider shadow-md">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Appareil</th>
                <th className="px-4 py-3">Palier</th>
                <th className="px-4 py-3">Frais service</th>
                <th className="px-4 py-3">Opérateur</th>
                <th className="px-4 py-3">Payé le</th>
                <th className="px-4 py-3">Historique</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Valeur reprise</th>
                <th className="px-4 py-3">Qualité</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut dossier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80 text-sm">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="text-center py-10 text-white/50 text-sm">
                    Aucun dossier trouvé.
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const req = row.request;
                const pay = row.payment;
                const session = row.session;
                const isAwaiting = row.kind === 'awaiting_voucher';

                const displayName = req?.customer_name ?? pay?.customer_name ?? '—';
                const formPhone = req?.customer_phone ?? pay?.customer_phone;
                const payPhone = pay?.phone;
                const showPayPhone =
                  payPhone && formPhone && !phonesMatch(payPhone, formPhone);

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-white/5 transition-colors ${isAwaiting ? 'bg-white/[0.03]' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/60">
                      <span>{req?.voucher_reference ?? req?.id?.slice(0, 8) ?? '—'}</span>
                      {pay?.reference && row.kind === 'dossier' && (
                        <p className="text-[10px] text-white/35 mt-0.5 truncate max-w-[9rem]" title={pay.reference}>
                          {pay.reference}
                        </p>
                      )}
                      {isAwaiting && pay?.reference && (
                        <span className="text-white/80">{pay.reference}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{displayName}</p>
                      {formPhone && <p className="text-xs text-white/50">{formPhone}</p>}
                      {showPayPhone && (
                        <p className="text-[10px] text-white/40">Numéro payeur : {payPhone}</p>
                      )}
                      {!formPhone && payPhone && (
                        <p className="text-xs text-white/50">{payPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req ? (
                        <>
                          <p>{req.device_brand} {req.device_model}</p>
                          {(req.device_storage || req.device_ram) && (
                            <p className="text-xs text-white/50">
                              {[req.device_storage, req.device_ram].filter(Boolean).join(' / ')}
                            </p>
                          )}
                        </>
                      ) : session?.device_brand && session?.device_model ? (
                        <p>{session.device_brand} {session.device_model}</p>
                      ) : (
                        <span className="text-white/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={row.tier} />
                    </td>
                    <td className="px-4 py-3">
                      {pay ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-white font-medium text-xs">
                            {formatXaf(Number(pay.amount))} {pay.currency}
                          </span>
                          <PaymentStatusBadge status={pay.status} />
                        </div>
                      ) : (
                        <span className="text-white/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pay ? <PaymentChannelBadge channel={pay.channel} /> : (
                        <span className="text-white/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      {formatDateTime(pay?.paid_at ?? (pay?.status === 'paid' ? pay.created_at : undefined))}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {req?.ownership_rank && (
                        <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-white/60 mr-1">
                          {OWNERSHIP_LABELS[req.ownership_rank] ?? '?'} propriétaire
                        </span>
                      )}
                      {req?.acquisition_condition && (
                        <span className="text-white/50">
                          {req.acquisition_condition === 'new' ? 'Acheté neuf' : 'Acheté occasion'}
                        </span>
                      )}
                      {!req && <span className="text-white/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {req?.ai_score != null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${SCORE_COLOR_CLASSES[req.ai_score_color ?? 'red']}`}
                        >
                          {req.ai_score}/100
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-xeption-gold font-medium">
                        {req ? formatFCFA(req.trade_in_value) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {req ? (
                        <div className="flex flex-col gap-1">
                          <span>
                            {req.trade_in_grade
                              ? TRADE_IN_GRADE_LABELS[req.trade_in_grade] ?? req.trade_in_grade
                              : '—'}
                          </span>
                          {req.trade_in_grade === 'refuse' && req.blocker_reason && (
                            <span
                              className="inline-block self-start px-1.5 py-0.5 rounded-sm bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-medium"
                              title={`Raison technique : ${req.blocker_reason}`}
                            >
                              {BLOCKER_LABELS[req.blocker_reason] ?? req.blocker_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {req ? formatDate(req.created_at) : formatDate(pay?.created_at ?? '')}
                    </td>
                    <td className="px-4 py-3">
                      {req ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          req.status === 'in_progress'
                            ? 'bg-sky-500/20 text-sky-300'
                            : req.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : req.status === 'accepted'
                                ? 'bg-blue-500/20 text-blue-400'
                                : req.status === 'validated'
                                  ? 'bg-green-500/20 text-green-400'
                                  : req.status === 'completed'
                                    ? 'bg-neutral-500/20 text-neutral-400'
                                    : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300">
                          Bon non émis
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="px-2 py-1 bg-white/5 text-white/80 border border-white/10 rounded text-xs hover:bg-white/10 transition-all"
                          >
                            Détails
                          </button>
                          {req.status === 'pending' && (
                            <button
                              onClick={() => onUpdateStatus(req.id, 'validated')}
                              className="px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded text-xs hover:bg-green-600/40 transition-all"
                            >
                              Valider
                            </button>
                          )}
                          {req.status === 'validated' && (
                            <button
                              onClick={() => onUpdateStatus(req.id, 'completed')}
                              className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-xs hover:bg-blue-600/40 transition-all"
                            >
                              Terminer
                            </button>
                          )}
                          {(req.status === 'pending' || req.status === 'accepted') && (
                            <button
                              onClick={() => onUpdateStatus(req.id, 'refused')}
                              className="px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded text-xs hover:bg-red-600/40 transition-all"
                            >
                              Refuser
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      </div>

      {selectedRequest && (
        <TrocDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </div>
  );
};

export default TrocTab;

import React, { useState, useMemo } from 'react';
import type { TradeInRequest, TrocSession } from '../../../types';
import TableShell from '../shared/TableShell';
import { TrocDetailsModal } from '../modals/TrocDetailsModal';

interface TrocTabProps {
  requests: TradeInRequest[];
  sessions: TrocSession[];
  onUpdateStatus: (id: string, status: TradeInRequest['status']) => void;
}

type FilterValue = TradeInRequest['status'] | 'all';

const STEPS: Array<{ key: TrocSession['last_step']; label: string }> = [
  { key: 'form',    label: 'Formulaire' },
  { key: 'photos',  label: 'Photos' },
  { key: 'imei',    label: 'IMEI' },
  { key: 'result',  label: 'Résultat' },
  { key: 'voucher', label: 'Bon émis' },
];

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Tous',      value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Accepté',   value: 'accepted' },
  { label: 'Validé',    value: 'validated' },
  { label: 'Terminé',   value: 'completed' },
  { label: 'Refusé',    value: 'refused' },
];

const SCORE_COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-500/20 text-green-400',
  orange: 'bg-orange-500/20 text-orange-400',
  red:    'bg-red-500/20 text-red-400',
};

const TRADE_IN_GRADE_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  bon:       'Bon',
  pieces:    'Pièces',
  refuse:    'Refusé',
};

// Libellés courts pour le tri dispatch boutique. Cohérents avec evaluationMessages.ts.
const BLOCKER_LABELS: Record<string, string> = {
  powers_off:    'Ne s’allume pas',
  water_damage:  'Dégâts d’eau',
  no_base_price: 'Modèle non référencé',
};

const OWNERSHIP_LABELS: Record<string, string> = {
  first:      '1er',
  second:     '2e',
  third_plus: '3e+',
  unknown:    '?',
};

const formatFCFA = (amount?: number) =>
  amount != null ? new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' F' : '—';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ── Funnel stats ──────────────────────────────────────────────────────────────

const FunnelBar: React.FC<{ sessions: TrocSession[] }> = ({ sessions }) => {
  const total = sessions.length;
  if (total === 0) return null;

  const countAtStep = (step: TrocSession['last_step']) => {
    // Sessions qui ont au moins atteint ce step (ordre des steps)
    const order = ['form', 'photos', 'imei', 'result', 'voucher'];
    const minIdx = order.indexOf(step);
    return sessions.filter(s => order.indexOf(s.last_step) >= minIdx).length;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded p-4 mb-4 shrink-0">
      <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 mb-3">
        Funnel — {total} session{total !== 1 ? 's' : ''} (30 derniers jours)
      </p>
      <div className="flex gap-2 items-end">
        {STEPS.map(({ key, label }, i) => {
          const count = countAtStep(key);
          const pct = Math.round((count / total) * 100);
          const dropPct = i > 0 ? Math.round(((countAtStep(STEPS[i - 1].key) - count) / total) * 100) : 0;
          return (
            <div key={key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-tech font-bold text-white">{count}</span>
              <div className="w-full bg-white/10 rounded-sm overflow-hidden h-12 flex items-end">
                <div
                  className="w-full bg-xeption-gold/70 transition-all"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-tech text-gray-400 text-center leading-tight">{label}</span>
              <span className="text-[9px] text-gray-600">{pct}%</span>
              {dropPct > 0 && (
                <span className="text-[9px] text-red-400">-{dropPct}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const TrocTab: React.FC<TrocTabProps> = ({ requests, sessions, onUpdateStatus }) => {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);

  const filtered = useMemo(() => {
    let list = requests;
    if (filter !== 'all') list = list.filter(r => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_phone?.includes(q) ||
        r.device_brand?.toLowerCase().includes(q) ||
        r.device_model?.toLowerCase().includes(q) ||
        r.voucher_reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, filter, search]);

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h2 className="text-3xl font-tech font-bold uppercase text-white">Smart Troc</h2>
        <span className="text-gray-400 text-sm">{requests.length} dossier{requests.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Funnel */}
      <FunnelBar sessions={sessions} />

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        <input
          type="text"
          placeholder="Recherche client, appareil..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-xeption-gold/50 w-56"
        />
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                filter === f.value ? 'bg-xeption-gold text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 relative">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            Aucune demande de troc trouvée.
          </div>
        ) : (
          <TableShell className="h-full overflow-y-auto border-t border-white/10">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Appareil</th>
                  <th className="px-4 py-3">Historique</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Valeur reprise</th>
                  <th className="px-4 py-3">Qualité</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{req.voucher_reference ?? req.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{req.customer_name}</p>
                      <p className="text-xs text-gray-500">{req.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{req.device_brand} {req.device_model}</p>
                      {(req.device_storage || req.device_ram) && (
                        <p className="text-xs text-gray-500">{[req.device_storage, req.device_ram].filter(Boolean).join(' / ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {req.ownership_rank && (
                        <span className="inline-block px-1.5 py-0.5 bg-white/5 rounded text-gray-400 mr-1">
                          {OWNERSHIP_LABELS[req.ownership_rank] ?? '?'} propriétaire
                        </span>
                      )}
                      {req.acquisition_condition && (
                        <span className="text-gray-500">{req.acquisition_condition === 'new' ? 'Acheté neuf' : 'Acheté occasion'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {req.ai_score != null ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${SCORE_COLOR_CLASSES[req.ai_score_color ?? 'red']}`}>
                          {req.ai_score}/100
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-xeption-gold font-medium">{formatFCFA(req.trade_in_value)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <div className="flex flex-col gap-1">
                        <span>{req.trade_in_grade ? TRADE_IN_GRADE_LABELS[req.trade_in_grade] ?? req.trade_in_grade : '—'}</span>
                        {req.trade_in_grade === 'refuse' && req.blocker_reason && (
                          <span
                            className="inline-block self-start px-1.5 py-0.5 rounded-sm bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-medium"
                            title={`Raison technique : ${req.blocker_reason}`}
                          >
                            {BLOCKER_LABELS[req.blocker_reason] ?? req.blocker_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(req.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        req.status === 'pending'   ? 'bg-yellow-500/20 text-yellow-400' :
                        req.status === 'accepted'  ? 'bg-blue-500/20 text-blue-400' :
                        req.status === 'validated' ? 'bg-green-500/20 text-green-400' :
                        req.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedRequest(req)}
                          className="px-2 py-1 bg-white/5 text-gray-300 border border-white/10 rounded text-xs hover:bg-white/10 transition-all">
                          Détails
                        </button>
                        {req.status === 'pending' && (
                          <button onClick={() => onUpdateStatus(req.id, 'validated')}
                            className="px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded text-xs hover:bg-green-600/40 transition-all">
                            Valider
                          </button>
                        )}
                        {req.status === 'validated' && (
                          <button onClick={() => onUpdateStatus(req.id, 'completed')}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-xs hover:bg-blue-600/40 transition-all">
                            Terminer
                          </button>
                        )}
                        {(req.status === 'pending' || req.status === 'accepted') && (
                          <button onClick={() => onUpdateStatus(req.id, 'refused')}
                            className="px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded text-xs hover:bg-red-600/40 transition-all">
                            Refuser
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </div>

      {selectedRequest && (
        <TrocDetailsModal 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}
    </div>
  );
};

export default TrocTab;

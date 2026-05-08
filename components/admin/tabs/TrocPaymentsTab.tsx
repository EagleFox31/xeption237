import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import type { TrocPayment } from '../../../types';

const STATUS_CONFIG: Record<TrocPayment['status'], { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: 'En attente',  className: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  paid:    { label: 'Payé',        className: 'bg-green-500/20 text-green-400',   icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:  { label: 'Échoué',      className: 'bg-red-500/20 text-red-400',       icon: <XCircle className="w-3 h-3" /> },
  expired: { label: 'Expiré',      className: 'bg-neutral-500/20 text-neutral-400', icon: <AlertTriangle className="w-3 h-3" /> },
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const TrocPaymentsTab: React.FC = () => {
  const [payments, setPayments]   = useState<TrocPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<TrocPayment['status'] | 'all'>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('troc_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setPayments((data as TrocPayment[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.reference.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.session_key.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:     payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid:    payments.filter(p => p.status === 'paid').length,
    failed:  payments.filter(p => p.status === 'failed').length,
    expired: payments.filter(p => p.status === 'expired').length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Référence, téléphone, session…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'paid', 'failed', 'expired'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_CONFIG[s].label} ({counts[s]})
            </button>
          ))}
          <button
            onClick={load}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/60">
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Référence</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Téléphone</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Montant</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Statut</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Créé le</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium text-xs uppercase tracking-wide">Payé le</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-neutral-600 text-sm">Chargement…</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-neutral-600 text-sm">Aucun paiement trouvé</td>
              </tr>
            )}
            {filtered.map((p) => {
              const cfg = STATUS_CONFIG[p.status];
              return (
                <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-white">{p.reference}</td>
                  <td className="px-4 py-3 text-neutral-300">{p.phone}</td>
                  <td className="px-4 py-3 text-white font-medium">{p.amount} {p.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{formatDate(p.paid_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-neutral-700 text-xs">
        {filtered.length} paiement{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} · 200 max par chargement
      </p>
    </div>
  );
};

export default TrocPaymentsTab;

import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle, Loader2, Search } from 'lucide-react';
import type { TradeInRequest } from '../../../types';
import {
  completeTrocWithSale,
  getTargetPricing,
  resteAPayer,
} from '../../../services/trocCheckoutService';
import { TROC_REST_PAYMENT_OPTIONS } from '../../../utils/paymentMethods';
import { adminUi } from '../shared/adminUi';

interface PosTrocPanelProps {
  requests: TradeInRequest[];
  onSuccess: (orderId: string) => void;
  onCancel: () => void;
}

const formatFcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export const PosTrocPanel: React.FC<PosTrocPanelProps> = ({ requests, onSuccess, onCancel }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restPayment, setRestPayment] = useState<'CASH' | 'OM' | 'MOMO' | 'CARD'>('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetPrice, setTargetPrice] = useState<number | null>(null);

  const ready = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'validated' && r.target_product_id,
      ),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ready;
    return ready.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_phone?.includes(q) ||
        r.target_product_name?.toLowerCase().includes(q),
    );
  }, [ready, search]);

  const selected = ready.find((r) => r.id === selectedId) ?? null;
  const credit = Number(selected?.trade_in_value ?? 0);
  const reste = targetPrice != null ? resteAPayer(targetPrice, credit) : null;

  const pickDossier = async (req: TradeInRequest) => {
    setSelectedId(req.id);
    setError(null);
    setTargetPrice(null);
    if (req.target_product_id) {
      const info = await getTargetPricing(req.target_product_id);
      if (info) setTargetPrice(info.price);
    }
  };

  const handleCheckout = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const payMethod = restPayment === 'CARD' ? 'CASH' : restPayment;
      const res = await completeTrocWithSale(selected, { paymentMethod: payMethod });
      onSuccess(res.orderId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de finaliser le troc.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${adminUi.surface} border border-xeption-gold/30 p-4 space-y-4`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold uppercase text-xeption-gold flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" /> Vente Smart Troc
        </h4>
        <button type="button" onClick={onCancel} className={`${adminUi.btnGhost} text-xs`}>
          Retour caisse
        </button>
      </div>

      <p className="text-xs text-white/65 leading-relaxed">
        Choisis un dossier validé avec appareil cible. Le crédit reprise s&apos;impute ; tu encaisses le reste.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Réf. dossier, client, téléphone…"
          className="w-full bg-black/50 border border-white/15 text-white pl-10 pr-3 py-2.5 rounded-sm text-sm focus:border-xeption-gold outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-6">
          Aucun dossier prêt à clôturer. Valide d&apos;abord le dossier dans l&apos;atelier Troc.
        </p>
      ) : (
        <ul className="max-h-40 overflow-y-auto custom-scrollbar space-y-1.5">
          {filtered.slice(0, 12).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => void pickDossier(r)}
                className={`w-full text-left px-3 py-2 rounded-sm border text-sm transition-colors ${
                  selectedId === r.id
                    ? 'border-xeption-gold bg-xeption-gold/10 text-white'
                    : 'border-white/10 hover:border-white/25 text-white/85'
                }`}
              >
                <span className="font-mono text-xeption-gold text-xs">{r.id.slice(0, 8)}</span>
                {' · '}
                {r.customer_name}
                {r.target_product_name && (
                  <span className="block text-[10px] text-white/55 truncate">
                    → {r.target_product_name}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="border-t border-white/10 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/40 p-2 rounded-sm">
              <span className="text-white/50 block">Crédit reprise</span>
              <span className="text-emerald-400 font-mono font-bold">{formatFcfa(credit)}</span>
            </div>
            <div className="bg-black/40 p-2 rounded-sm">
              <span className="text-white/50 block">Reste à encaisser</span>
              <span className="text-xeption-gold font-mono font-bold">
                {reste != null ? formatFcfa(reste) : '…'}
              </span>
            </div>
          </div>

          {reste != null && reste > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {TROC_REST_PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRestPayment(opt.id as typeof restPayment)}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border transition-colors ${
                    restPayment === opt.id
                      ? 'bg-xeption-gold text-black border-xeption-gold'
                      : 'border-white/20 text-white/75 hover:border-white/40'
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="button"
            disabled={busy || targetPrice == null}
            onClick={() => void handleCheckout()}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold uppercase py-3 rounded-sm flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Clôturer la vente Troc
          </button>
        </div>
      )}
    </div>
  );
};

export default PosTrocPanel;

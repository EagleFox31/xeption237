import React, { useState, useEffect } from 'react';
import { X, Download, Camera } from 'lucide-react';
import type { TradeInRequest } from '../../../types';
import type { TransitionResult } from '../../../hooks/admin/useTrocManager';
import { downloadTradeInVoucher } from '../../../utils/tradeInVoucherGenerator';
import { redemptionState, evaluateCompletion, REDEMPTION_GRACE_DAYS } from '../../../utils/trocRedemption';
import { completeTrocWithSale, getTargetPricing, resteAPayer } from '../../../services/trocCheckoutService';
import { reevaluateAndPersist } from '../../../services/trocEvaluationService';
import { VoucherExpiryBadge } from '../shared/VoucherExpiryBadge';
import { notifyError, notifySuccess } from '../../../utils/notify';

interface TrocDetailsModalProps {
  request: TradeInRequest;
  onClose: () => void;
  onTransition: (
    id: string,
    to: TradeInRequest['status'],
    opts?: { reason?: string },
  ) => Promise<TransitionResult>;
}

const SCORE_COLOR_CLASSES: Record<string, string> = {
  green:  'bg-green-500/20 text-green-400 border-green-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  red:    'bg-red-500/20 text-red-400 border-red-500/30',
};

const formatFCFA = (amount?: number) =>
  amount != null ? new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' F' : '—';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const TrocDetailsModal: React.FC<TrocDetailsModalProps> = ({ request, onClose, onTransition }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'OM' | 'MOMO'>('CASH');
  const [targetInfo, setTargetInfo] = useState<{ price: number; stock: number } | null>(null);

  const now = new Date();
  const expiryState = redemptionState(request, now);
  const completion = evaluateCompletion(request, now, !!reason.trim());
  const credit = Number(request.trade_in_value ?? 0);
  const hasTarget = !!request.target_product_id;
  const reste = targetInfo ? resteAPayer(targetInfo.price, credit) : null;

  // Prix/stock de la cible pour afficher le reste à encaisser avant clôture.
  useEffect(() => {
    let alive = true;
    if (request.status === 'validated' && request.target_product_id) {
      getTargetPricing(request.target_product_id).then((info) => {
        if (alive && info) setTargetInfo({ price: info.price, stock: info.stock });
      });
    }
    return () => {
      alive = false;
    };
  }, [request.status, request.target_product_id]);

  const act = async (to: TradeInRequest['status']) => {
    setBusy(true);
    const res = await onTransition(request.id, to, reason.trim() ? { reason: reason.trim() } : undefined);
    setBusy(false);
    if (res.ok) {
      notifySuccess('Dossier mis à jour');
      onClose();
    } else {
      notifyError('Action impossible', res.error);
    }
  };

  // Clôture AVEC vente de la cible (couplage POS) : commande + stock + lien dossier.
  const handleCheckout = async () => {
    setBusy(true);
    try {
      const res = await completeTrocWithSale(request, {
        paymentMethod,
        reason: reason.trim() || undefined,
      });
      notifySuccess('Vente enregistrée', `Commande ${res.orderId} — reste encaissé ${formatFCFA(res.reste)}`);
      onClose();
    } catch (e) {
      notifyError('Clôture impossible', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  // Bon périmé (> grâce) : recalcul du crédit aux conditions du jour, puis réouverture pour finaliser.
  const handleReeval = async () => {
    setBusy(true);
    try {
      const res = await reevaluateAndPersist(request);
      notifySuccess(
        'Crédit ré-évalué',
        `${formatFCFA(res.oldCredit)} → ${formatFCFA(res.newCredit)}. Rouvre le dossier pour finaliser.`,
      );
      onClose();
    } catch (e) {
      notifyError('Ré-évaluation impossible', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-sm w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xl font-bold font-tech text-white uppercase tracking-widest flex items-center gap-3">
              Dossier Troc {request.voucher_reference ?? request.id.slice(0, 8)}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                request.status === 'pending'   ? 'bg-yellow-500/20 text-yellow-400' :
                request.status === 'accepted'  ? 'bg-blue-500/20 text-blue-400' :
                request.status === 'validated' ? 'bg-green-500/20 text-green-400' :
                request.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {request.status}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-sans">Créé le {formatDate(request.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          
          {/* Colonne de gauche : Infos */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Client & Appareil */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Client</p>
                <p className="text-sm text-white font-bold">{request.customer_name}</p>
                <p className="text-xs text-gray-400">{request.customer_phone}</p>
                {request.customer_email && <p className="text-xs text-gray-400">{request.customer_email}</p>}
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Appareil Déclaré</p>
                <p className="text-sm text-white font-bold">{request.device_brand} {request.device_model}</p>
                <p className="text-xs text-gray-400">
                  {request.device_storage && `${request.device_storage} `}
                  {request.device_ram && `/ ${request.device_ram} RAM`}
                </p>
                {request.imei && <p className="text-[10px] font-mono text-gray-500 mt-1">IMEI: {request.imei}</p>}
              </div>
            </div>

            {/* Analyse IA */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest">Analyse IA (Gemini Vision)</p>
                {request.ai_score != null && (
                  <span className={`px-3 py-1 border rounded-full text-sm font-bold font-tech ${SCORE_COLOR_CLASSES[request.ai_score_color ?? 'red']}`}>
                    {request.ai_score} / 100
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 font-sans leading-relaxed">
                {request.ai_justification || <span className="text-gray-600 italic">Aucune justification IA disponible.</span>}
              </p>
            </div>

            {/* Décision et Valeur */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Grade Final</p>
                <p className="text-lg text-white font-bold capitalize">{request.trade_in_grade || '—'}</p>
              </div>
              <div className="bg-xeption-gold/10 border border-xeption-gold/20 p-4 rounded-sm text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-tech text-xeption-gold/70 uppercase tracking-widest mb-1">Valeur Estimée</p>
                <p className="text-2xl font-tech text-xeption-gold font-bold">{formatFCFA(request.trade_in_value)}</p>
              </div>
            </div>

            {/* Bon & rachat en boutique */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest">Bon &amp; rachat boutique</p>
                <VoucherExpiryBadge request={request} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Appareil cible</p>
                  {request.target_product_name ? (
                    <p className="text-sm text-white font-medium">{request.target_product_name}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Bon générique (aucune cible choisie)</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mb-1">Échéance du bon</p>
                  <p className="text-sm text-white">
                    {request.voucher_expires_at ? formatDate(request.voucher_expires_at) : '—'}
                  </p>
                </div>
              </div>

              {/* Piste d'audit */}
              {(request.validated_at || request.completed_at || request.redemption_reason) && (
                <div className="text-[11px] text-gray-400 font-sans border-t border-white/10 pt-3 flex flex-col gap-0.5">
                  {request.validated_at && <p>Validé le {formatDate(request.validated_at)}</p>}
                  {request.completed_at && <p>Terminé le {formatDate(request.completed_at)}</p>}
                  {request.redemption_reason && (
                    <p className="text-orange-300">Motif : {request.redemption_reason}</p>
                  )}
                </div>
              )}

              {/* Actions gardées selon le statut */}
              {(request.status === 'pending' || request.status === 'accepted') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => act('validated')}
                    disabled={busy}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/40 border border-green-600/30 text-green-300 font-tech font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-all disabled:opacity-40"
                  >
                    Valider (appareil vérifié)
                  </button>
                  <button
                    onClick={() => act('refused')}
                    disabled={busy}
                    className="bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 text-red-300 font-tech font-bold uppercase tracking-widest px-4 py-3 text-xs rounded-sm transition-all disabled:opacity-40"
                  >
                    Refuser
                  </button>
                </div>
              )}

              {request.status === 'validated' && (
                <div className="flex flex-col gap-3">
                  {expiryState === 'stale' ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-3 flex flex-col gap-2">
                      <p className="text-xs text-red-300">
                        Bon périmé au-delà de la grâce de {REDEMPTION_GRACE_DAYS} j — le crédit doit être
                        recalculé aux conditions du jour avant la clôture.
                      </p>
                      <button
                        onClick={handleReeval}
                        disabled={busy}
                        className="self-start bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-200 font-tech font-bold uppercase tracking-widest px-4 py-2 text-xs rounded-sm transition-all disabled:opacity-40"
                      >
                        Ré-évaluer le crédit
                      </button>
                    </div>
                  ) : expiryState === 'grace' ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-orange-300">
                        Bon en période de grâce — saisis un motif pour forcer la clôture.
                      </p>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motif (ex. client présent, retard 2 j)"
                        className="bg-[#050505] border border-white/15 rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-xeption-gold"
                      />
                    </div>
                  ) : null}

                  {expiryState !== 'stale' && (hasTarget ? (
                    <div className="flex flex-col gap-3 bg-black/30 border border-white/10 rounded-sm p-3">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Prix {targetInfo ? formatFCFA(targetInfo.price) : '…'}</span>
                        <span>− crédit {formatFCFA(credit)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-tech text-gray-500 uppercase tracking-widest">Reste à encaisser</span>
                        <span className="text-2xl font-tech font-bold text-xeption-gold">
                          {reste != null ? formatFCFA(reste) : '…'}
                        </span>
                      </div>

                      {targetInfo && targetInfo.stock <= 0 && (
                        <p className="text-xs text-red-300">Appareil cible en rupture de stock — vente impossible.</p>
                      )}

                      <div className="flex gap-2">
                        {(['CASH', 'OM', 'MOMO'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`flex-1 py-2 text-xs font-tech font-bold uppercase tracking-wider rounded-sm border transition-all ${
                              paymentMethod === m
                                ? 'bg-xeption-gold/20 border-xeption-gold/50 text-xeption-gold'
                                : 'bg-white/5 border-white/15 text-gray-400 hover:text-white'
                            }`}
                          >
                            {m === 'CASH' ? 'Espèces' : m}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleCheckout}
                          disabled={busy || !completion.allowed || !targetInfo || targetInfo.stock <= 0}
                          className="flex-1 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Encaisser &amp; terminer
                        </button>
                        <button
                          onClick={() => act('cancelled')}
                          disabled={busy}
                          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-tech font-bold uppercase tracking-widest px-4 py-3 text-xs rounded-sm transition-all disabled:opacity-40"
                        >
                          Annuler
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Crée la commande de la cible, décrémente son stock et clôture le dossier.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => act('completed')}
                          disabled={busy || !completion.allowed}
                          className="flex-1 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Terminer l'échange
                        </button>
                        <button
                          onClick={() => act('cancelled')}
                          disabled={busy}
                          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-tech font-bold uppercase tracking-widest px-4 py-3 text-xs rounded-sm transition-all disabled:opacity-40"
                        >
                          Annuler
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        Bon générique (pas de cible) — clôture le dossier ; la vente se fait au POS.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => downloadTradeInVoucher(request)}
                disabled={!request.trade_in_value}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-tech font-bold uppercase tracking-widest py-3 text-xs rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Voir le bon PDF
              </button>
            </div>

          </div>

          {/* Colonne de droite : Photos */}
          <div className="flex-1 flex flex-col gap-4">
            <h4 className="text-[10px] font-tech text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">
              Photos transmises ({request.photo_urls?.length || 0})
            </h4>
            
            {request.photo_urls && request.photo_urls.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {request.photo_urls.map((url, i) => (
                  <a 
                    key={i} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block aspect-[3/4] bg-black/50 border border-white/5 rounded-sm overflow-hidden hover:border-xeption-gold/50 transition-colors group relative"
                  >
                    <img 
                      src={url} 
                      alt={`Photo ${i+1}`} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="bg-black/80 text-white px-3 py-1 rounded text-[10px] font-tech uppercase tracking-widest">
                        Agrandir
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-[200px] border border-dashed border-white/10 rounded-sm flex flex-col items-center justify-center text-gray-500 gap-2">
                <Camera className="w-8 h-8 opacity-50" />
                <p className="text-xs font-tech uppercase tracking-widest">Aucune photo</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

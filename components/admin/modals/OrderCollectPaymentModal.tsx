import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone, X, Banknote, CheckCircle2 } from 'lucide-react';
import { Order } from '../../../types';
import type { OrderPaymentUiState } from '../../../hooks/admin/useOrderPayment';

interface OrderCollectPaymentModalProps {
  order: Order;
  uiState: OrderPaymentUiState;
  error: string | null;
  onClose: () => void;
  onInitiateCampay: (phone: string) => Promise<void>;
  onMarkCashPaid: () => Promise<void>;
  onResetError?: () => void;
}

const OrderCollectPaymentModal: React.FC<OrderCollectPaymentModalProps> = ({
  order,
  uiState,
  error,
  onClose,
  onInitiateCampay,
  onMarkCashPaid,
  onResetError,
}) => {
  const [phone, setPhone] = useState(order.customerPhone?.replace(/\s/g, '') ?? '');
  
  // Détection du mode par défaut selon ce qui a été choisi lors de la commande
  const isCashDefault =
    !order.paymentMethod ||
    order.paymentMethod.toUpperCase() === 'CASH' ||
    order.paymentMethod.toLowerCase().includes('cash') ||
    order.paymentMethod.toLowerCase().includes('esp');

  const [collectMethod, setCollectMethod] = useState<'CASH' | 'CAMPAY'>(
    isCashDefault ? 'CASH' : 'CAMPAY'
  );

  const isBusy = uiState === 'initiating' || uiState === 'polling';

  useEffect(() => {
    if (uiState === 'paid') {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [uiState, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collectMethod === 'CASH') {
      await onMarkCashPaid();
    } else {
      await onInitiateCampay(phone);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-md rounded-xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          disabled={isBusy}
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white font-tech uppercase mb-1">
          Encaisser la commande
        </h3>
        <div className="flex items-baseline gap-2 mb-5">
          <span className="font-mono text-xs font-bold text-xeption-gold">#{order.id}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-sm font-bold text-white font-mono">{order.total.toLocaleString('fr-FR')} FCFA</span>
          {order.customerName && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-300 truncate max-w-[150px]">{order.customerName}</span>
            </>
          )}
        </div>

        {uiState === 'paid' ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto animate-bounce" />
            <p className="text-green-400 text-base font-bold">Paiement validé avec succès !</p>
            <p className="text-xs text-gray-400">La commande a été marquée comme livrée et clôturée.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sélecteur de méthode d'encaissement (Espèces vs Mobile Money) */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                Mode d'encaissement
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setCollectMethod('CASH');
                    onResetError?.();
                  }}
                  disabled={isBusy}
                  className={`py-2 px-3 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                    collectMethod === 'CASH'
                      ? 'bg-xeption-gold text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Espèces (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectMethod('CAMPAY');
                    onResetError?.();
                  }}
                  disabled={isBusy}
                  className={`py-2 px-3 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                    collectMethod === 'CAMPAY'
                      ? 'bg-xeption-gold text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  OM / MoMo
                </button>
              </div>
            </div>

            {/* Contenu selon le mode choisi */}
            {collectMethod === 'CASH' ? (
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-2">
                <p className="text-sm text-gray-200 leading-relaxed">
                  Confirme la réception du règlement en <strong>espèces</strong> pour un montant de{' '}
                  <span className="text-xeption-gold font-mono font-bold">
                    {order.total.toLocaleString('fr-FR')} FCFA
                  </span>.
                </p>
                <p className="text-xs text-gray-400">
                  La commande sera immédiatement enregistrée comme réglée et son statut passera à <strong>Livrée</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-lg">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Le client recevra une notification de débit USSD directe sur son compte <strong>Orange Money</strong> ou <strong>MTN MoMo</strong> via la passerelle sécurisée Campay.
                </p>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                    Numéro Mobile Money du client
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white font-mono text-sm focus:border-xeption-gold focus:outline-none"
                      placeholder="699123456"
                      required
                      disabled={isBusy}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            {uiState === 'polling' && (
              <div className="p-3 bg-xeption-gold/10 border border-xeption-gold/30 rounded-lg text-xeption-gold text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>En attente de validation sur le téléphone du client…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full bg-xeption-gold hover:bg-white text-black font-bold py-3 rounded-lg uppercase text-xs tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {collectMethod === 'CASH'
                ? `Valider l'encaissement Espèces (${order.total.toLocaleString('fr-FR')} FCFA)`
                : `Envoyer la demande OM / MoMo (${order.total.toLocaleString('fr-FR')} FCFA)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrderCollectPaymentModal;

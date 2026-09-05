import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone, X } from 'lucide-react';
import { Order } from '../../../types';
import type { OrderPaymentUiState } from '../../../hooks/admin/useOrderPayment';

interface OrderCollectPaymentModalProps {
  order: Order;
  uiState: OrderPaymentUiState;
  error: string | null;
  onClose: () => void;
  onInitiateCampay: (phone: string) => Promise<void>;
  onMarkCashPaid: () => Promise<void>;
}

const OrderCollectPaymentModal: React.FC<OrderCollectPaymentModalProps> = ({
  order,
  uiState,
  error,
  onClose,
  onInitiateCampay,
  onMarkCashPaid,
}) => {
  const [phone, setPhone] = useState(order.customerPhone?.replace(/\s/g, '') ?? '');
  const isCash = order.paymentMethod === 'CASH';
  const isBusy = uiState === 'initiating' || uiState === 'polling';

  useEffect(() => {
    if (uiState === 'paid') {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [uiState, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCash) {
      await onMarkCashPaid();
    } else {
      await onInitiateCampay(phone);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-md rounded-lg shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full"
          disabled={isBusy}
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <h3 className="text-lg font-bold text-white font-tech uppercase mb-1">
          Encaisser la commande
        </h3>
        <p className="text-xs text-gray-500 mb-4">#{order.id} · {order.total.toLocaleString('fr-FR')} FCFA</p>

        {uiState === 'paid' ? (
          <p className="text-green-400 text-sm font-bold">Paiement enregistré — stock consommé.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isCash ? (
              <p className="text-sm text-gray-300">
                Confirme que le client a remis les espèces à la livraison ou au retrait.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Le client reçoit une demande {order.paymentMethod} sur son téléphone. Le stock sera
                  débloqué dès confirmation du paiement.
                </p>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Numéro Mobile Money du client
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-3 py-2.5 text-white text-sm"
                    placeholder="699123456"
                    required
                    disabled={isBusy}
                  />
                </div>
              </>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {uiState === 'polling' && (
              <p className="text-xeption-gold text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                En attente de validation sur le téléphone du client…
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full bg-xeption-gold text-black font-bold py-3 rounded uppercase text-xs tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {isCash ? 'Espèces reçues' : 'Envoyer la demande Campay'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrderCollectPaymentModal;

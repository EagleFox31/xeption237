import React, { useState } from 'react';
import { CheckCircle2, PhoneOff, XCircle } from 'lucide-react';
import type { Order } from '../../../types';
import type { MarkUnreachableResult } from '../../../hooks/admin/useOrdersManager';
import {
  canCancelOrder,
  canMarkDelivered,
  ORDER_CANCEL_REASONS,
  UNREACHABLE_CANCEL_REASON,
  UNREACHABLE_CANCEL_THRESHOLD,
  type OrderCancelReason,
} from '../../../utils/orderWorkflow';

export interface OrderOutcomeHandlers {
  /** Enchaîne les étapes puis ouvre l'encaissement (OrdersTab.handleMarkDelivered). */
  onMarkDelivered: (order: Order) => Promise<void>;
  /** Ouvre la confirmation d'annulation (AdminPanel) avec un motif de la liste fermée. */
  onCancel: (order: Order, reason: OrderCancelReason) => void;
  /** Absent : bouton « Client injoignable » masqué. */
  onMarkUnreachable?: (orderId: string) => Promise<MarkUnreachableResult>;
}

interface OrderOutcomeActionsProps {
  order: Order;
  handlers: OrderOutcomeHandlers;
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message.trim() ? err.message : fallback;

const actionBtn =
  'min-h-[48px] w-full rounded-md px-2 py-2 text-xs font-bold uppercase leading-tight flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-50';

/**
 * Pied collant de la fiche commande : issue de la commande en un geste (téléphone).
 * Livrée = chemin habituel (étapes puis encaissement) ; Annulée = motif obligatoire
 * de la liste fermée ; Client injoignable = tentative comptée côté serveur, et
 * annulation proposée à partir de UNREACHABLE_CANCEL_THRESHOLD tentatives.
 */
const OrderOutcomeActions: React.FC<OrderOutcomeActionsProps> = ({ order, handlers }) => {
  const [busy, setBusy] = useState<'delivered' | 'unreachable' | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState<OrderCancelReason | ''>('');

  const attempts = order.unreachableCount ?? 0;
  const cancellable = canCancelOrder(order);
  const deliverable = canMarkDelivered(order);
  const suggestCancel = cancellable && attempts >= UNREACHABLE_CANCEL_THRESHOLD;
  const unpaid = order.paymentStatus !== 'paid';

  const markDelivered = async () => {
    setBusy('delivered');
    setFeedback(null);
    try {
      await handlers.onMarkDelivered(order);
    } catch (err) {
      setFeedback({ tone: 'error', text: errorText(err, 'Impossible de passer la commande en livrée.') });
    } finally {
      setBusy(null);
    }
  };

  const markUnreachable = async () => {
    if (!handlers.onMarkUnreachable) return;
    setBusy('unreachable');
    setFeedback(null);
    try {
      const { count, skipped } = await handlers.onMarkUnreachable(order.id);
      setFeedback({
        tone: 'ok',
        text: skipped
          ? `Déjà notée il y a moins de 10 min (tentative n°${count}).`
          : `Tentative n°${count} notée : l’équipe est prévenue.`,
      });
    } catch (err) {
      setFeedback({ tone: 'error', text: errorText(err, 'Impossible de noter la tentative.') });
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = (chosen: OrderCancelReason) => {
    setFeedback(null);
    setCancelOpen(false);
    handlers.onCancel(order, chosen);
  };

  return (
    <div
      data-testid="order-outcome-actions"
      className="sticky bottom-0 shrink-0 border-t border-white/10 bg-[#09090b] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2"
    >
      {feedback && (
        <p
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={`text-xs ${feedback.tone === 'error' ? 'text-red-400' : 'text-emerald-300'}`}
        >
          {feedback.text}
        </p>
      )}

      {suggestCancel && !cancelOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2">
          <span className="text-xs text-red-200">
            {attempts} tentatives sans réponse.
          </span>
          <button
            type="button"
            onClick={() => confirmCancel(UNREACHABLE_CANCEL_REASON)}
            className="min-h-[48px] rounded-md border border-red-500 px-3 text-xs font-bold uppercase text-red-300 hover:bg-red-500 hover:text-white"
          >
            Annuler — Client injoignable
          </button>
        </div>
      )}

      {cancelOpen && (
        <div className="space-y-2 rounded-md border border-red-500/30 bg-red-500/5 p-2">
          <label htmlFor={`cancel-reason-${order.id}`} className="block text-xs font-bold uppercase text-red-300">
            Motif d’annulation
          </label>
          <select
            id={`cancel-reason-${order.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value as OrderCancelReason | '')}
            className="min-h-[48px] w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white"
          >
            <option value="">Choisir un motif…</option>
            {ORDER_CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="min-h-[48px] rounded-md border border-white/20 text-xs font-bold uppercase text-white/80 hover:bg-white/10"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!reason}
              onClick={() => reason && confirmCancel(reason)}
              className="min-h-[48px] rounded-md bg-red-600 text-xs font-bold uppercase text-white hover:bg-red-500 disabled:opacity-50"
            >
              Confirmer l’annulation
            </button>
          </div>
        </div>
      )}

      <div className={`grid gap-2 ${cancellable ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={() => void markDelivered()}
          disabled={!deliverable || busy !== null}
          className={`${actionBtn} bg-green-600 text-white hover:bg-green-500`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Livrée
          {unpaid && <span className="text-[9px] font-normal normal-case opacity-80">puis encaissement</span>}
        </button>
        {cancellable && (
          <button
            type="button"
            onClick={() => { setFeedback(null); setCancelOpen((v) => !v); }}
            disabled={busy !== null}
            aria-expanded={cancelOpen}
            className={`${actionBtn} border border-red-500 text-red-400 hover:bg-red-500 hover:text-white`}
          >
            <XCircle className="h-4 w-4" aria-hidden />
            Annulée
          </button>
        )}
        {handlers.onMarkUnreachable && (
          <button
            type="button"
            onClick={() => void markUnreachable()}
            disabled={busy !== null}
            className={`${actionBtn} border border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-black`}
          >
            <PhoneOff className="h-4 w-4" aria-hidden />
            Client injoignable
            <span className="text-[9px] font-normal normal-case opacity-80">tentative n°{attempts + 1}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderOutcomeActions;

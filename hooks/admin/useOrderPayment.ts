import { useCallback, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Order } from '../../types';
import { assertRpcSuccess } from '../../utils/rpcResult';
import { readEdgeFunctionErrorMessage } from '../../utils/edgeFunctionError';

export type OrderPaymentUiState = 'idle' | 'initiating' | 'polling' | 'paid' | 'failed';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 120_000;

export const useOrderPayment = (
  refreshData?: () => void,
  onPaymentSuccess?: (orderId: string) => Promise<void> | void,
  staffEmail?: string | null,
) => {
  const [uiState, setUiState] = useState<OrderPaymentUiState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedRef = useRef<number | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollStartedRef.current = null;
  }, []);

  const pollPaymentStatus = useCallback(
    (reference: string) => {
      stopPolling();
      pollStartedRef.current = Date.now();
      setUiState('polling');

      pollRef.current = setInterval(async () => {
        if (pollStartedRef.current && Date.now() - pollStartedRef.current > POLL_MAX_MS) {
          stopPolling();
          setUiState('failed');
          setError('Délai dépassé — vérifie avec le client si le débit est passé.');
          return;
        }

        try {
          const { data, error: fnError } = await supabase.functions.invoke('get-payment-status', {
            body: { reference },
          });
          if (fnError) return;

          const status = (data as { status?: string })?.status;
          if (status === 'paid') {
            stopPolling();
            setUiState('paid');
            setError(null);
            if (currentOrderIdRef.current && onPaymentSuccess) {
              await onPaymentSuccess(currentOrderIdRef.current);
            }
            refreshData?.();
          } else if (status === 'failed') {
            stopPolling();
            setUiState('failed');
            setError('Paiement refusé ou annulé par le client.');
          }
        } catch {
          /* retry on next tick */
        }
      }, POLL_INTERVAL_MS);
    },
    [refreshData, stopPolling, onPaymentSuccess],
  );

  const initiateCampayPayment = useCallback(
    async (order: Order, phone: string) => {
      setError(null);
      setUiState('initiating');
      currentOrderIdRef.current = order.id;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user?.email) {
          const msg = 'Session staff expirée ou non connectée. Veuillez vous reconnecter.';
          setUiState('failed');
          setError(msg);
          throw new Error(msg);
        }

        const { data, error: fnError } = await supabase.functions.invoke('create-order-payment', {
          body: { orderId: order.id, phone: phone.replace(/\s/g, '') },
        });

        if (fnError) {
          setUiState('failed');
          const errorMsg = await readEdgeFunctionErrorMessage(
            fnError,
            'Impossible d\'initier la demande Mobile Money. Vérifiez le numéro ou réessayez.',
          );
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        const payload = data as { error?: string; reference?: string; alreadyPaid?: boolean };
        if (payload.error) {
          setUiState('failed');
          setError(payload.error);
          throw new Error(payload.error);
        }
        if (payload.alreadyPaid) {
          setUiState('paid');
          setError(null);
          if (onPaymentSuccess) {
            await onPaymentSuccess(order.id);
          }
          refreshData?.();
          return '';
        }
        if (!payload.reference) {
          setUiState('failed');
          const errorMsg = 'Référence paiement manquante.';
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        pollPaymentStatus(payload.reference);
        return payload.reference;
      } catch (err: unknown) {
        setUiState('failed');
        const msg = err instanceof Error ? err.message : 'Impossible de lancer le paiement.';
        setError(msg);
        throw err;
      }
    },
    [pollPaymentStatus, onPaymentSuccess, refreshData],
  );

  const markCashPaid = useCallback(
    async (orderId: string) => {
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const effectiveStaffEmail = staffEmail || session?.user?.email || undefined;

        const { data, error: rpcError } = await supabase.rpc('mark_order_cash_paid', {
          p_order_id: orderId,
          p_staff_email: effectiveStaffEmail,
        });

        if (rpcError) {
          const msg = rpcError.message || 'Impossible d\'enregistrer le paiement espèces.';
          setUiState('failed');
          setError(msg);
          throw new Error(msg);
        }

        assertRpcSuccess(data, 'Impossible d\'enregistrer le paiement espèces.');
        setUiState('paid');
        setError(null);
        if (onPaymentSuccess) {
          await onPaymentSuccess(orderId);
        }
        refreshData?.();
      } catch (err: unknown) {
        setUiState('failed');
        const msg = err instanceof Error ? err.message : 'Erreur lors de l\'encaissement espèces.';
        setError(msg);
        throw err;
      }
    },
    [refreshData, onPaymentSuccess, staffEmail],
  );

  const resetPaymentUi = useCallback(() => {
    stopPolling();
    setUiState('idle');
    setError(null);
  }, [stopPolling]);

  return {
    uiState,
    error,
    setError,
    initiateCampayPayment,
    markCashPaid,
    resetPaymentUi,
  };
};


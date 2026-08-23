import { useCallback, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Order } from '../types';
import { assertRpcSuccess } from '../utils/rpcResult';

export type OrderPaymentUiState = 'idle' | 'initiating' | 'polling' | 'paid' | 'failed';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 120_000;

export const useOrderPayment = (refreshData?: () => void) => {
  const [uiState, setUiState] = useState<OrderPaymentUiState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedRef = useRef<number | null>(null);

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
          setError('Délai dépassé — vérifie avec le client si le paiement est passé.');
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
    [refreshData, stopPolling],
  );

  const initiateCampayPayment = useCallback(
    async (order: Order, phone: string) => {
      setError(null);
      setUiState('initiating');

      const { data, error: fnError } = await supabase.functions.invoke('create-order-payment', {
        body: { orderId: order.id, phone: phone.replace(/\s/g, '') },
      });

      if (fnError) {
        setUiState('failed');
        throw new Error(fnError.message || 'Impossible de lancer le paiement.');
      }

      const payload = data as { error?: string; reference?: string; alreadyPaid?: boolean };
      if (payload.error) {
        setUiState('failed');
        throw new Error(payload.error);
      }
      if (!payload.reference) {
        setUiState('failed');
        throw new Error('Référence paiement manquante.');
      }

      pollPaymentStatus(payload.reference);
      return payload.reference;
    },
    [pollPaymentStatus],
  );

  const markCashPaid = useCallback(
    async (orderId: string) => {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('mark_order_cash_paid', {
        p_order_id: orderId,
      });
      if (rpcError) throw rpcError;
      assertRpcSuccess(data, 'Impossible d\'enregistrer le paiement espèces.');
      setUiState('paid');
      refreshData?.();
    },
    [refreshData],
  );

  const resetPaymentUi = useCallback(() => {
    stopPolling();
    setUiState('idle');
    setError(null);
  }, [stopPolling]);

  return {
    uiState,
    error,
    initiateCampayPayment,
    markCashPaid,
    resetPaymentUi,
  };
};

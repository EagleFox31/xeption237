import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { TradeInRequest, TrocPayment } from '../../types';
import { canTransition, evaluateCompletion } from '../../utils/trocRedemption';

export interface TransitionResult {
  ok: boolean;
  error?: string;
}

export type TrocStatusFilter = TradeInRequest['status'] | 'all';

export const useTrocManager = () => {
  const [requests, setRequests]   = useState<TradeInRequest[]>([]);
  const [payments, setPayments]   = useState<TrocPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [filter, setFilter]       = useState<TrocStatusFilter>('all');
  const [search, setSearch]       = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('trade_in_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setRequests(data as TradeInRequest[]);
    setIsLoading(false);
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    const { data } = await supabase
      .from('troc_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) setPayments(data as TrocPayment[]);
    setIsLoadingPayments(false);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchRequests(), fetchPayments()]);
  }, [fetchRequests, fetchPayments]);

  useEffect(() => {
    refreshAll();

    const channel = supabase
      .channel('troc-admin-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_in_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trade_in_requests' }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'troc_payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshAll, fetchRequests, fetchPayments]);

  /**
   * Écriture de statut bas niveau, SANS garde-fou. Conservée pour compat/tests.
   * Pour le rachat en boutique, préférer `transitionStatus` (machine à états + expiration).
   */
  const updateStatus = useCallback(async (id: string, status: TradeInRequest['status']) => {
    const { error } = await supabase
      .from('trade_in_requests')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  }, []);

  /**
   * Transition de statut GARDÉE (rachat boutique) : respecte la machine à états
   * (`utils/trocRedemption`) et la validité du bon (échéance + grâce 7 j), horodate
   * `validated_at`/`completed_at` et trace le motif d'override/ré-évaluation.
   */
  const transitionStatus = useCallback(
    async (
      id: string,
      to: TradeInRequest['status'],
      opts?: { reason?: string },
    ): Promise<TransitionResult> => {
      const req = requests.find(r => r.id === id);
      if (!req) return { ok: false, error: 'Dossier introuvable.' };
      if (!canTransition(req.status, to)) {
        return { ok: false, error: `Transition ${req.status} → ${to} non autorisée.` };
      }

      const nowIso = new Date().toISOString();
      const reason = opts?.reason?.trim();
      const patch: Partial<TradeInRequest> = { status: to };

      if (to === 'validated') {
        patch.validated_at = nowIso;
      }
      if (to === 'completed') {
        const gate = evaluateCompletion(req, new Date(), !!reason);
        if (gate.needsReeval) {
          return { ok: false, error: 'Bon périmé (au-delà de la grâce de 7 j) : ré-évaluation requise avant clôture.' };
        }
        if (!gate.allowed) {
          return { ok: false, error: 'Bon en période de grâce : un motif est obligatoire pour clôturer.' };
        }
        patch.completed_at = nowIso;
        if (reason) patch.redemption_reason = reason;
      }

      const { error } = await supabase
        .from('trade_in_requests')
        .update(patch)
        .eq('id', id);

      if (error) return { ok: false, error: error.message };

      setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
      return { ok: true };
    },
    [requests],
  );

  const filtered = useMemo(() => {
    let list = requests;

    if (filter !== 'all') {
      list = list.filter(r => r.status === filter);
    }

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

  return {
    requests,
    payments,
    filtered,
    isLoading,
    isLoadingPayments,
    filter,
    setFilter,
    search,
    setSearch,
    updateStatus,
    transitionStatus,
    fetchRequests,
    fetchPayments,
    refreshAll,
  };
};

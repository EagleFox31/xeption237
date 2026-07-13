import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { TradeInRequest, TrocPayment } from '../../types';

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

  const updateStatus = useCallback(async (id: string, status: TradeInRequest['status']) => {
    const { error } = await supabase
      .from('trade_in_requests')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  }, []);

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
    fetchRequests,
    fetchPayments,
    refreshAll,
  };
};

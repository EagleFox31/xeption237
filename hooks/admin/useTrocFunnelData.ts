/**
 * Hook data du dashboard SMART TROC — charge les requests + l'historique de
 * statuts, puis dérive toutes les métriques via `utils/trocFunnelMetrics` (pur).
 *
 * Pourquoi un hook séparé de `useTrocManager` ? Deux consommateurs différents :
 *   • `useTrocManager` = tableau opérationnel (mutations, détails, filtres staff)
 *   • `useTrocFunnelData` = lecture agrégée, read-only, poll possible
 * Séparer évite d'inflater le hook principal avec des recomputes à chaque mutation.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { TradeInRequest } from '../../types';
import {
  buildFunnel,
  buildSubmissionsPerDay,
  computeKpis,
  filterByPeriod,
  type FunnelKpis,
  type FunnelStep,
  type StatusHistoryEntry,
} from '../../utils/trocFunnelMetrics';

export type FunnelPeriod = 7 | 30 | 90 | 'all';

export interface UseTrocFunnelDataReturn {
  isLoading: boolean;
  period: FunnelPeriod;
  setPeriod: (p: FunnelPeriod) => void;
  kpis: FunnelKpis;
  funnel: FunnelStep[];
  submissionsPerDay: { date: string; count: number }[];
  refresh: () => Promise<void>;
  requestsCount: number;
}

/** Nombre max de rows à charger. En prod ça devient une pagination si on dépasse. */
const MAX_REQUESTS = 5000;
const MAX_HISTORY = 20000;

export const useTrocFunnelData = (initialPeriod: FunnelPeriod = 30): UseTrocFunnelDataReturn => {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [history, setHistory]   = useState<StatusHistoryEntry[]>([]);
  const [period, setPeriod]     = useState<FunnelPeriod>(initialPeriod);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [reqRes, histRes] = await Promise.all([
      supabase
        .from('trade_in_requests')
        .select('id, status, created_at, customer_phone, imei')
        .order('created_at', { ascending: false })
        .limit(MAX_REQUESTS),
      supabase
        .from('trade_in_status_history')
        .select('request_id, from_status, to_status, changed_at')
        .order('changed_at', { ascending: false })
        .limit(MAX_HISTORY),
    ]);

    if (reqRes.data)  setRequests(reqRes.data as TradeInRequest[]);
    if (histRes.data) setHistory(histRes.data as StatusHistoryEntry[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const windowedRequests = useMemo(
    () => filterByPeriod(requests, period),
    [requests, period],
  );

  const kpis = useMemo(
    () => computeKpis(windowedRequests, history),
    [windowedRequests, history],
  );

  const funnel = useMemo(
    () => buildFunnel(windowedRequests, history),
    [windowedRequests, history],
  );

  const submissionsPerDay = useMemo(() => {
    const days = period === 'all' ? 90 : period;
    return buildSubmissionsPerDay(requests, days);
  }, [requests, period]);

  return {
    isLoading,
    period,
    setPeriod,
    kpis,
    funnel,
    submissionsPerDay,
    refresh: fetchData,
    requestsCount: windowedRequests.length,
  };
};

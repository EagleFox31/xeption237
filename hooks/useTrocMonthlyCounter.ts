import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Compteur des évaluations Smart Troc créées ce mois-ci.
 *
 * Règles d'affichage (côté composant) :
 *   • count < 50    → masquer
 *   • 50-499        → message soft sans chiffre ("Premières évaluations…")
 *   • 500-999       → "Évaluations en temps réel" (sans chiffre)
 *   • count ≥ 1000  → chiffre réel affiché
 *
 * Cache : 5 min en sessionStorage (évite de relancer la requête à chaque navigation).
 */

const CACHE_KEY = 'troc_monthly_counter';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { value: number; expiresAt: number };

const readCache = (): CacheEntry | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!Number.isFinite(parsed?.value) || !Number.isFinite(parsed?.expiresAt)) return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (value: number): void => {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS }),
    );
  } catch {
    // sessionStorage indisponible (ex: mode privé Safari) → cache désactivé silencieusement
  }
};

export interface TrocMonthlyCounterState {
  count: number | null;
  loading: boolean;
  /** Force un nouveau fetch (ignore le cache). */
  refresh: () => Promise<void>;
}

export const useTrocMonthlyCounter = (): TrocMonthlyCounterState => {
  const [count, setCount]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchCount = async (skipCache = false): Promise<void> => {
    if (!skipCache) {
      const cached = readCache();
      if (cached) {
        setCount(cached.value);
        setLoading(false);
        return;
      }
    }

    setLoading(true);

    // RPC SECURITY DEFINER pour bypasser le RLS de trade_in_requests
    // (la table n'accepte que les INSERT anon, pas les SELECT).
    const { data, error } = await supabase.rpc('get_troc_monthly_count');

    if (!error && typeof data === 'number') {
      setCount(data);
      writeCache(data);
    } else {
      // Erreur silencieuse — le composant masque l'affichage si count reste null
      console.warn('[useTrocMonthlyCounter] fetch_failed', error?.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchCount();
  }, []);

  return {
    count,
    loading,
    refresh: () => fetchCount(true),
  };
};

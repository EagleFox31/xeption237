import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { assertRpcSuccess } from '../../utils/rpcResult';
import { QA_TESTS, QA_BLOCKING_TOTAL, type QaTest } from '../../constants/qaTestCatalog';

export type QaStatus = 'pass' | 'fail' | 'skip';

export interface QaRun {
  test_id: string;
  status: QaStatus;
  note: string | null;
  tested_by_name: string | null;
  tested_at: string;
}

export interface QaProgress {
  tested: number;
  total: number;
  failures: number;
  /** Bloquants pas encore validés — la seule question qui compte au lancement. */
  blockingLeft: number;
}

export function useQaTestRuns() {
  const [runs, setRuns] = useState<Record<string, QaRun>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('list_qa_test_runs');
      if (rpcError) throw rpcError;
      const next: Record<string, QaRun> = {};
      for (const row of (data ?? []) as QaRun[]) next[row.test_id] = row;
      setRuns(next);
    } catch (err: any) {
      setError(err?.message || 'Chargement des verdicts impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setVerdict = useCallback(
    async (testId: string, status: QaStatus, note?: string) => {
      setSavingId(testId);
      try {
        const { data, error: rpcError } = await supabase.rpc('set_qa_test_run', {
          p_test_id: testId,
          p_status: status,
          p_note: note ?? null,
        });
        if (rpcError) throw rpcError;
        assertRpcSuccess(data, 'Enregistrement du verdict impossible.');
        await load();
      } finally {
        setSavingId(null);
      }
    },
    [load],
  );

  const resetVerdict = useCallback(
    async (testId: string) => {
      setSavingId(testId);
      try {
        const { data, error: rpcError } = await supabase.rpc('reset_qa_test_run', { p_test_id: testId });
        if (rpcError) throw rpcError;
        assertRpcSuccess(data, 'Réinitialisation impossible.');
        await load();
      } finally {
        setSavingId(null);
      }
    },
    [load],
  );

  const progress: QaProgress = useMemo(() => {
    const values = Object.values(runs);
    // Un test « skip » compte comme traité : quelqu'un a décidé qu'il ne
    // s'appliquait pas. Seul « fail » et l'absence de verdict restent ouverts.
    const blockingDone = new Set(
      values.filter((r) => r.status === 'pass' || r.status === 'skip').map((r) => r.test_id),
    );
    return {
      tested: values.length,
      total: QA_TESTS.length,
      failures: values.filter((r) => r.status === 'fail').length,
      blockingLeft: QA_TESTS.filter(
        (t: QaTest) => t.priority === 'blocking' && !blockingDone.has(t.id),
      ).length,
    };
  }, [runs]);

  return {
    runs,
    loading,
    error,
    savingId,
    progress,
    blockingTotal: QA_BLOCKING_TOTAL,
    setVerdict,
    resetVerdict,
    reload: load,
  };
}

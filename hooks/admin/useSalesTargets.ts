import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  parseSalesTargetsProgress,
  type SalesTargetsProgress,
  type TargetPeriodKind,
  type TargetScopeType,
} from '../../utils/salesTargets';

export const useSalesTargets = () => {
  const [data, setData] = useState<SalesTargetsProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProgress = useCallback(async (staffId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { data: raw, error: rpcError } = await supabase.rpc('get_sales_targets_progress', {
        p_staff_id: staffId ?? null,
      });
      if (rpcError) throw rpcError;
      setData(parseSalesTargetsProgress(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les objectifs');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTarget = useCallback(
    async (input: {
      scopeType: TargetScopeType;
      periodKind: TargetPeriodKind;
      targetAmount: number;
      staffId?: string | null;
      storeId?: string | null;
      id?: string | null;
      active?: boolean;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const { error: rpcError } = await supabase.rpc('upsert_sales_target', {
          p_scope_type: input.scopeType,
          p_period_kind: input.periodKind,
          p_target_amount: input.targetAmount,
          p_staff_id: input.staffId ?? null,
          p_store_id: input.storeId ?? null,
          p_active: input.active ?? true,
          p_id: input.id ?? null,
        });
        if (rpcError) throw rpcError;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const removeTarget = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('delete_sales_target', { p_id: id });
      if (rpcError) throw rpcError;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Suppression impossible';
      setError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveBonusRule = useCallback(
    async (input: {
      label: string;
      minAchievementPercent: number;
      bonusAmount: number;
      sortOrder?: number;
      active?: boolean;
      id?: string | null;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const { error: rpcError } = await supabase.rpc('upsert_bonus_rule', {
          p_label: input.label,
          p_min_achievement_percent: input.minAchievementPercent,
          p_bonus_amount: input.bonusAmount,
          p_sort_order: input.sortOrder ?? 0,
          p_active: input.active ?? true,
          p_id: input.id ?? null,
        });
        if (rpcError) throw rpcError;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const removeBonusRule = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('delete_bonus_rule', { p_id: id });
      if (rpcError) throw rpcError;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Suppression impossible';
      setError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    saving,
    fetchProgress,
    saveTarget,
    removeTarget,
    saveBonusRule,
    removeBonusRule,
  };
};

import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { notifyError, notifySuccess } from '../../utils/notify';
import {
  CATALOG_HEALTH_SNOOZE_DAYS,
  parseCatalogHealthFinding,
  parseCatalogHealthScanResult,
  summarizeCatalogHealth,
  type CatalogHealthFinding,
} from '../../utils/catalogHealth';

export const useCatalogHealth = () => {
  const [findings, setFindings] = useState<CatalogHealthFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = summarizeCatalogHealth(findings);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('list_catalog_health_findings');
      if (rpcError) throw rpcError;
      setFindings((data ?? []).map(parseCatalogHealthFinding).filter((row): row is CatalogHealthFinding => row !== null));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Impossible de lire les alertes catalogue.';
      setError(message);
      setFindings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const rescan = useCallback(async () => {
    setScanning(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('scan_catalog_health');
      if (rpcError) throw rpcError;
      const counts = parseCatalogHealthScanResult(data);
      await refresh();
      if (counts.openData + counts.openMetier === 0) {
        notifySuccess('Catalogue cohérent', 'Aucune fiche à corriger, aucune rupture.');
      } else {
        notifySuccess(
          'Contrôle terminé',
          `${counts.openData} fiche${counts.openData > 1 ? 's' : ''} à corriger, ${counts.openMetier} rupture${counts.openMetier > 1 ? 's' : ''}.`,
        );
      }
    } catch (e: unknown) {
      notifyError('Contrôle impossible', e instanceof Error ? e.message : undefined);
    } finally {
      setScanning(false);
    }
  }, [refresh]);

  const snooze = useCallback(
    async (id: string) => {
      const { data, error: rpcError } = await supabase.rpc('snooze_catalog_health_finding', {
        p_id: id,
        p_days: CATALOG_HEALTH_SNOOZE_DAYS,
      });
      if (rpcError) {
        notifyError('Impossible de reporter le rappel', rpcError.message);
        return;
      }
      const payload = (data ?? {}) as { success?: boolean; error?: string };
      if (payload.success === false) {
        notifyError('Impossible de reporter le rappel', payload.error);
        return;
      }
      setFindings((current) => current.filter((f) => f.id !== id));
      notifySuccess(`Rappel dans ${CATALOG_HEALTH_SNOOZE_DAYS} jours`);
    },
    [],
  );

  return {
    findings,
    summary,
    loading,
    scanning,
    error,
    refresh,
    rescan,
    snooze,
  };
};

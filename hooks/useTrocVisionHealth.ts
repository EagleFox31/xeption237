import { useEffect, useState } from 'react';
import {
  probeTrocVisionHealth,
  type VisionHealthReport,
} from '../services/trocVisionHealth';

export function useTrocVisionHealth(enabled: boolean) {
  const [report, setReport] = useState<VisionHealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    // Le detail reste accessible a l'equipe sans etre montre au client.
    probeTrocVisionHealth()
      .then((r) => {
        if (!cancelled) setReport(r);
        if (!r.ready) {
          console.warn('[troc-vision]', r.detail, r.actionSteps.length ? r.actionSteps : '');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setupHint =
    report && !report.ready ? report.actionSteps.join(' ') : null;

  return { report, loading, setupHint };
}

import { useEffect, useState } from 'react';
import {
  probeTrocVisionHealth,
  type VisionHealthReport,
  visionChannelLabel,
} from '../services/trocVisionHealth';

export function useTrocVisionHealth(enabled: boolean) {
  const [report, setReport] = useState<VisionHealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    probeTrocVisionHealth()
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setupHint =
    report && !report.ready
      ? report.actionSteps.join(' ')
      : report?.primaryChannel
        ? `Contrôle IA via ${visionChannelLabel[report.primaryChannel]}.`
        : null;

  return { report, loading, setupHint };
}

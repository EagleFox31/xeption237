/**
 * Stratégie vision Smart Troc — lot 4 : un seul canal client (Edge evaluate-device).
 * Secours OpenRouter côté serveur si Gemini échoue (OPENROUTER_API_KEY sur Supabase).
 */

export type VisionHealthReport = {
  ready: boolean;
  edgeAvailable: boolean;
  openRouterFallback: boolean;
  detail: string;
  actionSteps: string[];
};

export async function probeEdgeVisionHealth(): Promise<{
  available: boolean;
  openRouterFallback: boolean;
  detail: string;
}> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase.functions.invoke('evaluate-device', {
      body: { healthCheck: true },
    });

    if (error) {
      return {
        available: false,
        openRouterFallback: false,
        detail: error.message || 'Edge injoignable',
      };
    }

    const payload = data as {
      ready?: boolean;
      code?: string;
      openRouter?: { configured?: boolean };
    };

    const openRouterFallback = Boolean(payload?.openRouter?.configured);

    if (payload?.ready) {
      const suffix = openRouterFallback ? ' · secours OpenRouter actif' : '';
      return {
        available: true,
        openRouterFallback,
        detail: `Edge evaluate-device prêt${suffix}`,
      };
    }

    if (payload?.code === 'missing_api_key') {
      if (openRouterFallback) {
        return {
          available: true,
          openRouterFallback: true,
          detail: 'Gemini absent — secours OpenRouter configuré sur Supabase',
        };
      }
      return {
        available: false,
        openRouterFallback: false,
        detail: 'GEMINI_API_KEY manquant sur Supabase (et pas de secours OpenRouter)',
      };
    }

    return {
      available: false,
      openRouterFallback,
      detail: 'Déployez evaluate-device et configurez GEMINI_API_KEY ou OPENROUTER_API_KEY',
    };
  } catch (err) {
    return {
      available: false,
      openRouterFallback: false,
      detail: err instanceof Error ? err.message : 'Probe Edge échouée',
    };
  }
}

export async function probeTrocVisionHealth(): Promise<VisionHealthReport> {
  const edge = await probeEdgeVisionHealth();

  const actionSteps: string[] = [];
  if (!edge.available) {
    actionSteps.push(
      '1. Supabase → Edge Functions → Secrets : GEMINI_API_KEY=AIza… puis redeploy evaluate-device',
    );
    actionSteps.push(
      '2. Secours (optionnel) : OPENROUTER_API_KEY=sk-or-… sur les mêmes secrets',
    );
  }

  return {
    ready: edge.available,
    edgeAvailable: edge.available,
    openRouterFallback: edge.openRouterFallback,
    detail: edge.detail,
    actionSteps: edge.available ? [] : actionSteps,
  };
}

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
  /** Indisponibilité passagère : réessayer suffit, rien à configurer. */
  transient: boolean;
};

export type VisionHealthReason = 'ready' | 'missing_api_key' | 'unreachable';

export async function probeEdgeVisionHealth(): Promise<{
  available: boolean;
  openRouterFallback: boolean;
  detail: string;
  /** Distingue une clé absente d'une indisponibilité passagère. */
  reason: VisionHealthReason;
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
        reason: 'unreachable',
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
        reason: 'ready',
        detail: `Edge evaluate-device prêt${suffix}`,
      };
    }

    if (payload?.code === 'missing_api_key') {
      if (openRouterFallback) {
        return {
          available: true,
          openRouterFallback: true,
          reason: 'ready',
          detail: 'Gemini absent — secours OpenRouter configuré sur Supabase',
        };
      }
      return {
        available: false,
        openRouterFallback: false,
        reason: 'missing_api_key',
        detail: 'GEMINI_API_KEY manquant sur Supabase (et pas de secours OpenRouter)',
      };
    }

    // `ready:false` sans code connu — modèles injoignables, par exemple.
    // Ce n'est pas une clé manquante : on ne conseille donc rien à configurer.
    return {
      available: false,
      openRouterFallback,
      reason: 'unreachable',
      detail: 'Service de contrôle photo momentanément indisponible',
    };
  } catch (err) {
    return {
      available: false,
      openRouterFallback: false,
      reason: 'unreachable',
      detail: err instanceof Error ? err.message : 'Probe Edge échouée',
    };
  }
}

export async function probeTrocVisionHealth(): Promise<VisionHealthReport> {
  const edge = await probeEdgeVisionHealth();

  /*
   * Ne conseiller d'ajouter une clé QUE si elle manque vraiment.
   *
   * Ces étapes s'affichaient dès que le contrôle échouait, quelle qu'en soit la
   * cause — y compris un simple délai dépassé sur une connexion mobile. Le
   * patron a donc lu « GEMINI_API_KEY non configurée » alors que la clé était en
   * place depuis des mois. Un message faux fait perdre plus de temps qu'un
   * message absent.
   */
  const actionSteps: string[] = [];
  if (edge.reason === 'missing_api_key') {
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
    actionSteps,
    /** Indisponibilité passagère : réessayer suffit, rien à configurer. */
    transient: !edge.available && edge.reason !== 'missing_api_key',
  };
}

/**
 * Stratégie vision Smart Troc — cascade explicite (pas de prière).
 *
 * Ordre :
 *  1. Edge Supabase (GEMINI_API_KEY serveur) — prioritaire dev + prod
 *  2. OpenRouter (VITE_OPENROUTER_API_KEY) — secours quota / clé locale absente
 *  3. Gemini navigateur (VITE_GEMINI_API_KEY AIza…) — dernier recours dev
 *
 * DeepSeek API officielle : texte uniquement → exclu du contrôle photo.
 */

export type VisionChannel = 'edge' | 'openrouter' | 'local-gemini';

export type VisionHealthReport = {
  ready: boolean;
  primaryChannel: VisionChannel | null;
  channels: Record<
    VisionChannel,
    { available: boolean; detail: string }
  >;
  actionSteps: string[];
};

const isLikelyGeminiStudioKey = (key: string): boolean =>
  /^AIza[0-9A-Za-z_-]{20,}/.test(key.trim());

export function getLocalGeminiKeyStatus(): { available: boolean; detail: string } {
  const key = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  if (!key) {
    return { available: false, detail: 'VITE_GEMINI_API_KEY absent' };
  }
  if (!isLikelyGeminiStudioKey(key)) {
    return {
      available: false,
      detail: 'Clé locale invalide (attendu AIza… depuis aistudio.google.com/apikey)',
    };
  }
  return { available: true, detail: 'Clé AI Studio détectée' };
}

export function getOpenRouterKeyStatus(): { available: boolean; detail: string } {
  const key = String(import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
  if (!key) return { available: false, detail: 'VITE_OPENROUTER_API_KEY absent (openrouter.ai)' };
  return { available: true, detail: 'Clé OpenRouter configurée' };
}

export async function probeEdgeVisionHealth(): Promise<{ available: boolean; detail: string }> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase.functions.invoke('evaluate-device', {
      body: { healthCheck: true },
    });

    if (error) {
      const payload = (data ?? {}) as { code?: string };
      if (payload.code === 'missing_api_key') {
        return {
          available: false,
          detail: 'Edge OK mais GEMINI_API_KEY manquant sur Supabase',
        };
      }
      return { available: false, detail: error.message || 'Edge injoignable' };
    }

    const payload = data as { ready?: boolean; code?: string };
    if (payload?.ready) {
      return { available: true, detail: 'Edge evaluate-device + GEMINI_API_KEY prêt' };
    }
    return {
      available: false,
      detail: 'Déployez evaluate-device et : supabase secrets set GEMINI_API_KEY=AIza…',
    };
  } catch (err) {
    return {
      available: false,
      detail: err instanceof Error ? err.message : 'Probe Edge échouée',
    };
  }
}

export async function probeTrocVisionHealth(): Promise<VisionHealthReport> {
  const [edge, localGemini, openRouter] = await Promise.all([
    probeEdgeVisionHealth(),
    Promise.resolve(getLocalGeminiKeyStatus()),
    Promise.resolve(getOpenRouterKeyStatus()),
  ]);

  const channels: VisionHealthReport['channels'] = {
    edge,
    openrouter: openRouter,
    'local-gemini': localGemini,
  };

  const actionSteps: string[] = [];
  if (!edge.available) {
    actionSteps.push(
      '1. Supabase : supabase secrets set GEMINI_API_KEY=AIza… puis supabase functions deploy evaluate-device',
    );
  }
  if (!openRouter.available) {
    actionSteps.push(
      '2. Secours quota : compte openrouter.ai → VITE_OPENROUTER_API_KEY dans .env',
    );
  }
  if (!localGemini.available) {
    actionSteps.push(
      '3. Dev secours : aistudio.google.com/apikey → VITE_GEMINI_API_KEY=AIza… (redémarrer npm run dev)',
    );
  }

  const order: VisionChannel[] = ['edge', 'openrouter', 'local-gemini'];
  const primaryChannel = order.find((c) => channels[c].available) ?? null;

  return {
    ready: primaryChannel !== null,
    primaryChannel,
    channels,
    actionSteps: primaryChannel ? [] : actionSteps,
  };
}

export const visionChannelLabel: Record<VisionChannel, string> = {
  edge: 'Serveur Supabase (Gemini)',
  openrouter: 'OpenRouter (Gemini flash-lite)',
  'local-gemini': 'Gemini local (navigateur)',
};

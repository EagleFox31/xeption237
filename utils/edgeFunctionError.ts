import { FunctionsHttpError } from '@supabase/supabase-js';

const TECHNICAL_MESSAGE = /non-2xx|failed to send a request to the edge function/i;

/** Extrait le message `{ error }` renvoyé par une Edge Function Supabase (404, 429, etc.). */
export async function readEdgeFunctionErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue. Réessaie ou contacte la boutique.',
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body) {
        const msg = (body as { error?: unknown }).error;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
    } catch {
      /* corps illisible */
    }
  }

  if (error instanceof Error && error.message.trim()) {
    if (TECHNICAL_MESSAGE.test(error.message)) return fallback;
    return error.message.trim();
  }

  return fallback;
}

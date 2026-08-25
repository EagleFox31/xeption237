import { GoogleGenAI } from '@google/genai';

/** Chaîne de modèles texte — alignée sur evaluate-device (sondée 2026-08-24). */
const parseModelChain = (raw: string | undefined, fallback: string[]): string[] => {
  const parsed = (raw ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

export const GEMINI_TEXT_MODELS = parseModelChain(
  import.meta.env.VITE_GEMINI_TEXT_MODELS?.trim() || import.meta.env.VITE_GEMINI_TEXT_MODEL?.trim(),
  ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'],
);

/** Pré-check photos Smart Troc — modèles légers, quota free tier plus généreux. */
export const GEMINI_CREDIBILITY_MODELS = parseModelChain(
  import.meta.env.VITE_GEMINI_CREDIBILITY_MODELS?.trim()
    || import.meta.env.VITE_GEMINI_CREDIBILITY_MODEL?.trim(),
  ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite'],
);

/** Premier modèle de la chaîne — compat rétro. */
export const GEMINI_TEXT_MODEL = GEMINI_TEXT_MODELS[0];

export const GEMINI_CREDIBILITY_MODEL = GEMINI_CREDIBILITY_MODELS[0];

export function getGeminiApiKey(): string {
  const fromDefine = typeof process !== 'undefined' ? process.env?.API_KEY : '';
  const fromVite = import.meta.env.VITE_GEMINI_API_KEY;
  const key = String(fromDefine || fromVite || '').trim();

  if (!key) {
    throw new Error(
      'Clé Gemini introuvable. Ajoute VITE_GEMINI_API_KEY=... (ou API_KEY=...) dans xeption237/.env pour le dev local Smart Troc / admin, puis redémarre npm run dev.',
    );
  }

  return key;
}

export function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
}

const geminiErrorStatus = (err: unknown): number | null => {
  if (!err || typeof err !== 'object') return null;
  const e = err as Record<string, unknown>;
  if (typeof e.status === 'number') return e.status;
  if (typeof e.statusCode === 'number') return e.statusCode;
  const msg = String(e.message ?? '');
  const m = msg.match(/\b(404|429|503|502|500)\b/);
  return m ? Number(m[1]) : null;
};

/** Passe au modèle suivant sauf erreur d'authentification clé. */
export const shouldTryNextGeminiModel = (err: unknown): boolean => {
  const status = geminiErrorStatus(err);
  if (status === 401 || status === 403) return false;
  if (status != null) return true;
  const msg = String((err as Error)?.message ?? err ?? '').toLowerCase();
  return msg.includes('no longer available')
    || msg.includes('not found')
    || msg.includes('404')
    || msg.includes('503')
    || msg.includes('429')
    || msg.includes('timeout')
    || msg.includes('resource_exhausted');
};

export async function withGeminiModelChain<T>(
  models: string[],
  run: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await run(model);
    } catch (err) {
      lastError = err;
      if (!shouldTryNextGeminiModel(err)) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Aucun modèle Gemini disponible');
}

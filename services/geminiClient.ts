import { GoogleGenAI } from '@google/genai';

/** Aligné sur les edge functions (evaluate-device, market-price-intel). */
export const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';

/** Pré-check photos Smart Troc — modèle léger, quota free tier plus généreux. */
export const GEMINI_CREDIBILITY_MODEL =
  import.meta.env.VITE_GEMINI_CREDIBILITY_MODEL?.trim() || 'gemini-2.0-flash-lite';

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

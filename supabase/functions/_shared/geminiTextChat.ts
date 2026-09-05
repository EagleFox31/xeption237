import { DEFAULT_TEXT_MODELS, parseModelChain, shouldTryNextModel } from './geminiModels.ts';

const GEMINI_TIMEOUT_MS = 30_000;
const TOTAL_GEMINI_BUDGET_MS = 45_000;

const GEMINI_TEXT_MODELS = parseModelChain(Deno.env.get('GEMINI_TEXT_MODELS'), DEFAULT_TEXT_MODELS);

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const shouldTryFallback = (status: number): boolean => status === 429 || status === 503 || status >= 500;

export type GeminiChatTurn = { role: 'user' | 'model'; text: string };

const buildContents = (history: GeminiChatTurn[], message: string) => {
  const turns = [
    ...history
      .filter((item) => (item.role === 'user' || item.role === 'model') && item.text.trim())
      .slice(-20),
    { role: 'user' as const, text: message.trim() },
  ];

  return turns.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
};

const extractText = (payload: unknown): string => {
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('').trim();
};

export const geminiTextChat = async (params: {
  systemInstruction: string;
  history: GeminiChatTurn[];
  message: string;
}): Promise<{ ok: true; text: string } | { ok: false; code: string; detail?: string }> => {
  const primaryKey = Deno.env.get('GEMINI_API_KEY')?.trim() || '';
  const fallbackKey = Deno.env.get('GEMINI_API_KEY_FALLBACK')?.trim() || '';
  const keys = [
    ...(primaryKey ? [{ key: primaryKey, label: 'primary' as const }] : []),
    ...(fallbackKey && fallbackKey !== primaryKey ? [{ key: fallbackKey, label: 'fallback' as const }] : []),
  ];

  if (!keys.length) {
    return { ok: false, code: 'missing_gemini_key' };
  }

  const contents = buildContents(params.history, params.message);
  const startedAt = Date.now();

  for (const model of GEMINI_TEXT_MODELS) {
    if (Date.now() - startedAt >= TOTAL_GEMINI_BUDGET_MS) break;

    for (const keyEntry of keys) {
      if (Date.now() - startedAt >= TOTAL_GEMINI_BUDGET_MS) break;

      try {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyEntry.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: params.systemInstruction }] },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              },
            }),
          },
          GEMINI_TIMEOUT_MS,
        );

        if (res.ok) {
          const payload = await res.json();
          const text = extractText(payload);
          if (text) return { ok: true, text };
          return { ok: false, code: 'empty_response' };
        }

        const body = await res.text();
        if (!shouldTryNextModel(res.status) && !shouldTryFallback(res.status)) {
          return { ok: false, code: `gemini_http_${res.status}`, detail: body.slice(0, 200) };
        }
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        if (!isTimeout) {
          console.warn('[geminiTextChat] call_failed', model, keyEntry.label, error);
        }
      }
    }
  }

  return { ok: false, code: 'all_models_failed' };
};

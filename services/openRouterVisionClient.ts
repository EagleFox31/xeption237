/**
 * Secours vision via OpenRouter — canal de diversification fournisseur (PREFLIGHT uniquement).
 * Sert de fallback au pré-check crédibilité photo (tâche simple : vrai téléphone ? marque ?),
 * donc un modèle LÉGER suffit. Modèle piloté par VITE_OPENROUTER_VISION_MODEL.
 * Défaut : nemotron-nano-12b (NVIDIA, famille indépendante de Gemini → vraie résilience).
 * Le prompt est model-agnostic (français + "retourne uniquement du JSON").
 * NB : l'éval complète payante reste sur Gemini (edge evaluate-device), pas ce canal.
 */

export type OpenRouterImagePart = {
  mimeType: string;
  base64: string;
};

export const OPENROUTER_VISION_MODEL =
  import.meta.env.VITE_OPENROUTER_VISION_MODEL?.trim() || 'nvidia/nemotron-nano-12b-v2-vl:free';

export function hasOpenRouterApiKey(): boolean {
  return String(import.meta.env.VITE_OPENROUTER_API_KEY || '').trim().length > 0;
}

export async function openRouterVisionJson(
  prompt: string,
  imageParts: OpenRouterImagePart[],
): Promise<string> {
  const apiKey = String(import.meta.env.VITE_OPENROUTER_API_KEY || '').trim();
  if (!apiKey) throw new Error('OPENROUTER_MISSING_KEY');

  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: prompt }];

  for (const img of imageParts) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://xeption.cm',
      'X-Title': 'Xeption Smart Troc',
    },
    body: JSON.stringify({
      model: OPENROUTER_VISION_MODEL,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: 900,
      temperature: 0.1,
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    // Codes préfixés `openrouter_http_*` → reconnus par isRecoverableForFallback (trocPhotoPreflight)
    if (res.status === 429) throw new Error('openrouter_http_429');
    throw new Error(`openrouter_http_${res.status}`);
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new Error('invalid_json');
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error('empty_response');
  return text;
}

/** Client DeepSeek (format OpenAI) — dev local Smart Troc. */

export type DeepSeekImagePart = {
  mimeType: string;
  base64: string;
};

export const DEEPSEEK_CHAT_MODEL =
  import.meta.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';

export function getDeepSeekApiKey(): string {
  const key = String(import.meta.env.VITE_DEEPSEEK_API_KEY || '').trim();
  if (!key) {
    throw new Error(
      'Clé DeepSeek introuvable. Ajoute VITE_DEEPSEEK_API_KEY=sk-... dans xeption237/.env puis redémarre npm run dev.',
    );
  }
  return key;
}

export function hasDeepSeekApiKey(): boolean {
  try {
    return getDeepSeekApiKey().length > 0;
  } catch {
    return false;
  }
}

export async function deepseekVisionJson(
  prompt: string,
  imageParts: DeepSeekImagePart[],
): Promise<string> {
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

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getDeepSeekApiKey()}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_CHAT_MODEL,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: 900,
      temperature: 0.1,
      thinking: { type: 'disabled' },
    }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    if (res.status === 429) throw new Error('gemini_http_429');
    if (
      res.status === 400 &&
      /image|vision|multimodal|unsupported|invalid.*content/i.test(bodyText)
    ) {
      throw new Error('DEEPSEEK_NO_VISION');
    }
    throw new Error(`deepseek_http_${res.status}`);
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

/** Texte → JSON (fiches produit, avis, enrichissement admin). */
export async function deepseekChatJson(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getDeepSeekApiKey()}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: options?.maxTokens ?? 1400,
      temperature: options?.temperature ?? 0.15,
      thinking: { type: 'disabled' },
    }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    if (res.status === 429) throw new Error('deepseek_http_429');
    throw new Error(`deepseek_http_${res.status}: ${bodyText.slice(0, 200)}`);
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

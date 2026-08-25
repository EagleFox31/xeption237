export type VisionImagePart = {
  mimeType: string;
  base64: string;
};

export const isOpenRouterConfigured = (): boolean =>
  Boolean(Deno.env.get('OPENROUTER_API_KEY')?.trim());

const defaultVisionModel = (): string =>
  Deno.env.get('OPENROUTER_VISION_MODEL')?.trim() || 'dots-studio/dots-3-note-preview:free';

export const openRouterVisionJson = async (
  prompt: string,
  imageParts: VisionImagePart[],
): Promise<string> => {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim() || '';
  if (!apiKey) throw new Error('OPENROUTER_MISSING_KEY');

  const model = defaultVisionModel();
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

  const referer = Deno.env.get('PUBLIC_VERIFY_BASE_URL')?.trim() || 'https://xeptionetwork.shop';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': referer,
      'X-Title': 'Xeption Smart Troc',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: 2500,
      temperature: 0.1,
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    console.error('[openRouterVision] http_error', res.status, bodyText.slice(0, 200));
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
  return text.trim();
};

export const inlinePartsToVisionImages = (
  parts: Array<{ inlineData: { mimeType: string; data: string } }>,
): VisionImagePart[] =>
  parts.map((part) => ({
    mimeType: part.inlineData.mimeType || 'image/jpeg',
    base64: part.inlineData.data,
  }));

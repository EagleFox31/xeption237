import { getGeminiApiKey, GEMINI_CREDIBILITY_MODEL } from './geminiClient';
import { openRouterVisionJson } from './openRouterVisionClient';
import type { VisionChannel } from './trocVisionHealth';

export async function callCredibilityVision(
  channel: VisionChannel,
  prompt: string,
  imageParts: { inlineData: { mimeType: string; data: string } }[],
): Promise<string> {
  const mapped = imageParts.map((p) => ({
    mimeType: p.inlineData.mimeType,
    base64: p.inlineData.data,
  }));

  if (channel === 'openrouter') {
    return openRouterVisionJson(prompt, mapped);
  }

  if (channel === 'local-gemini') {
    const apiKey = getGeminiApiKey();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CREDIBILITY_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...imageParts] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`gemini_http_${res.status}`);
    }

    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) throw new Error('empty_response');
    return text;
  }

  throw new Error('edge_uses_invoke');
}

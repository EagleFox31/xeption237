/**
 * Vision DeepSeek — secours hors famille Google pour le Smart Troc.
 *
 * Pourquoi ce module : le pipeline vision reposait entièrement sur Gemini, et
 * la panne du 2026-08-24 (deux modèles retirés le même jour) a montré ce que
 * coûte un fournisseur unique. Le secours prévu passait par OpenRouter, mais
 * son modèle gratuit met ~27 s à répondre et son slug avait déjà été retiré une
 * fois. DeepSeek offre une vraie alternative, avec une clé déjà en place.
 *
 * Contraintes tirées de la documentation officielle (api-docs.deepseek.com,
 * relevées le 2026-08-26) :
 *
 *   - Seul `deepseek-v4-flash-vision-exp` accepte des images. Les autres
 *     modèles répondent 400 « This model does not support image ».
 *   - Les images ne sont acceptées QUE dans un message `user`. Un `system` ou
 *     un `assistant` porteur d'image renvoie 400 — d'où le prompt fusionné
 *     dans le message utilisateur ci-dessous.
 *   - 48 Mio pour le corps de requête, 32 Mio par image en ligne.
 *
 * ⚠️ Le suffixe `-exp` désigne un modèle expérimental : exactement la catégorie
 * qui disparaît sans préavis, comme `gemini-2.0-flash`. Le modèle est donc
 * surchargeable par variable d'environnement, et ce canal reste un maillon
 * d'une chaîne — jamais l'unique recours.
 */

import type { VisionImagePart } from './openRouterVision.ts';

const DEEPSEEK_VISION_TIMEOUT_MS = 40_000;

/** 32 Mio par image, marge prise sur l'encodage base64 (~4/3 du binaire). */
const MAX_INLINE_IMAGE_BYTES = 30 * 1024 * 1024;

export const isDeepSeekVisionConfigured = (): boolean =>
  Boolean(Deno.env.get('DEEPSEEK_API_KEY')?.trim());

const visionModel = (): string =>
  Deno.env.get('DEEPSEEK_VISION_MODEL')?.trim() || 'deepseek-v4-flash-vision-exp';

/**
 * Analyse d'images, réponse JSON attendue.
 *
 * @throws `DEEPSEEK_MISSING_KEY`, `deepseek_vision_http_<code>`,
 *         `deepseek_vision_timeout`, `empty_response`.
 */
export const deepseekVisionJson = async (
  prompt: string,
  imageParts: VisionImagePart[],
): Promise<string> => {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim() || '';
  if (!apiKey) throw new Error('DEEPSEEK_MISSING_KEY');

  // Consignes et images dans le MÊME message user : DeepSeek refuse les images
  // portées par un message system.
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: prompt }];

  for (const img of imageParts) {
    if (img.base64.length > MAX_INLINE_IMAGE_BYTES) {
      console.warn('[deepseek-vision] image ignorée, au-delà de la limite en ligne');
      continue;
    }
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }

  if (content.length === 1) throw new Error('no_usable_image');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_VISION_TIMEOUT_MS);

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: visionModel(),
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        max_tokens: 1200,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    const bodyText = await res.text();

    if (!res.ok) {
      // Le message de l'API est journalisé : sans lui, un diagnostic exige de
      // rejouer l'appel à la main (leçon du 2026-08-24 sur OpenRouter).
      let apiMessage = bodyText.slice(0, 200);
      try {
        apiMessage = JSON.parse(bodyText)?.error?.message ?? apiMessage;
      } catch {
        /* corps non-JSON */
      }
      console.error(`[deepseek-vision] ${res.status} sur ${visionModel()} : ${apiMessage}`);
      throw new Error(`deepseek_vision_http_${res.status}`);
    }

    const payload = JSON.parse(bodyText);
    const text = payload?.choices?.[0]?.message?.content;
    if (!text?.trim()) throw new Error('empty_response');
    return text;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('deepseek_vision_timeout');
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

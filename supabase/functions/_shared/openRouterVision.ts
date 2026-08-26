export type VisionImagePart = {
  mimeType: string;
  base64: string;
};

export const isOpenRouterConfigured = (): boolean =>
  Boolean(Deno.env.get('OPENROUTER_API_KEY')?.trim());

/**
 * Chaine de modeles, pas un slug unique.
 *
 * Le catalogue gratuit d'OpenRouter bouge en permanence. Mesure du 2026-08-26,
 * sur des identifiants recommandes le jour meme :
 *
 *   nvidia/nemotron-nano-12b-2-vl:free     400  « is not a valid model ID »
 *   google/gemma-4-26b-a4b:free            400  « is not a valid model ID »
 *   moonshotai/kimi-vl-a3b-thinking:free   404  « No endpoints found »
 *   google/gemma-4-26b-a4b-it:free         429  identifiant valide, quota atteint
 *   dots-studio/dots-3-note-preview:free   timeout a 60 s  <- ancien defaut
 *
 * Deux slugs sur trois n'existaient pas, et notre propre defaut ne repondait
 * plus. Un modele unique ici est donc une panne programmee : on en essaie
 * plusieurs, et ce canal reste le DERNIER recours, derriere DeepSeek.
 */
const visionModelChain = (): string[] => {
  const raw = Deno.env.get('OPENROUTER_VISION_MODELS') ?? Deno.env.get('OPENROUTER_VISION_MODEL');
  const parsed = (raw ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  return parsed.length > 0
    ? parsed
    : ['dots-studio/dots-3-note-preview:free', 'google/gemma-4-26b-a4b-it:free'];
};

export const openRouterVisionJson = async (
  prompt: string,
  imageParts: VisionImagePart[],
): Promise<string> => {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim() || '';
  if (!apiKey) throw new Error('OPENROUTER_MISSING_KEY');

  const models = visionModelChain();
  let lastError = 'openrouter_no_model';
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

  for (const model of models) {
    try {
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
        // Sans delai, un modele qui ne repond plus bloque tout le canal : le
        // defaut precedent expirait au-dela de 60 s.
        signal: AbortSignal.timeout(25_000),
      });

      const bodyText = await res.text();

      if (!res.ok) {
        // Le message de l'API donne la raison exacte (« is not a valid model ID »,
        // « No endpoints found ») : le jeter obligerait a rejouer l'appel a la main.
        let apiMessage = bodyText.slice(0, 160);
        try {
          apiMessage = JSON.parse(bodyText)?.error?.message ?? apiMessage;
        } catch {
          /* corps non-JSON */
        }
        console.error(`[openRouterVision] ${res.status} sur ${model} : ${apiMessage}`);
        lastError = `openrouter_http_${res.status}`;
        continue;
      }

      const payload = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload?.choices?.[0]?.message?.content;
      if (!text?.trim()) {
        lastError = 'empty_response';
        continue;
      }
      return text.trim();
    } catch (error: any) {
      lastError = error?.name === 'TimeoutError' ? 'openrouter_timeout' : 'openrouter_failed';
      console.error('[openRouterVision] echec', model, lastError);
    }
  }

  throw new Error(lastError);
};

export const inlinePartsToVisionImages = (
  parts: Array<{ inlineData: { mimeType: string; data: string } }>,
): VisionImagePart[] =>
  parts.map((part) => ({
    mimeType: part.inlineData.mimeType || 'image/jpeg',
    base64: part.inlineData.data,
  }));

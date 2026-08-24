/**
 * Secours vision via OpenRouter — canal de diversification fournisseur (PREFLIGHT uniquement).
 * Sert de fallback au pré-check crédibilité photo (tâche simple : vrai téléphone ? marque ?),
 * donc un modèle LÉGER suffit. Modèle piloté par VITE_OPENROUTER_VISION_MODEL.
 * La famille choisie doit rester INDÉPENDANTE de Gemini, sinon ce canal tombe
 * avec celui qu'il est censé secourir — ce qui s'est produit le 2026-08-24.
 * Le prompt est model-agnostic (français + "retourne uniquement du JSON").
 * NB : l'éval complète payante reste sur Gemini (edge evaluate-device), pas ce canal.
 */

export type OpenRouterImagePart = {
  mimeType: string;
  base64: string;
};

// Le defaut precedent, nvidia/nemotron-nano-12b-v2-vl:free, a ete retire
// d'OpenRouter (« No endpoints found ») et a fait tomber ce canal de secours en
// meme temps que Gemini, le 2026-08-24. Verifie le meme jour : dots-3 repond
// correctement sur une image et respecte response_format json_object.
export const OPENROUTER_VISION_MODEL =
  import.meta.env.VITE_OPENROUTER_VISION_MODEL?.trim() || 'dots-studio/dots-3-note-preview:free';

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
      // Un modele a raisonnement consomme le budget AVANT d'ecrire sa reponse :
      // mesure a 846 tokens de raisonnement sur dots-3, ce qui ne laissait rien
      // avec l'ancienne limite de 900 et renvoyait un `empty_response`.
      max_tokens: 2500,
      temperature: 0.1,
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    // Le message de l'API donnait la reponse (« No endpoints found for ... ») et
    // etait jete : le diagnostic du 2026-08-24 a du refaire l'appel a la main
    // pour le retrouver. On le journalise sans changer le code d'erreur, que
    // isRecoverableForFallback (trocPhotoPreflight) reconnait par son prefixe.
    let apiMessage = bodyText.slice(0, 200);
    try {
      apiMessage = JSON.parse(bodyText)?.error?.message ?? apiMessage;
    } catch {
      /* corps non-JSON : on garde le texte brut tronque */
    }
    console.error(
      `[openrouter] ${res.status} sur ${OPENROUTER_VISION_MODEL} : ${apiMessage}`,
    );
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

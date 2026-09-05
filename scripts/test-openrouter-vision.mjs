/**
 * Valide le canal vision OpenRouter (diversification fournisseur Smart Troc).
 * Vérifie qu'un modèle non-Gemini (Qwen2.5-VL par défaut) :
 *   1. est joignable avec la clé fournie,
 *   2. accepte une image en entrée,
 *   3. renvoie un JSON parsable avec les clés attendues (decision, confidence…),
 *   4. respecte (ou non) response_format:json_object.
 *
 * Usage :
 *   node scripts/test-openrouter-vision.mjs
 *   node scripts/test-openrouter-vision.mjs --image=https://exemple.com/photo-telephone.jpg
 *   node scripts/test-openrouter-vision.mjs --model=meta-llama/llama-3.2-90b-vision-instruct
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const API_KEY = String(
  process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '',
).trim();
const MODEL = arg(
  'model',
  process.env.OPENROUTER_VISION_MODEL?.trim() ||
    process.env.VITE_OPENROUTER_VISION_MODEL?.trim() ||
    'nvidia/nemotron-nano-12b-v2-vl:free',
);
// Image de test : une vraie photo de smartphone (remplaçable via --image=).
const IMAGE_URL = arg(
  'image',
  'https://res.cloudinary.com/dli0kdkg9/image/upload/v1733000000/sample-phone.jpg',
);

// Prompt minimal proche du persona crédibilité (model-agnostic, JSON only).
const PROMPT = `Tu es l'agent de credibilite photo Smart Troc.
Regarde l'image et reponds UNIQUEMENT par un JSON valide, sans texte autour, avec ces cles :
{
  "decision": "approved" | "retake" | "mismatch",
  "confidence": nombre entre 0 et 1,
  "observedBrand": string,
  "observedModel": string,
  "isRealPhone": boolean
}
Si l'image n'est pas un vrai smartphone physique, decision = "retake".`;

const EXPECTED_KEYS = ['decision', 'confidence', 'observedBrand', 'observedModel', 'isRealPhone'];

const callModel = async ({ withJsonFormat }) => {
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: IMAGE_URL } },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.1,
    ...(withJsonFormat ? { response_format: { type: 'json_object' } } : {}),
  };

  const started = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'X-Title': 'Xeption Smart Troc vision test',
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - started;
  const text = await res.text();
  return { ok: res.ok, status: res.status, latencyMs, text };
};

const extractJson = (raw) => {
  // Certains modèles entourent le JSON de ```json … ``` ou de texte → on isole l'objet.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
};

const main = async () => {
  console.log('── Test vision OpenRouter ─────────────────────────────');
  console.log('Modèle :', MODEL);
  console.log('Image  :', IMAGE_URL);

  if (!API_KEY) {
    console.error('\n❌ OPENROUTER_API_KEY absent du .env — impossible de tester.');
    process.exit(1);
  }

  let jsonFormatSupported = true;
  let result = await callModel({ withJsonFormat: true });

  // Si le modèle rejette response_format (souvent HTTP 400), on retombe sur le prompt seul.
  if (!result.ok && result.status === 400) {
    console.warn('\n⚠️  response_format:json_object rejeté (HTTP 400) → retry sans ce paramètre.');
    jsonFormatSupported = false;
    result = await callModel({ withJsonFormat: false });
  }

  if (!result.ok) {
    console.error(`\n❌ Appel échoué — HTTP ${result.status}`);
    console.error(result.text.slice(0, 400));
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(result.text);
  } catch {
    console.error('\n❌ Réponse OpenRouter non-JSON (enveloppe).');
    process.exit(1);
  }

  const content = payload?.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(content);

  console.log('\n── Résultats ──────────────────────────────────────────');
  console.log('HTTP                :', result.status, `(${result.latencyMs} ms)`);
  console.log('response_format     :', jsonFormatSupported ? 'supporté ✅' : 'NON supporté ⚠️ (fallback prompt)');
  console.log('Sortie JSON parsable:', parsed ? 'oui ✅' : 'NON ❌');

  if (!parsed) {
    console.log('\nContenu brut renvoyé :\n', content.slice(0, 500));
    console.error('\n❌ Le modèle ne renvoie pas de JSON exploitable — inadapté en l\'état.');
    process.exit(1);
  }

  const missing = EXPECTED_KEYS.filter((k) => !(k in parsed));
  console.log('Clés attendues      :', missing.length ? `manquantes → ${missing.join(', ')} ⚠️` : 'toutes présentes ✅');
  console.log('\nJSON renvoyé :\n', JSON.stringify(parsed, null, 2));

  const verdict = parsed && missing.length === 0;
  console.log('\n──────────────────────────────────────────────────────');
  console.log(verdict
    ? '✅ VERDICT : ce modèle est utilisable comme canal de secours vision.'
    : '⚠️  VERDICT : JSON renvoyé mais incomplet — ajuster le prompt ou changer de modèle.');
  process.exit(verdict ? 0 : 2);
};

main().catch((err) => {
  console.error('\n❌ Erreur inattendue :', err?.message || err);
  process.exit(1);
});

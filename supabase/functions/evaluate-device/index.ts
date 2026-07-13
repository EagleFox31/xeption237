// @ts-ignore
const Deno = globalThis.Deno;

import {
  buildTrocVisionAnalystPrompt,
  parseTrocVisionAnalystOutput,
  type TrocVisionAnalystInput,
} from '../_shared/personas/trocVisionAnalyst.ts';
import {
  buildTrocPhotoCredibilityPrompt,
  parseTrocPhotoCredibilityOutput,
} from '../_shared/personas/trocPhotoCredibility.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PHOTO_FETCH_TIMEOUT_MS = 10_000;
const GEMINI_TIMEOUT_MS = 30_000;
const MAX_PHOTOS = 8;
const CREDIBILITY_MAX_PHOTOS = 4;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_CREDIBILITY_MODEL =
  Deno.env.get('GEMINI_CREDIBILITY_MODEL')?.trim() || 'gemini-2.0-flash-lite';

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

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const FULL_VISION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    score: { type: 'INTEGER' },
    justification: { type: 'STRING' },
    observedBrand: { type: 'STRING' },
    observedModel: { type: 'STRING' },
    decision: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    fraudDetected: { type: 'BOOLEAN' },
    photoIssues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          reason: { type: 'STRING' },
        },
        required: ['index', 'reason'],
      },
    },
    evidence: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          source: { type: 'STRING' },
          signal: { type: 'STRING' },
        },
      },
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['score', 'justification', 'observedBrand', 'observedModel', 'decision', 'confidence', 'fraudDetected', 'photoIssues', 'evidence', 'warnings'],
};

const CREDIBILITY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    decision: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    observedBrand: { type: 'STRING' },
    observedModel: { type: 'STRING' },
    allPhotosShowSmartphone: { type: 'BOOLEAN' },
    declarationMatch: { type: 'STRING' },
    summary: { type: 'STRING' },
    photoIssues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          reason: { type: 'STRING' },
        },
        required: ['index', 'reason'],
      },
    },
  },
  required: [
    'decision',
    'confidence',
    'observedBrand',
    'observedModel',
    'allPhotosShowSmartphone',
    'declarationMatch',
    'summary',
    'photoIssues',
  ],
};

const validateBody = (body: any, isPreflight: boolean): string | null => {
  if (!Array.isArray(body.photoUrls)) return 'photoUrls doit être un tableau';
  if (body.photoUrls.length === 0) return 'photoUrls : au moins une photo requise';
  if (body.photoUrls.length > MAX_PHOTOS) return `photoUrls : maximum ${MAX_PHOTOS} photos`;
  if (body.photoUrls.some((u: unknown) => typeof u !== 'string' || u.length > 500))
    return 'photoUrls : chaque URL doit être une chaîne ≤ 500 caractères';

  const info = body.deviceInfo;
  if (!info || typeof info !== 'object') return 'deviceInfo requis';
  if (!str(info.brand).trim()) return 'deviceInfo.brand requis';
  if (!str(info.model).trim()) return 'deviceInfo.model requis';

  if (!isPreflight) {
    const bh = Number(info.batteryHealth);
    if (!Number.isFinite(bh) || bh < 0 || bh > 100) return 'deviceInfo.batteryHealth invalide (0-100)';
  }

  return null;
};

const shouldTryFallback = (status: number): boolean => status === 429 || status === 503 || status >= 500;

type GeminiCallResult =
  | { ok: true; payload: any; keyUsed: 'primary' | 'fallback' }
  | { ok: false; status: number; body: string; keyUsed: 'primary' | 'fallback' };

const callGemini = async (
  apiKey: string,
  parts: any[],
  promptText: string,
  keyUsed: 'primary' | 'fallback',
  responseSchema: Record<string, unknown>,
  model = GEMINI_MODEL,
): Promise<GeminiCallResult> => {
  const geminiRes = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }, ...parts] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    },
    GEMINI_TIMEOUT_MS,
  );

  if (geminiRes.ok) {
    const payload = await geminiRes.json();
    return { ok: true, payload, keyUsed };
  }

  const body = await geminiRes.text();
  return { ok: false, status: geminiRes.status, body, keyUsed };
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.healthCheck === true) {
      const primaryKey = Deno.env.get('GEMINI_API_KEY')?.trim() || '';
      const fallbackKey = Deno.env.get('GEMINI_API_KEY_FALLBACK')?.trim() || '';
      const ready = primaryKey.length > 0 || fallbackKey.length > 0;
      return new Response(
        JSON.stringify({
          ready,
          provider: 'edge-gemini',
          code: ready ? 'ready' : 'missing_api_key',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const isPreflight = body.preflight === true;

    const validationError = validateBody(body, isPreflight);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const primaryKey = Deno.env.get('GEMINI_API_KEY')?.trim() || '';
    const fallbackKey = Deno.env.get('GEMINI_API_KEY_FALLBACK')?.trim() || '';

    if (!primaryKey && !fallbackKey) {
      return new Response(
        JSON.stringify({ error: 'Aucune clé Gemini configurée', code: 'missing_api_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      );
    }

    const { photoUrls, deviceInfo } = body;
    const analystInput: TrocVisionAnalystInput = {
      brand: str(deviceInfo.brand).trim(),
      model: str(deviceInfo.model).trim(),
      storage: str(deviceInfo.storage),
      ram: str(deviceInfo.ram),
      batteryHealth: Number.isFinite(Number(deviceInfo.batteryHealth))
        ? Number(deviceInfo.batteryHealth)
        : 80,
      screenCondition: str(deviceInfo.screenCondition),
      bodyCondition: str(deviceInfo.bodyCondition),
      cameraCondition: str(deviceInfo.cameraCondition),
      accessories: Array.isArray(deviceInfo.accessories) ? deviceInfo.accessories : [],
      photoCount: 0,
    };

    const responseSchema = isPreflight ? CREDIBILITY_SCHEMA : FULL_VISION_SCHEMA;
    const photoLimit = isPreflight ? CREDIBILITY_MAX_PHOTOS : MAX_PHOTOS;
    const geminiModel = isPreflight ? GEMINI_CREDIBILITY_MODEL : GEMINI_MODEL;

    // Fetch photos depuis Cloudinary et conversion base64.
    // On utilise allSettled pour ne pas bloquer sur une photo manquante —
    // on évalue avec les photos disponibles et on signale le compte effectif.
    const imageResults = await Promise.allSettled(
      (photoUrls as string[]).slice(0, photoLimit).map(async (url: string) => {
        const res = await fetchWithTimeout(url, {}, PHOTO_FETCH_TIMEOUT_MS);
        if (!res.ok) throw new Error(`http_${res.status}`);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
        return { inlineData: { mimeType, data: base64 } };
      }),
    );

    const imageParts = imageResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (imageParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Impossible de charger les photos', code: 'photos_unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 },
      );
    }

    const finalPrompt = isPreflight
      ? buildTrocPhotoCredibilityPrompt({
          brand: analystInput.brand,
          model: analystInput.model,
          photoCount: imageParts.length,
        })
      : buildTrocVisionAnalystPrompt({ ...analystInput, photoCount: imageParts.length });

    let geminiResult: GeminiCallResult | null = null;

    if (primaryKey) {
      try {
        geminiResult = await callGemini(
          primaryKey,
          imageParts,
          finalPrompt,
          'primary',
          responseSchema,
          geminiModel,
        );
      } catch (error: any) {
        console.error('[evaluate-device] gemini_primary_fatal', error?.message ?? error);
      }
    }

    // Fallback key: only if primary failed with quota/server issue, or if no primary exists.
    const primaryFailedRecoverable =
      geminiResult && !geminiResult.ok && shouldTryFallback(geminiResult.status);
    const noPrimaryAttempt = !geminiResult;

    if (fallbackKey && (noPrimaryAttempt || primaryFailedRecoverable)) {
      try {
        const fallbackResult = await callGemini(
          fallbackKey,
          imageParts,
          finalPrompt,
          'fallback',
          responseSchema,
          geminiModel,
        );
        if (fallbackResult.ok) {
          geminiResult = fallbackResult;
        } else if (!geminiResult || (geminiResult && geminiResult.ok === false)) {
          // Keep the fallback result if primary was absent or also failed.
          geminiResult = fallbackResult;
        }
      } catch (error: any) {
        console.error('[evaluate-device] gemini_fallback_fatal', error?.message ?? error);
      }
    }

    if (!geminiResult || !geminiResult.ok) {
      const statusCode = geminiResult && !geminiResult.ok ? geminiResult.status : 500;
      const errBody = geminiResult && !geminiResult.ok ? geminiResult.body : 'gemini_unreachable';
      const keyLabel = geminiResult && !geminiResult.ok ? geminiResult.keyUsed : 'none';
      console.error('[evaluate-device] gemini_error', statusCode, keyLabel, errBody);
      return new Response(
        JSON.stringify({
          error: 'Gemini API error',
          code: `gemini_http_${statusCode}`,
          provider: keyLabel,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const geminiData = geminiResult.payload;
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[evaluate-device] empty_response', JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: 'Réponse Gemini vide', code: 'empty_response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    if (isPreflight) {
      const credibility = parseTrocPhotoCredibilityOutput(text);
      if (!credibility) {
        return new Response(
          JSON.stringify({ error: 'JSON Gemini invalide', code: 'invalid_json' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
        );
      }

      const analysisDecision =
        credibility.decision === 'approved'
          ? 'match'
          : credibility.decision === 'mismatch'
            ? 'mismatch'
            : 'photos_to_retake';

      return new Response(
        JSON.stringify({
          preflight: true,
          evaluationMode: 'credibility_verified',
          photosUsed: imageParts.length,
          provider: geminiResult.keyUsed,
          analysisDecision,
          photoIssues: credibility.photoIssues,
          observedBrand: credibility.observedBrand,
          observedModel: credibility.observedModel,
          declarationMatch: credibility.declarationMatch,
          credibilitySummary: credibility.summary,
          credibilityConfidence: credibility.confidence,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const parsed = parseTrocVisionAnalystOutput(text);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: 'JSON Gemini invalide', code: 'invalid_json' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const score = parsed.score;
    const justification = parsed.justification.slice(0, 2000);

    // Filet final : si Gemini a listé des photos non conformes, on force
    // un retour "photos_to_retake" et on n'expose JAMAIS de score au client.
    const hasPhotoIssues = parsed.photoIssues.length > 0;
    const safeDecision = hasPhotoIssues ? 'photos_to_retake' : parsed.decision;

    return new Response(
      JSON.stringify({
        score: hasPhotoIssues ? 0 : score,
        justification: hasPhotoIssues ? '' : justification,
        evaluationMode: 'vision_ai',
        photosUsed: imageParts.length,
        provider: geminiResult.keyUsed,
        analysisDecision: safeDecision,
        analysisConfidence: parsed.confidence,
        fraudDetected: parsed.fraudDetected,
        photoIssues: parsed.photoIssues, // [{ index, reason }] — index 1-based
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error('[evaluate-device] fatal', error);
    return new Response(
      JSON.stringify({ error: error?.message ?? 'unknown', code: 'fatal' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

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
import { assertAiRateLimit, rateLimitJsonResponse } from '../_shared/rateLimit.ts';
import {
  inlinePartsToVisionImages,
  isOpenRouterConfigured,
  openRouterVisionJson,
} from '../_shared/openRouterVision.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PHOTO_FETCH_TIMEOUT_MS = 10_000;
const GEMINI_TIMEOUT_MS = 30_000;
const MAX_PHOTOS = 8;
const CREDIBILITY_MAX_PHOTOS = 4;
// Chaine de modeles, pas un slug unique.
//
// Le 2026-08-24 le pipeline vision est tombe entierement : gemini-2.0-flash et
// gemini-2.0-flash-lite, codes en dur ici, avaient ete retires par Google. Le
// repli existant est au niveau des CLES (primaire -> secours) et ne se declenche
// que sur 429/503/5xx : un 404 « modele retire » n'est pas rattrapable en
// changeant de cle, donc la panne n'avait aucun chemin de secours.
//
// Les alias (-latest) ne peuvent pas etre retires silencieusement : ils viennent
// en premier. Un modele epingle les suit, au cas ou l'alias basculerait vers un
// modele au comportement different.
const parseModelChain = (raw: string | undefined, fallback: string[]): string[] => {
  const parsed = (raw ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

// Ordre voulu : des modeles EPROUVES d'abord, l'alias en dernier comme survivant.
//
// Chaine sondee le 2026-08-24 avec la cle reellement utilisee par cette fonction
// (`healthCheck` + `probeModels`), car les droits varient d'une cle a l'autre :
//   gemini-3.5-flash        ok        gemini-2.5-flash       404 (retire)
//   gemini-3.6-flash        ok        gemini-2.5-flash-lite  404 (retire)
//   gemini-flash-latest     timeout (congestion) -> garde en dernier recours
//
// L'alias protege du retrait silencieux mais il est congestionne : en tete de
// chaine il consommait tout le budget avant que le modele suivant soit essaye.
const GEMINI_MODELS = parseModelChain(
  Deno.env.get('GEMINI_MODELS'),
  ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'],
);

const GEMINI_CREDIBILITY_MODELS = parseModelChain(
  Deno.env.get('GEMINI_CREDIBILITY_MODELS') ?? Deno.env.get('GEMINI_CREDIBILITY_MODEL'),
  ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite'],
);
// Mesure du 2026-08-24 : le preflight repond en 1,7 s sur gemini-flash-lite-latest.

// Faut-il essayer le MODELE suivant apres qu'un modele a echoue sur les deux cles ?
//
// Oui dans presque tous les cas : un 404 signifie que le modele a ete retire, un
// 503 « forte demande » vise ce modele precis (un autre a d'autres capacites),
// un 400 est un refus propre a ce modele. Non sur 401/403 : c'est la cle qui est
// en cause, et aucun autre modele n'y changera quoi que ce soit.
const shouldTryNextModel = (status: number): boolean => status !== 401 && status !== 403;

// Budget global. Sans lui, une chaine de 2 modeles x 2 cles x 30 s ferait
// patienter le client jusqu'a deux minutes devant un ecran fige. Mesure sur la
// panne du 2026-08-24 : 59 s pour un seul modele.
const TOTAL_GEMINI_BUDGET_MS = 45_000;

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
  model: string,
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

      // Une cle presente ne suffit pas : le 2026-08-24 les cles etaient valides
      // mais les modeles codes en dur avaient ete retires, et ce healthCheck
      // repondait « ready » pendant que tout le pipeline tombait.
      //
      // On sonde par un VRAI generateContent, pas par models.list : cette liste
      // ment. Elle annonce gemini-2.5-flash comme servi alors que l'appel repond
      // « This model is no longer available to new users ». Les droits varient
      // d'une cle a l'autre, donc seule la cle reellement utilisee fait foi.
      const candidates: string[] = Array.isArray(body.probeModels) && body.probeModels.length > 0
        ? body.probeModels.filter((m: unknown) => typeof m === 'string').slice(0, 12)
        : [...new Set([...GEMINI_MODELS, ...GEMINI_CREDIBILITY_MODELS])];

      let modelsReachable: Record<string, string> | null = null;
      const probeKey = primaryKey || fallbackKey;

      if (probeKey) {
        const probe = async (model: string): Promise<[string, string]> => {
          try {
            const res = await fetchWithTimeout(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${probeKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'ping' }] }],
                  generationConfig: { maxOutputTokens: 1, temperature: 0 },
                }),
              },
              8_000,
            );
            return [model, res.ok ? 'ok' : `http_${res.status}`];
          } catch (error: any) {
            return [model, error?.name === 'AbortError' ? 'timeout' : 'failed'];
          }
        };

        const results = await Promise.all(candidates.map(probe));
        modelsReachable = Object.fromEntries(results);
      }

      const anyModelReachable = modelsReachable
        ? Object.values(modelsReachable).some((v) => v === 'ok')
        : null;

      const openRouterConfigured = isOpenRouterConfigured();

      return new Response(
        JSON.stringify({
          ready: (ready && anyModelReachable !== false) || openRouterConfigured,
          provider: 'edge-gemini',
          code: !ready && !openRouterConfigured
            ? 'missing_api_key'
            : anyModelReachable === false && !openRouterConfigured
              ? 'no_model_available'
              : 'ready',
          keys: { primary: primaryKey.length > 0, fallback: fallbackKey.length > 0 },
          openRouter: { configured: openRouterConfigured },
          chains: { evaluation: GEMINI_MODELS, preflight: GEMINI_CREDIBILITY_MODELS },
          modelsReachable,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const sessionKey =
      typeof body.sessionKey === 'string' ? body.sessionKey.trim() : null;

    const rateLimit = await assertAiRateLimit(req, 'evaluate-device', sessionKey);
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(rateLimit, corsHeaders);
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
    const openRouterReady = isOpenRouterConfigured();

    if (!primaryKey && !fallbackKey && !openRouterReady) {
      return new Response(
        JSON.stringify({ error: 'Aucune clé vision configurée', code: 'missing_api_key' }),
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
    const modelChain = isPreflight ? GEMINI_CREDIBILITY_MODELS : GEMINI_MODELS;

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

    // Une tentative complete pour UN modele : cle primaire, puis cle de secours
    // si le quota ou le serveur a laché. Inchange par rapport a l'existant.
    const startedAt = Date.now();
    const budgetLeft = () => TOTAL_GEMINI_BUDGET_MS - (Date.now() - startedAt);

    const attemptWithKeys = async (model: string): Promise<GeminiCallResult | null> => {
      let result: GeminiCallResult | null = null;

      // Un ECHEC RESEAU (timeout, DNS) vise le modele, pas la cle : rejouer la
      // seconde cle sur le meme modele expirerait pareil, en consommant 30 s de
      // plus. Mesure du 2026-08-25 : deux modeles injoignables coutaient 60 s et
      // le budget s'epuisait avant d'atteindre le modele suivant.
      let primaryThrew = false;

      if (primaryKey) {
        try {
          result = await callGemini(primaryKey, imageParts, finalPrompt, 'primary', responseSchema, model);
        } catch (error: any) {
          primaryThrew = true;
          console.error('[evaluate-device] gemini_primary_fatal', model, error?.message ?? error);
        }
      }

      if (primaryThrew) return null;

      // Cle de secours : seulement si la primaire a lache sur quota/serveur, ou
      // s'il n'y a pas de cle primaire.
      const primaryFailedRecoverable = result && !result.ok && shouldTryFallback(result.status);
      const noPrimaryAttempt = !result;

      // Sans ce garde-fou, 2 cles x 30 s epuisaient le budget sur le premier
      // modele et le second n'etait jamais essaye.
      if (fallbackKey && budgetLeft() <= 0) {
        console.warn('[evaluate-device] budget epuise, cle de secours non tentee', model);
      } else if (fallbackKey && (noPrimaryAttempt || primaryFailedRecoverable)) {
        try {
          const fallbackResult = await callGemini(fallbackKey, imageParts, finalPrompt, 'fallback', responseSchema, model);
          // On garde le resultat de secours s'il aboutit, ou si la primaire etait
          // absente / avait echoue elle aussi.
          if (fallbackResult.ok || !result || result.ok === false) {
            result = fallbackResult;
          }
        } catch (error: any) {
          console.error('[evaluate-device] gemini_fallback_fatal', model, error?.message ?? error);
        }
      }

      return result;
    };

    // Boucle sur la chaine de modeles. Un 404/400 signifie que le modele est en
    // cause : changer de cle ne servirait a rien, on passe au suivant.
    let geminiResult: GeminiCallResult | null = null;
    const modelsTried: string[] = [];

    if (primaryKey || fallbackKey) {
      for (const model of modelChain) {
        modelsTried.push(model);
        const result = await attemptWithKeys(model);
        geminiResult = result ?? geminiResult;

        if (result?.ok) break;

        if (budgetLeft() <= 0) {
          console.warn('[evaluate-device] budget epuise, abandon de la chaine', modelsTried.join(' > '));
          break;
        }

        if (!result || shouldTryNextModel(result.status)) {
          console.warn('[evaluate-device] modele en echec, passage au suivant', model, result?.status ?? 'fatal');
          continue;
        }

        // 401/403 : la cle est en cause, epuiser la chaine ne servirait a rien.
        break;
      }
    }

    let visionText: string | null = null;
    let visionProvider: string = 'none';

    if (geminiResult?.ok) {
      visionText = geminiResult.payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      visionProvider = geminiResult.keyUsed;
    }

    if (!visionText && openRouterReady) {
      try {
        console.warn('[evaluate-device] openrouter_fallback', modelsTried.join(' > ') || 'no_gemini');
        visionText = await openRouterVisionJson(
          finalPrompt,
          inlinePartsToVisionImages(imageParts),
        );
        visionProvider = 'openrouter';
      } catch (error: any) {
        const code = error instanceof Error ? error.message : 'openrouter_failed';
        console.error('[evaluate-device] openrouter_error', code);
        if (!geminiResult || !geminiResult.ok) {
          const statusCode = geminiResult && !geminiResult.ok ? geminiResult.status : 502;
          const errBody = geminiResult && !geminiResult.ok ? geminiResult.body : code;
          return new Response(
            JSON.stringify({
              error: 'Vision API error',
              code: code.startsWith('openrouter_http_') ? code : `gemini_http_${statusCode}`,
              provider: visionProvider,
              modelsTried,
              detail: String(errBody).slice(0, 200),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
          );
        }
      }
    }

    if (!visionText) {
      const statusCode = geminiResult && !geminiResult.ok ? geminiResult.status : 500;
      const errBody = geminiResult && !geminiResult.ok ? geminiResult.body : 'vision_unreachable';
      const keyLabel = geminiResult && !geminiResult.ok ? geminiResult.keyUsed : 'none';
      console.error('[evaluate-device] vision_error', statusCode, keyLabel, modelsTried.join(' > '), errBody);
      return new Response(
        JSON.stringify({
          error: 'Vision API error',
          code: `gemini_http_${statusCode}`,
          provider: keyLabel,
          modelsTried,
          detail: String(errBody).slice(0, 200),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    if (isPreflight) {
      const credibility = parseTrocPhotoCredibilityOutput(visionText);
      if (!credibility) {
        if (openRouterReady && visionProvider !== 'openrouter') {
          try {
            visionText = await openRouterVisionJson(
              finalPrompt,
              inlinePartsToVisionImages(imageParts),
            );
            visionProvider = 'openrouter';
            const retry = parseTrocPhotoCredibilityOutput(visionText);
            if (!retry) {
              return new Response(
                JSON.stringify({ error: 'JSON vision invalide', code: 'invalid_json' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
              );
            }
            const analysisDecision =
              retry.decision === 'approved'
                ? 'match'
                : retry.decision === 'mismatch'
                  ? 'mismatch'
                  : 'photos_to_retake';

            return new Response(
              JSON.stringify({
                preflight: true,
                evaluationMode: 'credibility_verified',
                photosUsed: imageParts.length,
                provider: visionProvider,
                analysisDecision,
                photoIssues: retry.photoIssues,
                observedBrand: retry.observedBrand,
                observedModel: retry.observedModel,
                declarationMatch: retry.declarationMatch,
                credibilitySummary: retry.summary,
                credibilityConfidence: retry.confidence,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
            );
          } catch {
            /* fall through */
          }
        }
        return new Response(
          JSON.stringify({ error: 'JSON vision invalide', code: 'invalid_json' }),
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
          provider: visionProvider,
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

    const parsed = parseTrocVisionAnalystOutput(visionText);

    if (!parsed) {
      if (openRouterReady && visionProvider !== 'openrouter') {
        try {
          visionText = await openRouterVisionJson(
            finalPrompt,
            inlinePartsToVisionImages(imageParts),
          );
          visionProvider = 'openrouter';
          const retryParsed = parseTrocVisionAnalystOutput(visionText);
          if (retryParsed) {
            const hasPhotoIssues = retryParsed.photoIssues.length > 0;
            const safeDecision = hasPhotoIssues ? 'photos_to_retake' : retryParsed.decision;
            return new Response(
              JSON.stringify({
                score: hasPhotoIssues ? 0 : retryParsed.score,
                justification: hasPhotoIssues ? '' : retryParsed.justification.slice(0, 2000),
                evaluationMode: 'vision_ai',
                photosUsed: imageParts.length,
                provider: visionProvider,
                analysisDecision: safeDecision,
                analysisConfidence: retryParsed.confidence,
                fraudDetected: retryParsed.fraudDetected,
                photoIssues: retryParsed.photoIssues,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
            );
          }
        } catch {
          /* fall through */
        }
      }
      return new Response(
        JSON.stringify({ error: 'JSON vision invalide', code: 'invalid_json' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const score = parsed.score;
    const justification = parsed.justification.slice(0, 2000);

    const hasPhotoIssues = parsed.photoIssues.length > 0;
    const safeDecision = hasPhotoIssues ? 'photos_to_retake' : parsed.decision;

    return new Response(
      JSON.stringify({
        score: hasPhotoIssues ? 0 : score,
        justification: hasPhotoIssues ? '' : justification,
        evaluationMode: 'vision_ai',
        photosUsed: imageParts.length,
        provider: visionProvider,
        analysisDecision: safeDecision,
        analysisConfidence: parsed.confidence,
        fraudDetected: parsed.fraudDetected,
        photoIssues: parsed.photoIssues,
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

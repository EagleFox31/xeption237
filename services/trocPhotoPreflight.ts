import { supabase } from './supabaseClient';
import type { TrocDeviceForm } from '../types';
import {
  DeviceMismatchError,
  PhotoRetakeRequiredError,
} from './trocEvaluationService';
import {
  buildPhotoCredibilityPrompt,
  CREDIBILITY_MAX_PHOTOS,
  parsePhotoCredibilityJson,
} from '../utils/trocPhotoCredibilityPrompt';
import { markTrocPhotosCredibilityVerified } from '../utils/trocPhotoCredibilitySession';
import { compressFilesForAiVision } from '../utils/compressImageForAi';
import { callCredibilityVision } from './trocVisionProvider';
import {
  getLocalGeminiKeyStatus,
  getOpenRouterKeyStatus,
  type VisionChannel,
  visionChannelLabel,
} from './trocVisionHealth';

type PreflightResponse = {
  analysisDecision?: string;
  photoIssues?: Array<{ index?: number }>;
  code?: string;
  error?: string;
};

const isVisionDisabled = (): boolean =>
  typeof import.meta !== 'undefined' &&
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_TROC_AI === 'false';

const isRateLimitError = (message: string): boolean =>
  /429|too\s*many|resource_exhausted|rate.?limit|quota/i.test(message);

const isRecoverableForFallback = (code: string): boolean =>
  code === 'EDGE_MISSING_GEMINI_KEY' ||
  code === 'OPENROUTER_MISSING_KEY' ||
  code === 'empty_response' ||
  code === 'invalid_json' ||
  code === 'Réponse Gemini vide' ||
  code === 'JSON Gemini invalide' ||
  code === 'preflight_failed' ||
  code.startsWith('gemini_http_429') ||
  code.startsWith('gemini_http_502') ||
  code.startsWith('gemini_http_503') ||
  code.startsWith('openrouter_http_429') ||
  code.startsWith('openrouter_http_502');

const VISION_UNAVAILABLE_MSG =
  'Impossible de vérifier vos photos pour le moment. Réessayez dans une minute avec des photos nettes (face avant, arrière, écran allumé).';

const isTechnicalErrorCode = (raw: string): boolean =>
  raw === 'empty_response' ||
  raw === 'invalid_json' ||
  raw === 'preflight_failed' ||
  raw === 'VISION_ALL_FAILED' ||
  raw.startsWith('VISION_ALL_FAILED:') ||
  /^[a-z][a-z0-9_]+$/.test(raw);

const errorCode = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? 'unknown');

export const formatPreflightError = (err: unknown): string => {
  const raw = errorCode(err);

  if (raw === 'VISION_NOT_CONFIGURED') {
    return 'Contrôle photo IA impossible : aucun canal vision actif. Ouvrez la checklist sous « Photos » ou configurez GEMINI_API_KEY sur Supabase (priorité 1).';
  }

  if (raw === 'empty_response' || raw === 'Réponse Gemini vide') {
    return VISION_UNAVAILABLE_MSG;
  }

  if (raw === 'invalid_json' || raw === 'JSON Gemini invalide') {
    return 'Le contrôle photo n\'a pas abouti. Réessayez avec des photos plus claires de votre téléphone.';
  }

  if (raw === 'VISION_ALL_FAILED' || raw.startsWith('VISION_ALL_FAILED:')) {
    return VISION_UNAVAILABLE_MSG;
  }

  if (isRateLimitError(raw)) {
    return 'Quota API atteint sur tous les canaux essayés. Attendez 2 minutes, ajoutez VITE_OPENROUTER_API_KEY (secours), ou mettez GEMINI_API_KEY sur Supabase.';
  }

  if (raw === 'CREDIBILITY_AI_REQUIRED') {
    return 'La vérification photo par IA est obligatoire avant le paiement.';
  }

  if (/gemini_http_401|gemini_http_403|openrouter_http_401|invalid.*key/i.test(raw)) {
    return 'Clé API refusée. Vérifiez GEMINI_API_KEY (Supabase) ou VITE_GEMINI_API_KEY (AIza… AI Studio).';
  }

  if (isTechnicalErrorCode(raw)) {
    return VISION_UNAVAILABLE_MSG;
  }

  if (raw && !/^gemini_http_\d+$/i.test(raw) && !/^openrouter_http_\d+$/i.test(raw)) {
    return raw;
  }

  return VISION_UNAVAILABLE_MSG;
};

const fileToInlinePart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string } }> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return {
    inlineData: {
      mimeType: file.type || 'image/jpeg',
      data: btoa(binary),
    },
  };
};

const applyCredibilityDecision = (
  decision: string | undefined,
  photoIssues: Array<{ index?: number }>,
  photoCount: number,
): void => {
  const indices = photoIssues
    .map((p) => Number(p?.index))
    .filter((i) => Number.isFinite(i) && i >= 1);

  if (decision === 'retake' || decision === 'photos_to_retake' || indices.length > 0) {
    throw new PhotoRetakeRequiredError(
      indices.length > 0 ? indices : Array.from({ length: photoCount }, (_, i) => i + 1),
    );
  }

  if (decision === 'mismatch') {
    throw new DeviceMismatchError(
      'Les photos ne correspondent pas au téléphone déclaré. Envoyez des photos nettes du bon appareil.',
    );
  }
};

const parseAndApply = (text: string, photoCount: number): void => {
  const parsed = parsePhotoCredibilityJson(text);
  if (!parsed) throw new Error('invalid_json');
  applyCredibilityDecision(parsed.decision, parsed.photoIssues, photoCount);
};

const buildLocalBatch = async (photoFiles: File[]) => {
  const batch = await compressFilesForAiVision(photoFiles.slice(0, CREDIBILITY_MAX_PHOTOS));
  const imageParts = await Promise.all(batch.map(fileToInlinePart));
  return { batch, imageParts };
};

const preflightViaEdge = async (form: TrocDeviceForm, photoUrls: string[]): Promise<void> => {
  const urlsForCheck = photoUrls.slice(0, CREDIBILITY_MAX_PHOTOS);

  const { data, error } = await supabase.functions.invoke('evaluate-device', {
    body: {
      preflight: true,
      photoUrls: urlsForCheck,
      deviceInfo: {
        brand: form.deviceBrand,
        model: form.deviceModel,
        batteryHealth: form.batteryHealth,
      },
    },
  });

  const payload = (data ?? {}) as PreflightResponse;

  if (error) {
    if (payload.code === 'missing_api_key') throw new Error('EDGE_MISSING_GEMINI_KEY');
    if (payload.code === 'empty_response') throw new Error('empty_response');
    if (payload.code === 'invalid_json') throw new Error('invalid_json');
    if (payload.code?.startsWith('gemini_http_')) throw new Error(payload.code);
    throw new Error('preflight_failed');
  }

  if (payload.code === 'missing_api_key') throw new Error('EDGE_MISSING_GEMINI_KEY');
  if (payload.code === 'empty_response') throw new Error('empty_response');
  if (payload.code === 'invalid_json') throw new Error('invalid_json');
  if (payload.code?.startsWith('gemini_http_')) throw new Error(payload.code);
  if (payload.error && !payload.analysisDecision) {
    if (payload.code) throw new Error(payload.code);
    throw new Error(payload.error);
  }

  applyCredibilityDecision(payload.analysisDecision, payload.photoIssues ?? [], urlsForCheck.length);
};

const preflightViaClientChannel = async (
  channel: Exclude<VisionChannel, 'edge'>,
  form: TrocDeviceForm,
  photoFiles: File[],
): Promise<void> => {
  const { batch, imageParts } = await buildLocalBatch(photoFiles);
  const prompt = buildPhotoCredibilityPrompt({
    brand: form.deviceBrand,
    model: form.deviceModel,
    photoCount: imageParts.length,
  });

  const text = await callCredibilityVision(channel, prompt, imageParts);
  parseAndApply(text, batch.length);
};

/** Cascade : Edge → OpenRouter → Gemini local. */
const resolveCascade = (): VisionChannel[] => {
  const chain: VisionChannel[] = ['edge'];
  if (getOpenRouterKeyStatus().available) chain.push('openrouter');
  if (getLocalGeminiKeyStatus().available) chain.push('local-gemini');
  return chain;
};

const runVisionCascade = async (
  form: TrocDeviceForm,
  photoUrls: string[],
  photoFiles: File[],
): Promise<{ channel: VisionChannel }> => {
  const chain = resolveCascade();
  if (chain.length === 0) throw new Error('VISION_NOT_CONFIGURED');

  const failures: string[] = [];

  for (const channel of chain) {
    try {
      if (channel === 'edge') {
        await preflightViaEdge(form, photoUrls);
      } else {
        await preflightViaClientChannel(channel, form, photoFiles);
      }
      return { channel };
    } catch (err) {
      if (err instanceof PhotoRetakeRequiredError || err instanceof DeviceMismatchError) throw err;

      const code = errorCode(err);
      failures.push(`${visionChannelLabel[channel]} : ${code}`);

      if (!isRecoverableForFallback(code) && channel === chain[chain.length - 1]) {
        throw err;
      }
      if (!isRecoverableForFallback(code) && channel !== chain[chain.length - 1]) {
        continue;
      }
    }
  }

  console.warn('[troc-preflight] cascade failures', failures);
  throw new Error('VISION_ALL_FAILED');
};

/**
 * Contrôle IA crédibilité photo — obligatoire avant paiement.
 * Cascade automatique, un canal qui réussit suffit.
 */
export const preflightDevicePhotos = async (
  form: TrocDeviceForm,
  photoUrls: string[],
  photoFiles: File[],
): Promise<void> => {
  if (photoUrls.length === 0 || photoFiles.length === 0) {
    throw new Error('Ajoutez au moins une photo de votre téléphone pour continuer.');
  }

  if (isVisionDisabled()) {
    throw new Error('CREDIBILITY_AI_REQUIRED');
  }

  try {
    await runVisionCascade(form, photoUrls, photoFiles);
    markTrocPhotosCredibilityVerified(photoUrls);
  } catch (err) {
    if (err instanceof PhotoRetakeRequiredError || err instanceof DeviceMismatchError) throw err;
    throw new Error(formatPreflightError(err));
  }
};

export { probeTrocVisionHealth } from './trocVisionHealth';
export type { VisionHealthReport } from './trocVisionHealth';

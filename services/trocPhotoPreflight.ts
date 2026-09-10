import { supabase } from './supabaseClient';
import type { TrocDeviceForm } from '../types';
import {
  DeviceMismatchError,
  PhotoRetakeRequiredError,
} from './trocEvaluationService';
import { markTrocPhotosCredibilityVerified } from '../utils/trocPhotoCredibilitySession';
import { getTrocSessionKey } from '../utils/trocSessionKey';

type PreflightResponse = {
  analysisDecision?: string;
  photoIssues?: Array<{ index?: number }>;
  code?: string;
  error?: string;
  provider?: string;
};

const isVisionDisabled = (): boolean =>
  typeof import.meta !== 'undefined' &&
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_TROC_AI === 'false';

const isRateLimitError = (message: string): boolean =>
  /429|too\s*many|resource_exhausted|rate.?limit|quota/i.test(message);

const VISION_UNAVAILABLE_MSG =
  'Impossible de vérifier vos photos pour le moment. Réessayez dans une minute avec des photos nettes (face avant, arrière, écran allumé).';

const isTechnicalErrorCode = (raw: string): boolean =>
  raw === 'empty_response' ||
  raw === 'invalid_json' ||
  raw === 'preflight_failed' ||
  raw === 'VISION_FAILED' ||
  /^[a-z][a-z0-9_]+$/.test(raw);

const errorCode = (err: unknown): string =>
  err instanceof Error ? err.message : String(err ?? 'unknown');

export const formatPreflightError = (err: unknown): string => {
  const raw = errorCode(err);

  if (raw === 'VISION_NOT_CONFIGURED') {
    return 'Contrôle photo IA impossible : configurez GEMINI_API_KEY (ou OPENROUTER_API_KEY secours) sur Supabase → Edge Functions → Secrets.';
  }

  if (raw === 'empty_response' || raw === 'Réponse Gemini vide') {
    return VISION_UNAVAILABLE_MSG;
  }

  if (raw === 'invalid_json' || raw === 'JSON Gemini invalide') {
    return 'Le contrôle photo n\'a pas abouti. Réessayez avec des photos plus claires de votre téléphone.';
  }

  if (raw === 'VISION_FAILED') {
    return VISION_UNAVAILABLE_MSG;
  }

  if (isRateLimitError(raw)) {
    return 'Quota API atteint. Attendez 2 minutes ou vérifiez GEMINI_API_KEY / OPENROUTER_API_KEY sur Supabase.';
  }

  if (raw === 'CREDIBILITY_AI_REQUIRED') {
    return 'La vérification photo par IA est obligatoire avant le paiement.';
  }

  if (/gemini_http_401|gemini_http_403|openrouter_http_401|invalid.*key/i.test(raw)) {
    return 'Clé API refusée. Vérifiez GEMINI_API_KEY et OPENROUTER_API_KEY sur Supabase.';
  }

  if (isTechnicalErrorCode(raw)) {
    return VISION_UNAVAILABLE_MSG;
  }

  if (raw && !/^gemini_http_\d+$/i.test(raw) && !/^openrouter_http_\d+$/i.test(raw)) {
    return raw;
  }

  return VISION_UNAVAILABLE_MSG;
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

const preflightViaEdge = async (form: TrocDeviceForm, photoUrls: string[]): Promise<void> => {
  const urlsForCheck = photoUrls.slice(0, 4);

  const { data, error } = await supabase.functions.invoke('evaluate-device', {
    body: {
      sessionKey: getTrocSessionKey(),
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
    if (payload.code === 'rate_limited') throw new Error('rate_limited');
    if (payload.code === 'missing_api_key') throw new Error('EDGE_MISSING_GEMINI_KEY');
    if (payload.code === 'empty_response') throw new Error('empty_response');
    if (payload.code === 'invalid_json') throw new Error('invalid_json');
    if (payload.code?.startsWith('gemini_http_')) throw new Error(payload.code);
    if (payload.code?.startsWith('openrouter_http_')) throw new Error(payload.code);
    throw new Error('preflight_failed');
  }

  if (payload.code === 'missing_api_key') throw new Error('EDGE_MISSING_GEMINI_KEY');
  if (payload.code === 'empty_response') throw new Error('empty_response');
  if (payload.code === 'invalid_json') throw new Error('invalid_json');
  if (payload.code?.startsWith('gemini_http_')) throw new Error(payload.code);
  if (payload.code?.startsWith('openrouter_http_')) throw new Error(payload.code);
  if (payload.error && !payload.analysisDecision) {
    if (payload.code) throw new Error(payload.code);
    throw new Error(payload.error);
  }

  applyCredibilityDecision(payload.analysisDecision, payload.photoIssues ?? [], urlsForCheck.length);
};

/**
 * Contrôle IA crédibilité photo — obligatoire avant paiement.
 * Lot 4 : Edge evaluate-device uniquement (Gemini + secours OpenRouter côté serveur).
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
    await preflightViaEdge(form, photoUrls);
    markTrocPhotosCredibilityVerified(photoUrls);
  } catch (err) {
    if (err instanceof PhotoRetakeRequiredError || err instanceof DeviceMismatchError) throw err;
    throw new Error(formatPreflightError(err));
  }
};

export { probeTrocVisionHealth } from './trocVisionHealth';
export type { VisionHealthReport } from './trocVisionHealth';

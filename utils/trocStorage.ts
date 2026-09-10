import type {
  TrocDeviceForm,
  TradeInRequest,
  TrocEvaluationResult,
} from '../types';
import type { ImeiDeviceInfo } from '../services/trocEvaluationService';
import type { TrocStep, ImeiMatchState } from '../hooks/useTradeIn';

export const TROC_DRAFT_STORAGE_KEY = 'xeption_troc_draft_v1';
export const TROC_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

export interface TrocLocalDraft {
  version: 1;
  savedAt: number;
  sessionKey: string;
  step: TrocStep;
  form: TrocDeviceForm;
  imeiStatus: TradeInRequest['imei_status'];
  imeiBlacklistStatus?: TradeInRequest['imei_blacklist_status'];
  imeiAssuranceLevel?: TradeInRequest['imei_assurance_level'];
  imeiDeviceInfo?: ImeiDeviceInfo | null;
  imeiDeviceSource?: 'provider' | 'historical' | 'declared' | null;
  imeiEvidenceCount?: number;
  imeiMatchState?: ImeiMatchState;
  photoUrls: string[];
  paymentReference?: string | null;
  result?: TrocEvaluationResult | null;
  savedRequest?: {
    id: string;
    voucher_reference: string;
    voucher_expires_at?: string | null;
    created_at?: string | null;
    target_product_id?: string | null;
    target_product_name?: string | null;
  } | null;
}

/**
 * Vérifie si le brouillon contient des données utiles (au-delà d'un formulaire vide).
 */
export function hasDraftContent(draft: Partial<TrocLocalDraft> | null | undefined): boolean {
  if (!draft) return false;
  if (draft.step && draft.step !== 'form') return true;
  if (draft.paymentReference) return true;
  if (draft.result) return true;
  if (draft.savedRequest) return true;
  if (draft.photoUrls && draft.photoUrls.length > 0) return true;
  const f = draft.form;
  if (f) {
    if (
      f.deviceBrand?.trim() ||
      f.deviceModel?.trim() ||
      f.imei?.trim() ||
      f.customerName?.trim() ||
      f.customerPhone?.trim()
    ) {
      return true;
    }
  }
  return false;
}

const defaultDraftForm: TrocDeviceForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  deviceBrand: '',
  deviceModel: '',
  deviceStorage: '',
  deviceRam: '',
  acquisitionCondition: 'used',
  purchaseDate: '',
  ownershipRank: 'unknown',
  batteryHealth: 80,
  screenCondition: '',
  bodyCondition: '',
  cameraCondition: 'bon',
  powersOn: true,
  chargesNormally: true,
  biometricsWork: true,
  accountUnlocked: true,
  hasWaterDamage: false,
  previousRepairs: 'aucune',
  accessories: [],
  hasOriginalBox: false,
  hasInvoice: false,
  imei: '',
};

/**
 * Sauvegarde le brouillon Smart Troc dans le localStorage avec horodatage TTL.
 */
export function saveTrocDraft(patch: Partial<TrocLocalDraft>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const existing = loadTrocDraft();
    const draft: TrocLocalDraft = {
      version: 1,
      savedAt: Date.now(),
      sessionKey: patch.sessionKey ?? existing?.sessionKey ?? '',
      step: patch.step ?? existing?.step ?? 'form',
      form: patch.form ?? existing?.form ?? defaultDraftForm,
      imeiStatus: patch.imeiStatus ?? existing?.imeiStatus ?? 'not_checked',
      imeiBlacklistStatus: patch.imeiBlacklistStatus ?? existing?.imeiBlacklistStatus ?? 'unknown',
      imeiAssuranceLevel: patch.imeiAssuranceLevel ?? existing?.imeiAssuranceLevel ?? 'basic',
      imeiDeviceInfo: patch.imeiDeviceInfo !== undefined ? patch.imeiDeviceInfo : (existing?.imeiDeviceInfo ?? null),
      imeiDeviceSource: patch.imeiDeviceSource !== undefined ? patch.imeiDeviceSource : (existing?.imeiDeviceSource ?? null),
      imeiEvidenceCount: patch.imeiEvidenceCount ?? existing?.imeiEvidenceCount ?? 0,
      imeiMatchState: patch.imeiMatchState ?? existing?.imeiMatchState ?? 'unknown',
      // Conserve uniquement les URLs de photos déjà uploadées vers le stockage serveur
      photoUrls: patch.photoUrls ?? existing?.photoUrls ?? [],
      paymentReference: patch.paymentReference !== undefined ? patch.paymentReference : (existing?.paymentReference ?? null),
      result: patch.result !== undefined ? patch.result : (existing?.result ?? null),
      savedRequest: patch.savedRequest !== undefined ? patch.savedRequest : (existing?.savedRequest ?? null),
    };

    // Ne rien écrire si le brouillon est vide (ex: après un reset "Nouvelle estimation")
    if (!hasDraftContent(draft)) {
      clearTrocDraft();
      return;
    }

    localStorage.setItem(TROC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn('[troc] Impossible d\'écrire le brouillon localStorage', e);
  }
}

/**
 * Charge le brouillon Smart Troc s'il existe et que son TTL (<24h) est encore valide.
 */
export function loadTrocDraft(): TrocLocalDraft | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TROC_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as TrocLocalDraft;
    if (!draft || draft.version !== 1) {
      clearTrocDraft();
      return null;
    }

    // Vérification du TTL : expire après 24 heures
    if (typeof draft.savedAt !== 'number' || Date.now() - draft.savedAt > TROC_DRAFT_TTL_MS) {
      clearTrocDraft();
      return null;
    }

    // Ne pas restaurer un brouillon sans contenu pertinent
    if (!hasDraftContent(draft)) {
      clearTrocDraft();
      return null;
    }

    return draft;
  } catch (e) {
    console.warn('[troc] Erreur lecture brouillon localStorage, reset', e);
    clearTrocDraft();
    return null;
  }
}

/**
 * Nettoie complètement le brouillon local Smart Troc (ex: Nouvelle estimation).
 */
export function clearTrocDraft(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(TROC_DRAFT_STORAGE_KEY);
  } catch {}
}

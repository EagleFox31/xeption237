import { useState, useRef } from 'react';
import {
  checkImei,
  evaluateDevice,
  precheckTooOld,
  findCatalogModel,
  lookupImeiFromHistory,
  saveTradeInRequest,
  upsertSession,
  upsertTrocIntake,
  createPayment,
  getPaymentStatus,
  PhotoRetakeRequiredError,
  DeviceMismatchError,
  type ImeiDeviceInfo,
} from '../services/trocEvaluationService';
import { uploadFiles } from '../services/uploadService';
import { preflightDevicePhotos } from '../services/trocPhotoPreflight';
import { validateTrocForm } from '../utils/trocFormValidation';
import type { Product, TrocDeviceForm, TrocEvaluationResult, TradeInRequest } from '../types';
import { TROC_TUNNEL_TIER, type TrocTier } from '../utils/trocPricing';
import { TROC_MESSAGES } from '../utils/trocMessages';
import { supabase } from '../services/supabaseClient';
import { getTrocSessionKey } from '../utils/trocSessionKey';

export type TrocStep = 'form' | 'photos' | 'imei' | 'payment' | 'evaluating' | 'result' | 'voucher';
export type ImeiMatchState = 'unknown' | 'match' | 'mismatch' | 'not_verified';
export type PaymentState = 'idle' | 'initiating' | 'pending' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';

const PAYMENT_POLL_INTERVAL_MS = 3_000;
const PAYMENT_TIMEOUT_MS       = 10 * 60 * 1_000; // 10 min

const DEFAULT_BASE_PRICE = 0;

const initialForm: TrocDeviceForm = {
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

const normalize = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const isSoftMatch = (expected?: string, detected?: string) => {
  const a = normalize(expected);
  const b = normalize(detected);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

// Clé de session générée une fois par visite, persistée dans sessionStorage.
const getSessionKey = getTrocSessionKey;

export const useTradeIn = () => {
  const sessionKey = getSessionKey();
  const [step, setStep] = useState<TrocStep>('form');
  const [form, setForm] = useState<TrocDeviceForm>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  // Index 1-based des photos signalées non conformes par Gemini Vision.
  // Reset dès que l'utilisateur modifie sa sélection.
  const [photoIssueIndices, setPhotoIssueIndices] = useState<number[]>([]);
  const [imeiStatus, setImeiStatus] = useState<TradeInRequest['imei_status']>('not_checked');
  const [imeiBlacklistStatus, setImeiBlacklistStatus] = useState<TradeInRequest['imei_blacklist_status']>('unknown');
  const [imeiAssuranceLevel, setImeiAssuranceLevel] = useState<TradeInRequest['imei_assurance_level']>('basic');
  const [imeiDeviceInfo, setImeiDeviceInfo] = useState<ImeiDeviceInfo | null>(null);
  const [imeiDeviceSource, setImeiDeviceSource] = useState<'provider' | 'historical' | 'declared' | null>(null);
  const [imeiEvidenceCount, setImeiEvidenceCount] = useState(0);
  const [imeiMatchState, setImeiMatchState] = useState<ImeiMatchState>('unknown');
  const [result, setResult] = useState<TrocEvaluationResult | null>(null);
  const [savedRequest, setSavedRequest] = useState<Pick<TradeInRequest, 'id' | 'voucher_reference'> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingPhotos, setIsCheckingPhotos] = useState(false);
  const [isCheckingImei, setIsCheckingImei] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState(DEFAULT_BASE_PRICE);

  // ─── Paiement ─────────────────────────────────────────────────────────────
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TrocTier>(TROC_TUNNEL_TIER);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const pollTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPaymentTimers = () => {
    if (pollTimerRef.current)    { clearInterval(pollTimerRef.current);  pollTimerRef.current = null; }
    if (timeoutTimerRef.current) { clearTimeout(timeoutTimerRef.current); timeoutTimerRef.current = null; }
  };

  const updateForm = (partial: Partial<TrocDeviceForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    if (Object.prototype.hasOwnProperty.call(partial, 'imei')) {
      setImeiStatus('not_checked');
      setImeiBlacklistStatus('unknown');
      setImeiAssuranceLevel('basic');
      setImeiDeviceInfo(null);
      setImeiDeviceSource(null);
      setImeiEvidenceCount(0);
      setImeiMatchState('unknown');
    }
    setError(null);
  };

  const updatePhotos = (files: File[]) => {
    setPhotos(files);
    setPhotoIssueIndices([]);
    setError(null);
  };

  const goToImei = () => {
    const errors = validateTrocForm(form);
    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }
    setError(null);
    setStep('imei');
    upsertSession(sessionKey, 'form', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel });
  };

  const goToPhotosQuick = async () => {
    if (imeiStatus !== 'valid') {
      setError("Vérifiez votre IMEI avant de continuer.");
      return;
    }
    // Match catalogue (auto IMEI OU modèle tapé) → prix exact + id avant le pré-check.
    const matchedBasePrice = (await applyCatalogMatch(form.deviceBrand, form.deviceModel)) || basePrice;
    // Pré-check âge AVANT photos/paiement → on prévient le client trop tôt (anti « payé puis refusé »).
    const tooOld = await precheckTooOld(form, matchedBasePrice);
    if (tooOld) { setResult(tooOld); setStep('result'); return; }
    setError(null);
    setStep('photos');
    upsertSession(sessionKey, 'form', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel });
  };

  const goToPhotos = async () => {
    if (imeiStatus !== 'valid') {
      setError("L'IMEI n'a pas pu être confirmé. Vérifiez-le avant d'ajouter vos photos.");
      return;
    }
    if (imeiMatchState !== 'match' && imeiMatchState !== 'not_verified') {
      setError("L'IMEI doit être confirmé avant d'ajouter vos photos.");
      return;
    }
    // Pré-check âge AVANT photos/paiement → on prévient le client trop tôt (anti « payé puis refusé »).
    const tooOld = await precheckTooOld(form, basePrice);
    if (tooOld) { setResult(tooOld); setStep('result'); return; }
    setError(null);
    setStep('photos');
    upsertSession(sessionKey, 'imei', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel });
  };

  const continueFromPhotos = async () => {
    if (isUploading || isCheckingPhotos) return;
    if (imeiStatus !== 'valid') {
      setError("L'IMEI n'a pas pu être confirmé. Revenez à l'étape précédente.");
      return;
    }
    if (photos.length === 0) {
      setError('Ajoutez au moins une photo de votre appareil pour continuer.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setPhotoIssueIndices([]);
    try {
      const urls = await uploadFiles(photos);
      setIsUploading(false);
      setIsCheckingPhotos(true);
      await preflightDevicePhotos(form, urls, photos);
      setPhotoUrls(urls);

      const intake = await upsertTrocIntake(sessionKey, form, urls, {
        imeiStatus,
        imeiBlacklistStatus,
        imeiAssuranceLevel,
      });

      upsertSession(sessionKey, 'photos', {
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
        tradeInId: intake?.id,
      });
      setPaymentState('idle');
      setPaymentReference(null);
      setSelectedTier(TROC_TUNNEL_TIER);
      setError(null);
      setStep('payment');
    } catch (err) {
      if (err instanceof PhotoRetakeRequiredError) {
        setPhotoIssueIndices(err.issueIndices);
        setError(
          err.issueIndices.length > 0
            ? "Ces photos ne montrent pas un smartphone (montre, autre objet ou capture d'écran). Remplacez celles signalées en rouge."
            : 'Certaines photos ne sont pas exploitables. Remplacez-les avant de continuer.',
        );
        return;
      }
      if (err instanceof DeviceMismatchError) {
        setPhotoIssueIndices(photos.map((_, i) => i + 1));
        setError(
          err.detail ||
            "Les photos ne correspondent pas au téléphone déclaré. Remplacez-les par des photos nettes de l'appareil indiqué dans le formulaire.",
        );
        return;
      }
      setError(
        err instanceof Error && err.message
          ? err.message
          : "L'envoi ou la vérification des photos a échoué. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setIsUploading(false);
      setIsCheckingPhotos(false);
    }
  };

  // Auto-match catalogue : le QuickForm hérite du prix exact (base_price + tradeInModelId)
  // sans sélection manuelle, comme une sélection Wizard. Renvoie le base_price trouvé (0 sinon)
  // pour usage synchrone (le setBasePrice d'état n'est pas encore propagé au moment de l'appel).
  const applyCatalogMatch = async (brand?: string | null, model?: string | null): Promise<number> => {
    const match = await findCatalogModel(brand ?? '', model ?? '');
    if (!match) return 0;
    setBasePrice(match.basePrice);
    setForm((prev) => ({ ...prev, tradeInModelId: match.id }));
    return match.basePrice;
  };

  const doCheckImei = async () => {
    if (!form.imei) {
      setImeiStatus('not_checked');
      setImeiMatchState('unknown');
      return;
    }

    setIsCheckingImei(true);
    setError(null);

    try {
      const { status, blacklistStatus, assuranceLevel, reason, deviceInfo } = await checkImei(form.imei, sessionKey);
      setImeiStatus(status);
      setImeiBlacklistStatus(blacklistStatus);
      setImeiAssuranceLevel(assuranceLevel);
      upsertSession(sessionKey, 'imei', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel });

      if (status === 'valid') {
        if (deviceInfo) {
          setImeiDeviceInfo(deviceInfo);
          setImeiDeviceSource('provider');
          setImeiEvidenceCount(0);
          void applyCatalogMatch(deviceInfo.brand, deviceInfo.model);
          const brandMatch = isSoftMatch(form.deviceBrand, deviceInfo.brand);
          const modelMatch = isSoftMatch(form.deviceModel, deviceInfo.model);
          if (brandMatch && modelMatch) {
            setImeiMatchState('match');
          } else {
            setImeiMatchState('mismatch');
            setError(
              "L'IMEI détecté ne correspond pas à la marque/modèle indiqué. Venez en boutique pour vérification."
            );
          }
        } else if (form.deviceBrand || form.deviceModel) {
          const history = await lookupImeiFromHistory(form.imei);
          if (history) {
            setImeiDeviceInfo({ brand: history.brand, model: history.model });
            setImeiDeviceSource('historical');
            setImeiEvidenceCount(history.count);
            void applyCatalogMatch(history.brand, history.model);
            const brandMatch = isSoftMatch(form.deviceBrand, history.brand);
            const modelMatch = isSoftMatch(form.deviceModel, history.model);
            if (brandMatch && modelMatch && history.count >= 3) {
              setImeiMatchState('match');
            } else if (brandMatch && modelMatch) {
              setImeiMatchState('not_verified');
              setError(
                "L'appareil semble correspondre mais la confirmation se fera en boutique."
              );
            } else {
              setImeiMatchState('mismatch');
              setError(
                "L'appareil détecté ne correspond pas à ce que vous avez indiqué. Venez en boutique pour vérification."
              );
            }
          } else {
            setImeiDeviceInfo(null);
            setImeiDeviceSource('declared');
            setImeiEvidenceCount(0);
            setImeiMatchState('not_verified');
            // Message informatif — pas une erreur bloquante, le modèle sera confirmé en boutique
          }
        } else {
          setImeiDeviceInfo(null);
          setImeiDeviceSource(null);
          setImeiEvidenceCount(0);
          setImeiMatchState('not_verified');
        }
      } else if (status === 'check_failed') {
        setImeiDeviceInfo(null);
        setImeiDeviceSource(null);
        setImeiEvidenceCount(0);
        setImeiMatchState('unknown');
        const normalizedReason = (reason || '').toLowerCase();
        if (normalizedReason.includes('401') || normalizedReason.includes('unauthorized')) {
          setError("Vérification IMEI temporairement indisponible. Apportez l'appareil en boutique.");
        } else if (normalizedReason.includes('rate_limited')) {
          setError(TROC_MESSAGES.ai_rate_limited);
        } else if (normalizedReason.includes('invalid_imei_checksum')) {
          setError('Ce numéro IMEI semble incorrect. Vérifiez les 15 chiffres en composant *#06# sur votre téléphone.');
        } else {
          setError("Vérification IMEI indisponible pour le moment. La confirmation se fera en boutique.");
        }
      } else {
        setImeiMatchState('unknown');
      }
    } catch {
      setImeiStatus('check_failed');
      setImeiDeviceInfo(null);
      setImeiDeviceSource(null);
      setImeiEvidenceCount(0);
      setImeiMatchState('unknown');
      setError("Vérification IMEI indisponible pour le moment. La confirmation se fera en boutique.");
    } finally {
      setIsCheckingImei(false);
    }
  };

  const skipImei = () => {
    setImeiStatus('not_checked');
    setImeiBlacklistStatus('unknown');
    setImeiAssuranceLevel('basic');
    setImeiDeviceInfo(null);
    setImeiDeviceSource(null);
    setImeiEvidenceCount(0);
    setImeiMatchState('unknown');
    setError("L'évaluation automatique nécessite un IMEI vérifié. Apportez l'appareil en boutique pour une estimation directe.");
  };

  const goToPayment = () => {
    if (imeiStatus !== 'valid') {
      setError("L'IMEI n'a pas pu être confirmé. Venez en boutique pour une estimation directe.");
      return;
    }
    
    if (paymentState === 'paid') {
      // Si l'utilisateur a déjà payé mais a été renvoyé en arrière (ex: pour mauvaises photos)
      runEvaluation();
      return;
    }

    setPaymentState('idle');
    setPaymentReference(null);
    setSelectedTier(TROC_TUNNEL_TIER);
    setError(null);
    setStep('payment');
  };

  const initiatePayment = async (phone: string) => {
    const tier = TROC_TUNNEL_TIER;
    setPaymentState('initiating');
    setSelectedTier(tier);
    setError(null);
    try {
      upsertSession(sessionKey, 'payment', {
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
      });

      const { reference, amount } = await createPayment(sessionKey, phone, {
        tier,
        customerName:  form.customerName || undefined,
        customerPhone: form.customerPhone || undefined,
        customerEmail: form.customerEmail || undefined,
      });
      setPaymentReference(reference);
      setPaymentAmount(amount);
      setPaymentState('pending');

      // Démarrage polling
      pollTimerRef.current = setInterval(async () => {
        const poll = await getPaymentStatus(sessionKey, reference);
        if (!poll) return;
        if (poll.status === 'paid') {
          clearPaymentTimers();
          setPaymentState('paid');
          setTimeout(() => runEvaluation(), 800);
        } else if (poll.status === 'failed') {
          clearPaymentTimers();
          setPaymentState('failed');
          setError('Le paiement a échoué. Vérifiez le solde de votre compte ou utilisez un autre numéro.');
        } else if (poll.status === 'expired') {
          clearPaymentTimers();
          setPaymentState('expired');
          setError('Le délai de paiement a expiré. Recommencez pour une nouvelle tentative.');
        }
      }, PAYMENT_POLL_INTERVAL_MS);

      // Timeout côté client (10 min)
      timeoutTimerRef.current = setTimeout(() => {
        clearPaymentTimers();
        setPaymentState('timeout');
        setError('La confirmation de paiement a pris trop de temps. Réessayez ou contactez la boutique.');
      }, PAYMENT_TIMEOUT_MS);

    } catch {
      setPaymentState('failed');
      setError('Impossible d\'initier le paiement. Vérifiez votre connexion et réessayez.');
    }
  };

  const retryPayment = () => {
    clearPaymentTimers();
    setPaymentState('idle');
    setPaymentReference(null);
    setError(null);
  };

  // Appelé quand l'utilisateur revient sur /troc?ref=... après paiement NotchPay
  // et que la vérification serveur confirme status === 'paid'
  const onCallbackPaid = (reference: string) => {
    clearPaymentTimers();
    setPaymentReference(reference);
    setPaymentState('paid');
    setStep('payment'); // affiche l'écran "Paiement confirmé" brièvement
    setTimeout(() => runEvaluation(), 800);
  };

  const runEvaluation = async (overrideStatus?: TradeInRequest['imei_status']) => {
    const status = overrideStatus ?? imeiStatus;
    if (status !== 'valid') {
      setError(
        "L'IMEI n'a pas pu être confirmé pour cet appareil. Venez en boutique pour une estimation directe."
      );
      setStep('imei');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setStep('evaluating');
    try {
      const evaluation = await evaluateDevice(form, photoUrls, status, basePrice);
      setResult(evaluation);
      setStep('result');
      upsertSession(sessionKey, 'result', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel });

      // Refus APRÈS paiement → tracer le dossier (sinon paiement orphelin invisible en admin).
      // L'évaluation a lieu après paiement : tout refus ici = client qui a payé puis refusé.
      if (evaluation.tradeInGrade === 'refuse') {
        saveTradeInRequest(form, photoUrls, evaluation, sessionKey)
          .then((saved) =>
            setSavedRequest({ id: saved.id, voucher_reference: saved.voucherReference }))
          .catch((e) => console.warn('[troc] save dossier refusé échoué', e));
      }
    } catch (err: any) {
      // Photos non conformes (cas le plus fréquent) — ton neutre, pas accusateur.
      if (err instanceof PhotoRetakeRequiredError) {
        setPhotoIssueIndices(err.issueIndices);
        setError(
          err.issueIndices.length > 0
            ? "Une ou plusieurs photos ne montrent pas clairement votre téléphone. Remplacez celles signalées en rouge pour relancer l'estimation."
            : "Certaines photos ne sont pas exploitables. Remplacez-les pour relancer l'estimation.",
        );
        setStep('photos');
        return;
      }
      if (err instanceof DeviceMismatchError) {
        setPhotoIssueIndices(photoUrls.map((_, i) => i + 1));
        setError(
          err.detail ||
            "Les photos ne correspondent pas au téléphone déclaré. Remplacez-les par des photos nettes de l'appareil indiqué dans le formulaire.",
        );
        setStep('photos');
        return;
      }
      // Cas extrême — preuves de manipulation détectées par Gemini.
      if (err.message && err.message.startsWith('FRAUD_DETECTED:')) {
        const msg = err.message.replace('FRAUD_DETECTED:', '');
        setError(`Vérification échouée : ${msg}`);
        setStep('photos');
        return;
      }
      setError("L'évaluation a échoué. Vérifiez votre connexion et réessayez.");
      setStep('imei');
    } finally {
      setIsEvaluating(false);
    }
  };

  // targetProduct : appareil cible du troc (Smart Troc). Optionnel → sans cible = bon générique.
  const persist = async (targetProduct?: Product | null) => {
    if (!result) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (form.createAccount && form.customerEmail) {
        // Envoi d'un Magic Link en arrière-plan
        supabase.auth.signInWithOtp({ email: form.customerEmail.trim() }).catch(console.error);
      }

      const saved = await saveTradeInRequest(form, photoUrls, result, sessionKey, targetProduct);
      setSavedRequest({
        id: saved.id,
        voucher_reference: saved.voucherReference,
      });
      setStep('voucher');
      upsertSession(sessionKey, 'voucher', { deviceBrand: form.deviceBrand, deviceModel: form.deviceModel, tradeInId: saved.id });
    } catch {
      setError("Une erreur est survenue lors de la validation. Réessayez ou contactez la boutique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptOffer = (targetProduct?: Product | null) => persist(targetProduct);

  const refuse = () => {
    setResult(null);
    setStep('form');
    setError(null);
  };

  const reset = () => {
    clearPaymentTimers();
    setStep('form');
    setForm(initialForm);
    setPhotos([]);
    setPhotoUrls([]);
    setPhotoIssueIndices([]);
    setImeiStatus('not_checked');
    setImeiDeviceInfo(null);
    setImeiDeviceSource(null);
    setImeiEvidenceCount(0);
    setImeiMatchState('unknown');
    setResult(null);
    setSavedRequest(null);
    setError(null);
    setBasePrice(DEFAULT_BASE_PRICE);
    setPaymentState('idle');
    setPaymentReference(null);
    setSelectedTier(TROC_TUNNEL_TIER);
    setPaymentAmount(0);
  };

  return {
    step,
    form,
    photos,
    photoUrls,
    photoIssueIndices,
    imeiStatus,
    imeiBlacklistStatus,
    imeiAssuranceLevel,
    imeiDeviceInfo,
    imeiDeviceSource,
    imeiEvidenceCount,
    imeiMatchState,
    result,
    savedRequest,
    basePrice,
    isUploading,
    isCheckingPhotos,
    isCheckingImei,
    isEvaluating,
    isSubmitting,
    error,
    paymentState,
    paymentReference,
    paymentAmount,
    selectedTier,
    setSelectedTier,
    onCallbackPaid,
    updateForm,
    updatePhotos,
    goToImei,
    goToPhotos,
    goToPhotosQuick,
    continueFromPhotos,
    doCheckImei,
    skipImei,
    goToPayment,
    initiatePayment,
    retryPayment,
    runEvaluation,
    acceptOffer,
    refuse,
    reset,
    setBasePrice,
  };
};

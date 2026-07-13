import React, { useEffect, useState } from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import { ArrowLeft, Gamepad2, Laptop, Loader2, Package, RefreshCw, Smartphone, Sparkles, Tablet } from 'lucide-react';
import { useTradeIn } from '../hooks/useTradeIn';
import { useTrocVisionHealth } from '../hooks/useTrocVisionHealth';
import { TrocStepper } from '../components/troc/TrocStepper';
import { TrocQuickForm } from '../components/troc/TrocQuickForm';
import { ImeiCertifFlow } from '../components/certif/ImeiCertifFlow';
import { PhotoUploader } from '../components/troc/PhotoUploader';
import { ImeiChecker } from '../components/troc/ImeiChecker';
import { TierSelector } from '../components/troc/TierSelector';
import { TrocPayment } from '../components/troc/TrocPayment';
import { EvaluationResult } from '../components/troc/EvaluationResult';
import { TrocVoucher } from '../components/troc/TrocVoucher';
import { generateTradeInVoucherHTML } from '../utils/tradeInVoucherGenerator';
import { getPaymentStatus } from '../services/trocEvaluationService';
import type { TradeInRequest } from '../types';
import {
  formatTrocFee,
  TROC_TIER_PRICES,
  TROC_TIER_SELECTOR_ENABLED,
  TROC_TUNNEL_TIER,
} from '../utils/trocPricing';

// QuickForm : l'IMEI est intégré au 1er écran, pas d'étape IMEI séparée.
const STEP_LABELS_QUICK = ['Appareil', 'Photos', 'Paiement', 'Résultat', 'Bon'];

const STEP_INDEX_QUICK: Record<string, number> = {
  form: 0, photos: 1, imei: 1, payment: 2, evaluating: 3, result: 3, voucher: 4,
};

type DeviceTradeOption = {
  id: 'phone' | 'tablet' | 'laptop' | 'console' | 'other';
  label: string;
  subtitle: string;
  badge: string;
  available: boolean;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEVICE_OPTIONS: DeviceTradeOption[] = [
  {
    id: 'phone',
    label: 'Téléphone',
    subtitle: 'Estimation IA active maintenant',
    badge: 'Ouvert',
    available: true,
    icon: Smartphone,
  },
  {
    id: 'tablet',
    label: 'Tablette',
    subtitle: 'Flow dédié en préparation',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On prépare une vraie cote tablette. Pas du faux automatique bricolé.",
    icon: Tablet,
  },
  {
    id: 'laptop',
    label: 'PC portable / MacBook',
    subtitle: 'Argus en cours de calibrage',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les laptops arrivent quand le moteur sera propre : RAM, SSD, batterie, écran, pas juste du blabla.",
    icon: Laptop,
  },
  {
    id: 'console',
    label: 'Console',
    subtitle: 'PlayStation, Xbox, Switch et dérivés',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les consoles auront leur propre logique de reprise. On ne va pas les faire passer dans un moteur téléphone.",
    icon: Gamepad2,
  },
  {
    id: 'other',
    label: 'Montre, écouteurs, accessoires',
    subtitle: 'Autres appareils tech hors catégories principales',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On ouvrira les autres catégories quand la reprise sera sérieuse, pas à la loterie.",
    icon: Package,
  },
];

const DeviceChoiceCard: React.FC<{
  option: DeviceTradeOption;
  onSelect: (id: DeviceTradeOption['id']) => void;
}> = ({ option, onSelect }) => {
  const Icon = option.icon;

  if (option.available) {
    return (
      <button
        type="button"
        onClick={() => onSelect(option.id)}
        className="group relative text-left bg-black/60 border border-white/10 hover:border-xeption-gold/40 transition-all duration-300 p-5 rounded-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="w-12 h-12 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] mb-4">
              <Icon className="w-5 h-5 text-xeption-gold" />
            </div>
            <p className="text-white font-tech font-bold uppercase tracking-wider text-base">{option.label}</p>
            <p className="text-[11px] text-gray-400 font-sans mt-2 leading-relaxed">{option.subtitle}</p>
          </div>
          <span className="shrink-0 text-[10px] font-tech uppercase tracking-widest px-2 py-1 border border-xeption-gold/30 bg-xeption-gold/10 text-xeption-gold">
            {option.badge}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="group relative bg-black/35 border border-white/10 p-5 rounded-sm opacity-65 cursor-not-allowed overflow-visible"
      aria-disabled="true"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-gray-300 font-tech font-bold uppercase tracking-wider text-base">{option.label}</p>
          <p className="text-[11px] text-gray-500 font-sans mt-2 leading-relaxed">{option.subtitle}</p>
        </div>
        <span className="shrink-0 text-[10px] font-tech uppercase tracking-widest px-2 py-1 border border-white/10 bg-white/5 text-gray-400">
          {option.badge}
        </span>
      </div>

      <div className="pointer-events-none absolute left-5 right-5 top-full mt-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="bg-black/95 border border-xeption-gold/20 shadow-2xl px-4 py-3 text-[11px] text-gray-200 leading-relaxed">
          <span className="block text-xeption-gold font-tech uppercase tracking-widest text-[10px] mb-1">Cool bientôt</span>
          {option.tooltip}
        </div>
      </div>
    </div>
  );
};

const TrocPage: React.FC = () => {
  const troc = useTradeIn();
  const visionHealth = useTrocVisionHealth(troc.step === 'photos');
  const [intent, setIntent] = useState<'troc' | 'certif' | null>(null);
  const [selectedDeviceType, setSelectedDeviceType] = useState<'phone' | null>(null);

  // ── Retour callback CamPay : vérification serveur ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setSelectedDeviceType('phone');
    if (!ref || troc.step !== 'form') return; // uniquement si on revient depuis CamPay

    // Nettoyer l'URL sans recharger la page
    window.history.replaceState({}, '', window.location.pathname);

    const sessionKey = sessionStorage.getItem('troc_session_key') ?? '';
    if (!sessionKey) return;

    getPaymentStatus(sessionKey, ref).then((status) => {
      if (status?.status === 'paid') {
        troc.onCallbackPaid(ref);
      }
    }).catch(() => {/* silencieux — l'utilisateur peut recommencer */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (troc.step !== 'form' || troc.paymentState !== 'idle' || troc.photos.length > 0 || troc.result) {
      setSelectedDeviceType('phone');
    }
  }, [troc.paymentState, troc.photos.length, troc.result, troc.step]);

  const stepLabels = STEP_LABELS_QUICK;
  const stepIndex  = STEP_INDEX_QUICK[troc.step] ?? 0;
  // IMEI propre + modèle confirmé OU non identifiable (confirmé en boutique) → on laisse passer
  const canAutoEvaluate = troc.imeiStatus === 'valid' &&
    (troc.imeiMatchState === 'match' || troc.imeiMatchState === 'not_verified');
  const voucherRequest: TradeInRequest | null =
    troc.result && troc.savedRequest
      ? {
          id:               troc.savedRequest.id,
          created_at:       new Date().toISOString(),
          customer_name:    troc.form.customerName,
          customer_phone:   troc.form.customerPhone,
          device_brand:     troc.form.deviceBrand,
          device_model:     troc.form.deviceModel,
          photo_urls:       troc.photoUrls,
          imei_status:      troc.imeiStatus,
          imei_blacklist_status: troc.imeiBlacklistStatus,
          imei_assurance_level: troc.imeiAssuranceLevel,
          ai_score:         troc.result.score,
          ai_score_color:   troc.result.scoreColor,
          ai_justification: troc.result.justification,
          trade_in_value:   troc.result.tradeInValue,
          trade_in_grade:   troc.result.tradeInGrade,
          status:           'accepted',
          voucher_reference: troc.savedRequest.voucher_reference,
        }
      : null;

  const printVoucher = () => {
    if (!voucherRequest) return;
    const html = generateTradeInVoucherHTML(voucherRequest);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 450);
  };

  return (
    <div className="min-h-screen">
      <PageSEO
        title="Smart Troc — Reprise d'Appareils Cameroun | Xeption"
        description="Choisissez le type d'appareil à faire reprendre. Reprise smartphone disponible maintenant, autres catégories en préparation dans l'univers Smart Troc de Xeption."
        path="/troc"
      />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Smart Troc' },
      ])} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <RefreshCw className="w-5 h-5 text-xeption-gold" />
          </div>
          <div>
            <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Smart Troc</h1>
            <p className="text-[10px] font-tech uppercase tracking-widest text-white/70">Reprise cadrée, estimation propre</p>
          </div>
        </div>

        {/* ── Sélection d'intention ──────────────────────────────────────── */}
        {intent === null && (
          <div className="space-y-6">
            <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl font-tech font-bold uppercase text-white tracking-wider mb-3">
                Tu veux faire <span className="text-xeption-gold">quoi</span> ?
              </h2>
              <p className="text-sm text-white/80 font-sans leading-relaxed max-w-xl">
                Vends ton téléphone en confiance, ou prouve à un acheteur qu'il est clean. Deux services rapides, deux tunnels distincts — choisis ton besoin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Troquer */}
              <button type="button" onClick={() => setIntent('troc')}
                className="group relative text-left bg-black/60 border border-white/10 hover:border-xeption-gold/40 transition-all duration-300 p-6 sm:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] mb-5">
                    <RefreshCw className="w-5 h-5 text-xeption-gold" />
                  </div>
                  <p className="text-white font-tech font-bold uppercase tracking-wider text-base mb-2">Troquer mon appareil</p>
                  <p className="text-sm text-white/80 font-sans mb-4">Estimation IA du prix de reprise. Paiement cash ou bon d'achat.</p>
                  <p className="text-[11px] font-tech uppercase tracking-widest text-gray-400">Frais de service · <span className="text-xeption-gold font-bold text-base">150 F</span></p>
                </div>
              </button>

              {/* Vérifier */}
              <button type="button" onClick={() => setIntent('certif')}
                className="group relative text-left bg-black/60 border border-white/10 hover:border-xeption-gold/40 transition-all duration-300 p-6 sm:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] mb-5">
                    <Smartphone className="w-5 h-5 text-xeption-gold" />
                  </div>
                  <p className="text-white font-tech font-bold uppercase tracking-wider text-base mb-2">Certifier mon appareil</p>
                  <p className="text-sm text-white/80 font-sans mb-4">Vérification IMEI + certificat officiel. Rassure ton acheteur en moins d'une minute.</p>
                  <p className="text-[11px] font-tech uppercase tracking-widest text-gray-400">Frais de service · <span className="text-xeption-gold font-bold text-base">300 F</span></p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Flow Xeption Certif ────────────────────────────────────────── */}
        {intent === 'certif' && (
          <div className="max-w-3xl mx-auto w-full">
            <div className="mb-4 flex justify-start">
              <button type="button" onClick={() => setIntent(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            </div>
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
              <ImeiCertifFlow />
            </div>
          </div>
        )}

        {/* ── Flow Smart Troc ───────────────────────────────────────────── */}
        {intent === 'troc' && !selectedDeviceType && (
          <div className="space-y-8">
            <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-2 text-xeption-gold text-[10px] font-tech uppercase tracking-widest mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Choix du device
              </div>
              <h2 className="text-2xl font-tech font-bold uppercase text-white tracking-wider mb-3">
                Tu veux troquer <span className="text-xeption-gold">quoi</span> ?
              </h2>
              <p className="text-sm text-gray-300 font-sans leading-relaxed max-w-xl">
                On ne balance pas des estimations au hasard. Chez Xeption, chaque catégorie ouvre quand
                son moteur est vraiment prêt. Là, le Smart Troc tourne déjà sur les téléphones.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch">
              {DEVICE_OPTIONS.map((option) => (
                <DeviceChoiceCard key={option.id} option={option}
                  onSelect={(id) => { if (id === 'phone') setSelectedDeviceType('phone'); }} />
              ))}
            </div>
            <div className="mb-4 flex justify-start">
              <button type="button" onClick={() => setIntent(null)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            </div>
          </div>
        )}

        {intent === 'troc' && selectedDeviceType === 'phone' && (
          <div className="max-w-3xl mx-auto w-full">
        {troc.step === 'form' && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedDeviceType(null)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/10 hover:border-xeption-gold/30 text-gray-300 hover:text-white transition-all text-[10px] font-tech uppercase tracking-widest"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Changer d'appareil
            </button>
          </div>
        )}

        {/* Stepper */}
        {troc.step !== 'voucher' && (
          <div className="bg-black/40 border border-white/10 px-3 mb-4 backdrop-blur-md">
            <TrocStepper
              currentStep={stepIndex}
              totalSteps={stepLabels.length}
              labels={stepLabels}
            />
          </div>
        )}

        {/* Error banner */}
        {troc.error && (
          <div className="mb-4 px-4 py-3 bg-xeption-red/10 border border-xeption-red/30 text-white text-sm font-sans rounded-sm">
            {troc.error}
          </div>
        )}

        {/* Main card */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">

          {troc.step === 'form' && (
            <TrocQuickForm
              form={troc.form}
              onChange={troc.updateForm}
              onNext={troc.goToPhotosQuick}
              imeiStatus={troc.imeiStatus}
              imeiBlacklistStatus={troc.imeiBlacklistStatus}
              imeiDeviceInfo={troc.imeiDeviceInfo}
              isCheckingImei={troc.isCheckingImei}
              onCheckImei={troc.doCheckImei}
            />
          )}

          {troc.step === 'imei' && (
            <div>
              <ImeiChecker
                imei={troc.form.imei}
                onChange={imei => troc.updateForm({ imei })}
                imeiStatus={troc.imeiStatus}
                blacklistStatus={troc.imeiBlacklistStatus}
                imeiMatchState={troc.imeiMatchState}
                imeiDeviceInfo={troc.imeiDeviceInfo}
                imeiDeviceSource={troc.imeiDeviceSource}
                imeiEvidenceCount={troc.imeiEvidenceCount}
                expectedBrand={troc.form.deviceBrand}
                expectedModel={troc.form.deviceModel}
                onCheck={troc.doCheckImei}
                isChecking={troc.isCheckingImei}
                onSkip={troc.skipImei}
              />
              {troc.imeiBlacklistStatus !== 'blacklisted' && (
                <div className="px-6 pb-6">
                  {!canAutoEvaluate && (
                    <p className="mb-3 text-xs text-yellow-300 font-sans">
                      La vérification IMEI est requise avant de continuer.
                    </p>
                  )}
                  <button
                    onClick={troc.goToPhotos}
                    disabled={!canAutoEvaluate}
                    className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continuer — Ajouter mes photos
                  </button>
                </div>
              )}
            </div>
          )}

          {troc.step === 'photos' && (
            <PhotoUploader
              photos={troc.photos}
              onPhotosChange={troc.updatePhotos}
              onNext={troc.continueFromPhotos}
              isUploading={troc.isUploading}
              isCheckingPhotos={troc.isCheckingPhotos}
              issueIndices={troc.photoIssueIndices}
              visionReady={visionHealth.report?.ready ?? true}
              visionLoading={visionHealth.loading}
              visionSetupHint={visionHealth.setupHint}
            />
          )}

          {troc.step === 'payment' && (
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-white font-tech font-bold uppercase tracking-wider text-sm mb-1">Frais d&apos;estimation</h2>
                <p className="text-neutral-500 text-xs font-sans">Paiement requis pour accéder au résultat</p>
              </div>
              {TROC_TIER_SELECTOR_ENABLED &&
                (troc.paymentState === 'idle' ||
                  troc.paymentState === 'initiating' ||
                  troc.paymentState === 'failed' ||
                  troc.paymentState === 'expired' ||
                  troc.paymentState === 'timeout') && (
                  <TierSelector
                    value={troc.selectedTier}
                    onChange={troc.setSelectedTier}
                    disabled={troc.paymentState === 'initiating'}
                  />
                )}
              <TrocPayment
                selectedTier={TROC_TUNNEL_TIER}
                paymentAmount={troc.paymentAmount}
                initialPhone={troc.form.customerPhone}
                paymentState={troc.paymentState}
                error={troc.error}
                onInitiate={troc.initiatePayment}
                onRetry={troc.retryPayment}
              />
            </div>
          )}

          {troc.step === 'evaluating' && (
            <div className="flex flex-col items-center justify-center p-16 gap-5">
              <div className="w-16 h-16 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                <Loader2 className="w-7 h-7 text-xeption-gold animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-tech font-bold uppercase tracking-wider text-white">Évaluation en cours</p>
                <p className="text-xs text-gray-500 mt-1 font-sans">Contrôle IA des photos puis estimation</p>
              </div>
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-xeption-gold rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {troc.step === 'result' && troc.result && (
            <EvaluationResult
              result={troc.result}
              deviceLabel={`${troc.form.deviceBrand} ${troc.form.deviceModel}`}
              deviceBrand={troc.form.deviceBrand}
              deviceModel={troc.form.deviceModel}
              serviceTier={TROC_TUNNEL_TIER}
              imeiAssuranceLevel={troc.imeiAssuranceLevel}
              onAcceptOffer={troc.acceptOffer}
              onRefuse={troc.refuse}
              isSubmitting={troc.isSubmitting}
            />
          )}

          {troc.step === 'voucher' && voucherRequest && (
            <TrocVoucher
              request={voucherRequest}
              onPrint={printVoucher}
              onNewEvaluation={troc.reset}
            />
          )}
        </div>

        {/* "Comment ça marche" — uniquement sur le formulaire */}
        {troc.step === 'form' && (
          <div className="mt-10">
            <p className="text-[10px] font-tech uppercase tracking-widest text-gray-200 mb-4 text-center">Comment ça marche</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { num: '01', text: 'Décris ton appareil et vérifie ton IMEI' },
                { num: '02', text: 'Contrôle IMEI puis photos nettes de l’appareil' },
                { num: '03', text: `Frais ${formatTrocFee(TROC_TIER_PRICES.express, { short: true })} puis rapport d'expertise` },
                { num: '04', text: 'Valide ton offre et récupère ton bon en boutique' },
              ].map(({ num, text }) => (
                <div key={num} className="bg-black/40 border border-white/10 p-4 hover:border-xeption-gold/20 transition-all">
                  <span className="text-lg font-tech font-bold text-xeption-gold/60 block mb-2">{num}</span>
                  <p className="text-gray-200 text-[11px] font-sans leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrocPage;

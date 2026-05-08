import React, { useEffect } from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useTradeIn } from '../hooks/useTradeIn';
import { TrocStepper } from '../components/troc/TrocStepper';
import { SmartTrocForm } from '../components/troc/SmartTrocForm';
import { PhotoUploader } from '../components/troc/PhotoUploader';
import { ImeiChecker } from '../components/troc/ImeiChecker';
import { TrocPayment } from '../components/troc/TrocPayment';
import { EvaluationResult } from '../components/troc/EvaluationResult';
import { TrocVoucher } from '../components/troc/TrocVoucher';
import { generateTradeInVoucherHTML } from '../utils/tradeInVoucherGenerator';
import { getPaymentStatus } from '../services/trocEvaluationService';
import type { TradeInRequest } from '../types';

const STEP_LABELS = ['Appareil', 'Photos', 'IMEI', 'Paiement', 'Résultat', 'Bon'];

const STEP_INDEX: Record<string, number> = {
  form: 0, photos: 1, imei: 2, payment: 3, evaluating: 4, result: 4, voucher: 5,
};

const TrocPage: React.FC = () => {
  const troc = useTradeIn();

  // ── Retour callback CamPay : vérification serveur ──────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
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
  const stepIndex = STEP_INDEX[troc.step] ?? 0;
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
        title="Smart Troc — Reprise Smartphone Cameroun | Xeption"
        description="Échangez votre ancien smartphone contre de l'argent ou un crédit boutique. Estimation IA en 2 minutes, validation en boutique à Yaoundé. iPhone, Samsung, Tecno acceptés."
        path="/troc"
      />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Smart Troc' },
      ])} />

      <div className="relative max-w-lg mx-auto px-4 pt-8 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <RefreshCw className="w-5 h-5 text-xeption-gold" />
          </div>
          <div>
            <h1 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Smart Troc</h1>
            <p className="text-[10px] font-tech uppercase tracking-widest text-white/70">Estimation instantanée par IA</p>
          </div>
        </div>

        {/* Stepper */}
        {troc.step !== 'voucher' && (
          <div className="bg-black/40 border border-white/10 px-3 mb-4 backdrop-blur-md">
            <TrocStepper
              currentStep={stepIndex}
              totalSteps={STEP_LABELS.length}
              labels={STEP_LABELS}
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
          <SmartTrocForm
            form={troc.form}
            onChange={troc.updateForm}
            onNext={troc.goToPhotos}
            setBasePrice={troc.setBasePrice}
          />
          )}

          {troc.step === 'photos' && (
            <PhotoUploader
              photos={troc.photos}
              onPhotosChange={troc.updatePhotos}
              onNext={troc.goToImei}
              isUploading={troc.isUploading}
              issueIndices={troc.photoIssueIndices}
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
                    onClick={troc.goToPayment}
                    disabled={!canAutoEvaluate}
                    className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continuer — Payer 150 XAF
                  </button>
                </div>
              )}
            </div>
          )}

          {troc.step === 'payment' && (
            <div className="p-6">
              <h2 className="text-white font-tech font-bold uppercase tracking-wider text-sm mb-1">Frais d'estimation</h2>
              <p className="text-neutral-500 text-xs font-sans mb-5">Paiement requis pour accéder au résultat</p>
              <TrocPayment
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
                <p className="text-xs text-gray-500 mt-1 font-sans">Gemini analyse les photos de votre appareil</p>
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { num: '01', text: 'Décris ton appareil et ajoute des photos' },
                { num: '02', text: "L'IA Gemini analyse l'état et calcule une offre" },
                { num: '03', text: 'Valide le montant de reprise et récupère ton bon' },
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
    </div>
  );
};

export default TrocPage;

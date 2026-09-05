import React from 'react';
import { MessageCircle, Calendar, Shield, Clock, Sparkles } from 'lucide-react';
import { ChameleoMascot } from './ChameleoMascot';
import type { TrocTier } from '../../utils/trocPricing';
import { TROC_TIER_LABELS } from '../../utils/trocPricing';
import { buildWhatsAppUrl, buildTradeInAppointmentMessage } from '../../utils/whatsappShare';
import type { TradeInRequest } from '../../types';
import type { TrocEvaluationResult } from '../../types';
import { DevicePrepGuideModal } from './DevicePrepGuideModal';
import { MarketTrendBadge, shouldShowMarketTrend } from './MarketTrendBadge';
import {
  resolveEvaluationMessage,
  ALL_EVALUATION_MESSAGES as MESSAGES,
  type EvaluationMessage,
} from '../../utils/evaluationMessages';
import type { BlockerReason, Product, TrocDeviceForm } from '../../types';
import DeviceModelRadarChart from './DeviceModelRadarChart';
import TrocUpgradeChoice from './TrocUpgradeChoice';
import {
  buildModelRadarProfile,
  buildUnitConditionRadar,
} from '../../utils/trocModelRadarProfile';

interface EvaluationResultProps {
  result: TrocEvaluationResult;
  deviceLabel: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceForm?: TrocDeviceForm | null;
  serviceTier?: TrocTier;
  imeiAssuranceLevel?: 'basic' | 'premium';
  /** Accepte l'offre. `target` fourni = troc vers cet appareil (Smart Troc) ; absent = bon générique. */
  onAcceptOffer: (target?: Product) => void;
  onRefuse: () => void;
  isSubmitting: boolean;
}

const formatFCFA = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' FCFA';

const SCORE_RING: Record<string, string> = {
  green:  'border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)] text-green-400',
  orange: 'border-orange-400 shadow-[0_0_30px_rgba(251,146,60,0.3)] text-orange-400',
  red:    'border-xeption-red shadow-[0_0_30px_rgba(255,0,51,0.3)] text-xeption-red',
};

// Refus → message dédié selon la raison technique. Fallback sur fraud_suspected
// pour les cas historiques où aucun blockerReason n'a été renseigné côté serveur.
const resolveRefusalMessage = (blockerReason?: BlockerReason | null): EvaluationMessage => {
  switch (blockerReason) {
    case 'powers_off':    return MESSAGES.refused_powers_off;
    case 'water_damage':  return MESSAGES.refused_water_damage;
    case 'too_old':       return MESSAGES.refused_too_old;
    case 'no_base_price': return MESSAGES.refused_no_base_price;
    default:              return MESSAGES.fraud_suspected;
  }
};

const appointmentDraft = (
  deviceBrand: string,
  deviceModel: string,
  tradeInValue: number,
): TradeInRequest => ({
  id: 'draft',
  created_at: new Date().toISOString(),
  customer_name: '',
  customer_phone: '',
  device_brand: deviceBrand,
  device_model: deviceModel,
  photo_urls: [],
  imei_status: 'not_checked',
  imei_blacklist_status: 'unknown',
  imei_assurance_level: 'basic',
  trade_in_value: tradeInValue,
  status: 'pending',
});

export const EvaluationResult: React.FC<EvaluationResultProps> = ({
  result,
  deviceLabel,
  deviceBrand = '',
  deviceModel = '',
  deviceForm = null,
  serviceTier,
  imeiAssuranceLevel = 'basic',
  onAcceptOffer,
  onRefuse,
  isSubmitting,
}) => {
  const { score, scoreColor, justification, tradeInValue, tradeInGrade, blockerReason, marketTrend } =
    result;
  const isRefused    = tradeInGrade === 'refuse';
  const isSpareParts = tradeInGrade === 'pieces';
  const [showGuide, setShowGuide] = React.useState(false);
  const [showUpgrade, setShowUpgrade] = React.useState(false);

  // Refus → message contextualisé selon blockerReason.
  // Sinon → match avec affinage par palier de score (7 niveaux).
  const msg = isRefused
    ? resolveRefusalMessage(blockerReason ?? null)
    : resolveEvaluationMessage({
        decision: 'match',
        score,
        fraudDetected: false,
        imeiValidity: 'valid',
      });

  const ringClass  = SCORE_RING[scoreColor] ?? SCORE_RING.red;
  const ringColor  = ringClass.split(' ')[2]; // ex: text-green-400
  // Refus DOUX (severity 'info' : modèle trop ancien / hors-tarif) → rendu neutre or,
  // pas le rouge "Troc impossible". Le score 0/100 n'a pas de sens (l'appareil peut être nickel).
  const isSoftRefusal = isRefused && msg.severity === 'info';

  // Libellé du bouton adapté au palier
  const ctaLabel = isRefused
    ? null
    : (msg.cta ?? `Obtenir ${formatFCFA(tradeInValue)} de remise immédiate`);

  const premiumImeiCheck =
    imeiAssuranceLevel === 'premium' || serviceTier === 'safety';

  const modelRadar = React.useMemo(() => {
    if (!deviceBrand.trim() && !deviceModel.trim()) return null;
    return buildModelRadarProfile(deviceBrand, deviceModel, {
      storage: deviceForm?.deviceStorage,
      ram: deviceForm?.deviceRam,
    });
  }, [deviceBrand, deviceModel, deviceForm?.deviceStorage, deviceForm?.deviceRam]);

  const unitRadar = React.useMemo(() => {
    if (!deviceForm || isRefused) return null;
    return buildUnitConditionRadar(deviceForm);
  }, [deviceForm, isRefused]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Résultat</h2>
        <p className="text-xs text-white/60 mt-1 font-sans">{deviceLabel}</p>
        {(serviceTier || premiumImeiCheck) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {serviceTier && (
              <span className="text-[10px] font-tech uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-white/70">
                Formule {TROC_TIER_LABELS[serviceTier]}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-tech uppercase tracking-wider px-2 py-0.5 rounded border ${
                premiumImeiCheck
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-white/15 text-white/60'
              }`}
            >
              {premiumImeiCheck && <Shield className="w-3 h-3" />}
              {premiumImeiCheck
                ? 'IMEI vérifié blacklist mondiale'
                : 'Vérification IMEI standard'}
            </span>
          </div>
        )}
      </div>

      {/* Score + Mascotte Xepti Célébration + radar modèle (style Versus) */}
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 sm:gap-10 py-4 bg-white/[0.08] border border-white/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold/30 to-transparent" />

        {/* Mascotte Xepti animée */}
        <div className="shrink-0 flex items-center justify-center">
          <ChameleoMascot 
            size="sm"
            state={isRefused ? 'warning' : 'happy'}
            message={isRefused ? "Diagnostic terminé. Regarde les détails ci-dessous." : `Offre calculée ! ${score}/100 ✨`}
          />
        </div>

        {/* Jauge Score Arcade */}
        <div className="flex flex-col items-center">
          {isSoftRefusal ? (
            <div className="w-28 h-28 rounded-full border-4 border-xeption-gold/40 flex items-center justify-center">
              <Clock className="w-10 h-10 text-xeption-gold/80" />
            </div>
          ) : (
            <div className={`w-28 h-28 border-4 flex flex-col items-center justify-center ${ringClass}`}>
              <span className="text-4xl font-tech font-bold leading-none">{score}</span>
              <span className="text-[10px] font-tech text-white/60 uppercase tracking-widest mt-1">/100</span>
            </div>
          )}
          <span className={`text-xs font-tech font-bold uppercase tracking-widest mt-3 ${isSoftRefusal ? 'text-xeption-gold' : ringColor}`}>
            {isRefused && !isSoftRefusal ? 'Refusé' : 'État de votre appareil'}
          </span>
          {!isRefused && (
            <p className="text-[10px] text-white/60 font-sans text-center mt-1 max-w-[140px]">
              {msg.title}
            </p>
          )}
        </div>

        {modelRadar && !isSoftRefusal ? (
          <DeviceModelRadarChart
            modelLabel={modelRadar.modelLabel}
            modelAxes={modelRadar.axes}
            unitAxes={unitRadar}
            source={modelRadar.source}
          />
        ) : null}
      </div>

      {!isRefused && (
        <p className="text-[11px] text-white/70 font-sans text-center -mt-1 max-w-md mx-auto leading-relaxed">
          {msg.body}
        </p>
      )}

      {/* Justification IA */}
      <div className="bg-white/5 border border-white/15 rounded-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-white/20 bg-white/5">
          <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold">Rapport d&apos;expertise XEPTION</p>
        </div>
        <p className="px-4 py-3 text-sm text-white font-sans leading-relaxed">{justification}</p>
      </div>

      {/* Notice pièces */}
      {isSpareParts && !isRefused && (
        <div className="bg-orange-500/10 border border-orange-500/30 px-4 py-3 rounded-sm">
          <p className="text-xs text-orange-400 font-sans">
            Reprise pour pièces — décote importante appliquée en raison de l'état de l'appareil.
          </p>
        </div>
      )}

      {/* Refus — dur (rouge) vs doux (or, info : trop ancien / hors-tarif) */}
      {isRefused && (
        <div
          className={`px-4 py-4 rounded-sm flex flex-col gap-3 border ${
            isSoftRefusal
              ? 'bg-xeption-gold/10 border-xeption-gold/30'
              : 'bg-xeption-red/10 border-xeption-red/30'
          }`}
        >
          {!isSoftRefusal && (
            <p className="text-sm font-tech font-bold text-xeption-red uppercase">Troc impossible</p>
          )}
          <p className="text-xs text-white/70 font-sans">{msg.body}</p>
          <a
            href="https://wa.me/237641891031"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600/20 border border-green-600/40 hover:bg-green-600/40 text-green-400 font-tech font-bold uppercase tracking-widest text-xs py-3 transition-all rounded-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Contacter la boutique via WhatsApp
          </a>
        </div>
      )}

      {/* Offer buttons */}
      {!isRefused && (
        <div className="flex flex-col gap-3">
          {shouldShowMarketTrend(marketTrend) && <MarketTrendBadge trend={marketTrend} />}
          <button
            onClick={() => onAcceptOffer()}
            disabled={isSubmitting}
            className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {ctaLabel}
          </button>

          {/* Upgrade : appliquer le crédit sur un appareil (comparateur ≤5). */}
          {!showUpgrade ? (
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="w-full border border-xeption-gold/40 text-xeption-gold hover:bg-xeption-gold/10 font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all rounded-sm"
            >
              Utiliser mon crédit sur un appareil →
            </button>
          ) : (
            <div className="rounded-lg border border-white/20 bg-black/20 p-3">
              {/* Le choix d'un appareil lie cible + voucher + appareil de départ + client sur un seul dossier. */}
              <TrocUpgradeChoice
                credit={tradeInValue ?? result.tradeInValue}
                deviceBrand={deviceBrand}
                onSelect={(product) => onAcceptOffer(product)}
              />
            </div>
          )}

          <p className="text-xs text-white/70 font-sans text-center">
            Estimation unique de reprise pour votre troc en boutique.
          </p>

          <a
            href={buildWhatsAppUrl(
              buildTradeInAppointmentMessage(
                appointmentDraft(deviceBrand, deviceModel, tradeInValue ?? result.tradeInValue),
              ),
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600/20 border border-green-600/40 hover:bg-green-600/40 text-green-400 font-tech font-bold uppercase tracking-widest text-xs py-3 transition-all rounded-sm"
          >
            <Calendar className="w-4 h-4" />
            Prendre rendez-vous en boutique
          </a>

          <button
            onClick={() => setShowGuide(true)}
            className="text-[10px] text-xeption-gold/80 hover:text-xeption-gold font-sans underline decoration-xeption-gold/30 underline-offset-4 mb-2"
          >
            Comment préparer votre appareil avant le dépôt ?
          </button>

          <button
            onClick={onRefuse}
            disabled={isSubmitting}
            className="w-full text-white/50 hover:text-white/70 font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Refuser l'offre
          </button>
        </div>
      )}

      <DevicePrepGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};


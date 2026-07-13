import React from 'react';
import { MessageCircle, Calendar, Shield, Clock } from 'lucide-react';
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
import type { BlockerReason } from '../../types';

interface EvaluationResultProps {
  result: TrocEvaluationResult;
  deviceLabel: string;
  deviceBrand?: string;
  deviceModel?: string;
  serviceTier?: TrocTier;
  imeiAssuranceLevel?: 'basic' | 'premium';
  onAcceptOffer: () => void;
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

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Résultat</h2>
        <p className="text-xs text-gray-500 mt-1 font-sans">{deviceLabel}</p>
        {(serviceTier || premiumImeiCheck) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {serviceTier && (
              <span className="text-[10px] font-tech uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-gray-400">
                Formule {TROC_TIER_LABELS[serviceTier]}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-tech uppercase tracking-wider px-2 py-0.5 rounded border ${
                premiumImeiCheck
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-white/15 text-gray-500'
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

      {/* Score ring — masqué pour les refus doux (le score n'a pas de sens) */}
      <div className="flex flex-col items-center py-4">
        {isSoftRefusal ? (
          <div className="w-28 h-28 rounded-full border-4 border-xeption-gold/40 flex items-center justify-center">
            <Clock className="w-10 h-10 text-xeption-gold/80" />
          </div>
        ) : (
          <div className={`w-28 h-28 border-4 flex flex-col items-center justify-center ${ringClass}`}>
            <span className="text-4xl font-tech font-bold leading-none">{score}</span>
            <span className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mt-1">/100</span>
          </div>
        )}
        {/* Titre du message — remplace l'ancien EXCELLENT / MOYEN / MAUVAIS */}
        <span className={`text-xs font-tech font-bold uppercase tracking-widest mt-3 ${isSoftRefusal ? 'text-xeption-gold' : ringColor}`}>
          {isRefused && !isSoftRefusal ? 'Refusé' : msg.title}
        </span>
        {/* Corps du message — nuance contextuelle sous le ring (cas normal, non refusé) */}
        {!isRefused && (
          <p className="text-[11px] text-gray-400 font-sans text-center mt-2 max-w-[260px] leading-relaxed">
            {msg.body}
          </p>
        )}
      </div>

      {/* Justification IA */}
      <div className="bg-white/5 border border-white/15 rounded-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
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
          <p className="text-xs text-gray-400 font-sans">{msg.body}</p>
          <a
            href="https://wa.me/237697686684"
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
            onClick={onAcceptOffer}
            disabled={isSubmitting}
            className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {ctaLabel}
          </button>

          <p className="text-xs text-gray-400 font-sans text-center">
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
            className="w-full text-gray-600 hover:text-gray-400 font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Refuser l'offre
          </button>
        </div>
      )}

      <DevicePrepGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};


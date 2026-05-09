import React from 'react';
import { MessageCircle } from 'lucide-react';
import type { TrocEvaluationResult } from '../../types';
import { DevicePrepGuideModal } from './DevicePrepGuideModal';
import {
  resolveEvaluationMessage,
  ALL_EVALUATION_MESSAGES as MESSAGES,
  type EvaluationMessage,
} from '../../utils/evaluationMessages';
import type { BlockerReason } from '../../types';

interface EvaluationResultProps {
  result: TrocEvaluationResult;
  deviceLabel: string;
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
    case 'no_base_price': return MESSAGES.refused_no_base_price;
    default:              return MESSAGES.fraud_suspected;
  }
};

export const EvaluationResult: React.FC<EvaluationResultProps> = ({
  result, deviceLabel, onAcceptOffer, onRefuse, isSubmitting,
}) => {
  const { score, scoreColor, justification, tradeInValue, tradeInGrade, blockerReason } = result;
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

  // Libellé du bouton adapté au palier
  const ctaLabel = isRefused
    ? null
    : (msg.cta ?? `Obtenir ${formatFCFA(tradeInValue)} de remise immédiate`);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Résultat</h2>
        <p className="text-xs text-gray-500 mt-1 font-sans">{deviceLabel}</p>
      </div>

      {/* Score ring */}
      <div className="flex flex-col items-center py-4">
        <div className={`w-28 h-28 border-4 flex flex-col items-center justify-center ${ringClass}`}>
          <span className="text-4xl font-tech font-bold leading-none">{score}</span>
          <span className="text-[10px] font-tech text-gray-500 uppercase tracking-widest mt-1">/100</span>
        </div>
        {/* Titre du message — remplace l'ancien EXCELLENT / MOYEN / MAUVAIS */}
        <span className={`text-xs font-tech font-bold uppercase tracking-widest mt-3 ${ringColor}`}>
          {isRefused ? 'Refusé' : msg.title}
        </span>
        {/* Corps du message — nuance contextuelle sous le ring */}
        {!isRefused && (
          <p className="text-[11px] text-gray-400 font-sans text-center mt-2 max-w-[260px] leading-relaxed">
            {msg.body}
          </p>
        )}
      </div>

      {/* Justification IA */}
      <div className="bg-white/5 border border-white/15 rounded-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
          <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold">Analyse IA</p>
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

      {/* Refused */}
      {isRefused && (
        <div className="bg-xeption-red/10 border border-xeption-red/30 px-4 py-4 rounded-sm flex flex-col gap-3">
          <p className="text-sm font-tech font-bold text-xeption-red uppercase">Troc impossible</p>
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


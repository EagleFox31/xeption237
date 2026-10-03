import { supabase } from '../../supabaseClient';
import { computeOfferV2, PRICING_RULE_VERSION } from '../../../utils/trocPricing';
import { TROC_MESSAGES } from '../../../utils/trocMessages';
import type { TrocDeviceForm, TrocEvaluationMode, TrocEvaluationResult } from '../../../types';
import type { TradeInEngine } from '../shared/commonTypes';
import { PhotoRetakeRequiredError, resolveBasePrice } from '../../trocEvaluationService';

// La heuristique locale génère uniquement la justification textuelle.
// Le score d'état est maintenant produit par computeOfferV2 (arbre de décision).
const localHeuristicJustification = (
  form: TrocDeviceForm,
  conditionScore: number,
  photosCount: number,
): string => {
  return TROC_MESSAGES.heuristic(
    form.batteryHealth || 80,
    form.screenCondition || '',
    form.bodyCondition || '',
    photosCount,
    form.accessories?.length || 0,
  );
};

export const phoneEngine: TradeInEngine = {
  name: 'phoneEngine',
  version: PRICING_RULE_VERSION,
  evaluate: async (
    form: TrocDeviceForm,
    photoUrls: string[],
    basePrice: number
  ): Promise<TrocEvaluationResult> => {
    
    // Note: imeiBlacklistStatus is checked outside before calling the engine, or we can check it here if passed in.
    // In the old evaluateDevice, imeiBlacklistStatus was passed in.
    // For now, assume it's checked by the orchestrator.

    const aiEnabled =
      typeof import.meta !== 'undefined' &&
      (import.meta as any)?.env?.VITE_ENABLE_TROC_AI === 'true';

    // Étape 1 — Prix de base marché (argus → market-intel → catalogue hardcodé)
    const resolvedBasePrice = await resolveBasePrice(form, basePrice);

    // Étape 2 — Arbre de décision v2 : score d'état + offre monétaire
    const offer = computeOfferV2(form, resolvedBasePrice);

    // Étape 3 — Justification textuelle
    let justification = localHeuristicJustification(form, offer.conditionScore, photoUrls.length);
    let evaluationMode: TrocEvaluationMode = 'local_heuristic';
    const finalOffer = offer;

    if (aiEnabled && photoUrls.length > 0) {
      try {
        const { data, error } = await supabase.functions.invoke('evaluate-device', {
          body: {
            photoUrls,
            deviceInfo: {
              brand:           form.deviceBrand,
              model:           form.deviceModel,
              storage:         form.deviceStorage,
              ram:             form.deviceRam,
              batteryHealth:   form.batteryHealth,
              screenCondition: form.screenCondition,
              bodyCondition:   form.bodyCondition,
              accessories:     form.accessories,
            },
          },
        });
        if (error || !data) throw new Error(error?.message ?? 'evaluate-device failed');

        const photoIssues: Array<{ index: number; reason?: string }> = Array.isArray(data.photoIssues)
          ? data.photoIssues
          : [];
        if (data.analysisDecision === 'photos_to_retake' || photoIssues.length > 0) {
          const indices = photoIssues
            .map((p) => Number(p?.index))
            .filter((i) => Number.isFinite(i) && i >= 1);
          throw new PhotoRetakeRequiredError(indices);
        }

        const geminiScore = Number(data.score ?? 0);
        if (data.fraudDetected || geminiScore === 0) {
          throw new Error(`FRAUD_DETECTED:${data.justification || "Veuillez mettre des photos claires d'un vrai téléphone correspondant au modèle déclaré."}`);
        }

        justification = data.justification || justification;
        evaluationMode = 'vision_ai';
      } catch (err: any) {
        if (err instanceof PhotoRetakeRequiredError || (err.message && err.message.startsWith('FRAUD_DETECTED:'))) {
          throw err;
        }
        justification = TROC_MESSAGES.heuristic_ai_fallback(justification);
        evaluationMode = 'local_heuristic_fallback';
      }
    }

    return {
      score: finalOffer.conditionScore,
      scoreColor: finalOffer.scoreColor,
      justification,
      tradeInValue: finalOffer.tradeInValue,
      tradeInGrade: finalOffer.tradeInGrade,
      evaluationMode,
      pricingRuleVersion: PRICING_RULE_VERSION,
      blockerReason: finalOffer.blockerReason ?? null,
    };
  }
};

/**
 * Centralized business messages for Smart Troc.
 * Edit here to impact all display and persistence points.
 */

export const TROC_MESSAGES = {
  // Refusal
  imei_blacklisted:
    'Cet appareil ne peut pas être accepté en troc — il est signalé comme bloqué ou volé.',

  // Evaluation modes
  heuristic: (
    batteryHealth: number,
    screenCondition: string,
    bodyCondition: string,
    photosCount: number,
    accessoriesCount: number,
  ) => {
    const screen = (screenCondition || '').toLowerCase();
    const body = (bodyCondition || '').toLowerCase();

    const screenIsDamaged = screen.includes('casse') || screen.includes('fissure');
    const screenHasWear   = screen.includes('rayure') || screen.includes('moyen');
    const bodyIsDamaged   = body.includes('casse') || body.includes('fissure');
    const bodyHasWear     = body.includes('rayure') || body.includes('moyen');

    // Première phrase : état général écran + coque, formulé naturellement.
    let firstSentence: string;
    if (screenIsDamaged && bodyIsDamaged) {
      firstSentence = "L'écran et la coque présentent des dommages visibles qui pèsent sur l'estimation.";
    } else if (screenIsDamaged) {
      firstSentence = "L'écran est abîmé, mais la coque reste en bon état.";
    } else if (bodyIsDamaged) {
      firstSentence = "La coque est abîmée, mais l'écran reste en bon état.";
    } else if (screenHasWear && bodyHasWear) {
      firstSentence = "L'écran et la coque montrent des traces d'usure normales pour un appareil de seconde main.";
    } else if (screenHasWear) {
      firstSentence = "L'écran présente quelques traces d'usure, et la coque reste propre.";
    } else if (bodyHasWear) {
      firstSentence = "La coque montre quelques marques d'usage, et l'écran est en bon état.";
    } else {
      firstSentence = "L'écran et la coque sont en très bon état général.";
    }

    // Deuxième phrase : batterie, en termes accessibles.
    const batterySentence =
      batteryHealth >= 85
        ? 'La batterie tient encore très bien la charge.'
        : batteryHealth >= 70
          ? 'La batterie reste correcte pour un usage quotidien.'
          : 'La batterie commence à fatiguer et devra probablement être remplacée à terme.';

    // Troisième phrase : qualité du dossier (photos + accessoires) — ton rassurant.
    const dossierSentence =
      photosCount >= 4 && accessoriesCount > 0
        ? 'Les photos fournies sont suffisantes et les accessoires inclus valorisent votre offre.'
        : photosCount >= 4
          ? 'Les photos fournies permettent une bonne évaluation à distance.'
          : accessoriesCount > 0
            ? 'Quelques photos supplémentaires auraient affiné l’estimation, mais les accessoires inclus la soutiennent.'
            : 'L’estimation reste indicative — elle sera confirmée précisément lors du dépôt en boutique.';

    return [firstSentence, batterySentence, dossierSentence].join(' ');
  },

  heuristic_ai_fallback: (base: string) =>
    `${base} L'analyse photo détaillée est temporairement indisponible — l'estimation s'appuie pour l'instant sur vos déclarations et sera affinée en boutique.`,

  /** Après contrôle crédibilité IA (pré-paiement) — sans prétendre avoir analysé l'écran en détail. */
  credibilityVerified: (batteryHealth: number) => {
    const batterySentence =
      batteryHealth >= 85
        ? 'La batterie déclarée est bonne.'
        : batteryHealth >= 70
          ? 'La batterie déclarée reste correcte pour un usage courant.'
          : 'La batterie déclarée commence à fatiguer — cela sera confirmé en boutique.';

    return `Vos photos ont été validées par notre contrôle IA : un smartphone réel correspond à votre déclaration. ${batterySentence} L'estimation repose sur vos déclarations et sera confirmée lors du dépôt en boutique.`;
  },

  // IMEI
  imei_invalid_luhn:
    'Ce numéro IMEI semble incorrect. Vérifiez les 15 chiffres affichés en composant *#06# sur votre téléphone.',

  // Important UX/business nuance:
  // Unknown model from free source is an evidence gap, not a fraud signal by itself.
  imei_model_unknown_manual:
    'IMEI valide. Votre appareil sera identifié et confirmé lors de la remise en boutique.',
} as const;

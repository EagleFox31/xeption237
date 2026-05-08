/**
 * evaluationMessages.ts
 * Messages client pour chaque combinaison de résultat d'évaluation visuelle.
 * Source : réponse evaluate-device (decision, score, fraudDetected, confidence)
 *          + réponse check-imei (imeiValidity, reason)
 *          + blockerReason issu de checkBlockers (utils/trocPricing.ts)
 */

import type { BlockerReason } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EvaluationSeverity = 'success' | 'warning' | 'error' | 'info';

export type EvaluationMessage = {
  /** Titre court affiché en header de la carte résultat */
  title: string;
  /** Corps du message, 1-2 phrases naturelles, ton boutique pro */
  body: string;
  /** Appel à l'action principal — null si aucune action requise */
  cta: string | null;
  /** Couleur / icône guidant l'UI */
  severity: EvaluationSeverity;
  /** Slug technique pour les analytics / logs */
  code: string;
};

export type VisionDecision =
  | 'match'
  | 'mismatch'
  | 'uncertain'
  | 'insufficient_photos'
  | 'photos_to_retake'
  | 'fraud_suspected';

export type EvaluationMessageInput = {
  /** Résultat de la décision vision */
  decision?: VisionDecision | null;
  /** Score 0–100 retourné par evaluate-device */
  score?: number | null;
  /** true si Gemini a détecté une fraude explicite */
  fraudDetected?: boolean;
  /** Validité IMEI issue de check-imei */
  imeiValidity?: 'valid' | 'invalid' | null;
  /** Raison spécifique de check-imei */
  imeiReason?: string | null;
  /** Photos non disponibles / erreur upload */
  photosUnavailable?: boolean;
  /** Blocker physique issu de checkBlockers — prioritaire sur la décision vision */
  blockerReason?: BlockerReason | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 7 paliers de score → clé de message */
const scoreBand = (score: number): string => {
  if (score >= 90) return 'match_s90';  // quasi neuf
  if (score >= 75) return 'match_s75';  // excellent
  if (score >= 60) return 'match_s60';  // bon
  if (score >= 45) return 'match_s45';  // correct
  if (score >= 30) return 'match_s30';  // usure notable
  if (score >= 15) return 'match_s15';  // dégradé
  return 'match_s01';                    // très abîmé / valeur résiduelle
};

// ─── Catalogue de messages ────────────────────────────────────────────────────

const MESSAGES: Record<string, EvaluationMessage> = {

  // ── IMEI invalide ────────────────────────────────────────────────────────
  imei_invalid: {
    title: 'Numéro IMEI invalide',
    body: "Ce numéro ne correspond à aucun téléphone connu. Composez *#06# sur votre téléphone pour retrouver le bon numéro.",
    cta: 'Corriger mon IMEI',
    severity: 'error',
    code: 'imei_invalid',
  },

  // ── Photos introuvables / upload échoué ──────────────────────────────────
  photos_unavailable: {
    title: 'Photos non reçues',
    body: "Vérifiez votre connexion et réessayez. Si le problème persiste, apportez l'appareil directement en boutique.",
    cta: 'Renvoyer mes photos',
    severity: 'error',
    code: 'photos_unavailable',
  },

  // ── Photos insuffisantes ─────────────────────────────────────────────────
  insufficient_photos: {
    title: 'Photos insuffisantes',
    body: "Prenez une photo nette de la face avant et une photo de l'écran « À propos du téléphone ». Ça nous aide à faire une offre juste.",
    cta: 'Reprendre mes photos',
    severity: 'warning',
    code: 'insufficient_photos',
  },

  // ── Photos à reprendre — au moins une photo ne montre pas l'appareil ─────
  // Ton neutre, pas accusateur : on assume l'erreur de manipulation.
  photos_to_retake: {
    title: 'Photos à compléter',
    body: "Une ou plusieurs photos ne montrent pas clairement votre téléphone. Pourriez-vous remplacer celles signalées par une photo nette de l'appareil ? On reprend l'estimation juste après.",
    cta: 'Remplacer mes photos',
    severity: 'warning',
    code: 'photos_to_retake',
  },

  // ── Fraude détectée — on assume la bonne foi, on guide ──────────────────
  fraud_suspected: {
    title: 'Modèle non confirmé',
    body: "Le téléphone sur vos photos ne semble pas être celui que vous avez indiqué. Allez dans Réglages > À propos pour vérifier le nom exact du modèle.",
    cta: 'Recommencer',
    severity: 'error',
    code: 'fraud_suspected',
  },
  // Cas où l'appareil ne s'allume pas. Ton factuel, pas accusateur, voie de sortie claire.
  refused_powers_off: {
    title: 'Diagnostic en boutique nécessaire',
    body: "Les appareils qui ne s’allument pas ne peuvent pas être évalués à distance. Notre technicien peut diagnostiquer le vôtre en boutique : si la carte mère est récupérable, une valeur résiduelle vous sera proposée.",
    cta: 'Contacter la boutique',
    severity: 'error',
    code: 'refused_powers_off',
  },
  // Dégâts d'eau déclarés — empathique, on rappelle l'option boutique sans culpabiliser.
  refused_water_damage: {
    title: 'Diagnostic en boutique nécessaire',
    body: "L’étendue des dégâts d’eau ne peut être confirmée qu’en physique. Apportez l’appareil en boutique : notre technicien évaluera les composants encore récupérables et pourra proposer une valeur résiduelle adaptée.",
    cta: 'Contacter la boutique',
    severity: 'error',
    code: 'refused_water_damage',
  },
  // Pas un refus stricto sensu — modèle hors référentiel automatique. Ton positif et orienté solution.
  refused_no_base_price: {
    title: 'Estimation personnalisée requise',
    body: "Ce modèle n’est pas encore référencé dans notre tarif automatique. Notre équipe peut effectuer une cotation sur mesure en boutique sous 24 h ouvrées.",
    cta: 'Demander une estimation manuelle',
    severity: 'info',
    code: 'refused_no_base_price',
  },

  // ── Mismatch (déclaration incorrecte, bonne foi probable) ───────────────
  mismatch: {
    title: 'Modèle à corriger',
    body: "Le modèle visible sur vos photos est différent de celui déclaré. Allez dans Réglages > À propos et vérifiez le nom exact — c'est souvent une petite différence.",
    cta: 'Corriger ma déclaration',
    severity: 'warning',
    code: 'mismatch',
  },

  // ── Incertain — photos ambiguës mais déclaration crédible ──────────────
  uncertain: {
    title: 'Estimation provisoire',
    body: "On a généré une offre préliminaire. Certains détails seront confirmés quand vous apporterez l'appareil en boutique.",
    cta: 'Voir mon estimation',
    severity: 'info',
    code: 'uncertain',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Match par palier de score (7 niveaux)
  // ─────────────────────────────────────────────────────────────────────────

  // 90-100 : quasi neuf
  match_s90: {
    title: 'Quasi neuf',
    body: "Votre appareil est impeccable — pratiquement aucune trace d'usage. Vous obtenez notre meilleure offre pour ce modèle.",
    cta: 'Voir mon offre',
    severity: 'success',
    code: 'match_s90',
  },

  // 75-89 : excellent
  match_s75: {
    title: 'Très bon état',
    body: "Très peu de traces, l'appareil a été bien entretenu. C'est une belle reprise — votre offre est maximale pour cet état.",
    cta: 'Voir mon offre',
    severity: 'success',
    code: 'match_s75',
  },

  // 60-74 : bon
  match_s60: {
    title: 'Bon état',
    body: "Quelques petites marques d'usage, rien d'anormal. Votre téléphone est en bon état et votre offre le reflète.",
    cta: 'Voir mon offre',
    severity: 'success',
    code: 'match_s60',
  },

  // 45-59 : correct
  match_s45: {
    title: 'État correct',
    body: "L'usure est visible mais dans la normale. On vous propose une reprise standard pour ce modèle dans cet état.",
    cta: 'Voir mon offre',
    severity: 'info',
    code: 'match_s45',
  },

  // 30-44 : usure notable
  match_s30: {
    title: 'Usure notable',
    body: "Votre téléphone a vécu. On vous fait quand même une offre, ajustée en fonction des défauts visibles. Elle sera confirmée en boutique.",
    cta: 'Voir quand même mon offre',
    severity: 'warning',
    code: 'match_s30',
  },

  // 15-29 : état dégradé
  match_s15: {
    title: 'État dégradé',
    body: "L'état de votre téléphone est assez dégradé. L'offre sera revue à la baisse et devra être confirmée lors de la dépose en boutique.",
    cta: 'Voir l’offre résiduelle',
    severity: 'warning',
    code: 'match_s15',
  },

  // 1-14 : très abîmé
  match_s01: {
    title: 'Très abîmé',
    body: "L'état est fortement dégradé. On peut vous proposer une valeur résiduelle — mais sans garantie avant vérification physique en boutique.",
    cta: 'Voir la valeur résiduelle',
    severity: 'error',
    code: 'match_s01',
  },

  // ── Aucune vision — IMEI seul valide ─────────────────────────────────────
  imei_only_valid: {
    title: 'Appareil reconnu',
    body: "Votre téléphone est reconnu. Pour recevoir une offre précise, ajoutez des photos — ça prend moins d'une minute.",
    cta: 'Ajouter mes photos',
    severity: 'info',
    code: 'imei_only_valid',
  },

  // ── Fallback générique ───────────────────────────────────────────────────
  unknown: {
    title: 'Dossier reçu',
    body: "On a bien reçu votre demande. Un conseiller Xeption prend le relais pour finaliser votre estimation.",
    cta: 'Contacter la boutique',
    severity: 'info',
    code: 'unknown',
  },
};

// ─── Résolution principale ────────────────────────────────────────────────────

/**
 * Retourne le message client adapté en fonction du résultat combiné
 * de check-imei et evaluate-device.
 */
export const resolveEvaluationMessage = (input: EvaluationMessageInput): EvaluationMessage => {
  const { decision, score, fraudDetected, imeiValidity, imeiReason, photosUnavailable, blockerReason } = input;

  // 1. IMEI invalide → bloquant, rien d'autre n'a de sens
  if (imeiValidity === 'invalid' || imeiReason === 'invalid_imei_checksum') {
    return MESSAGES.imei_invalid;
  }

  // 2. Photos non disponibles (erreur technique upload)
  if (photosUnavailable) {
    return MESSAGES.photos_unavailable;
  }

  // 3. Blocker physique — prioritaire sur l'analyse vision (un téléphone qui ne
  //    s'allume pas n'a pas de score, peu importe les photos).
  if (blockerReason === 'powers_off')    return MESSAGES.refused_powers_off;
  if (blockerReason === 'water_damage')  return MESSAGES.refused_water_damage;
  if (blockerReason === 'no_base_price') return MESSAGES.refused_no_base_price;

  // 4. Aucune analyse visuelle — IMEI seul
  if (!decision) {
    return MESSAGES.imei_only_valid;
  }

  // 5. Fraude explicite (fraudDetected prioritaire sur decision)
  if (fraudDetected || decision === 'fraud_suspected') {
    return MESSAGES.fraud_suspected;
  }

  // 6. Photos insuffisantes
  if (decision === 'insufficient_photos') {
    return MESSAGES.insufficient_photos;
  }

  // 7. Photos à reprendre (au moins une non conforme — pas un signal de fraude)
  if (decision === 'photos_to_retake') {
    return MESSAGES.photos_to_retake;
  }

  // 8. Mismatch sans fraude explicite
  if (decision === 'mismatch') {
    return MESSAGES.mismatch;
  }

  // 9. Incertain
  if (decision === 'uncertain') {
    return MESSAGES.uncertain;
  }

  // 10. Match → affinage par score sur 7 paliers
  if (decision === 'match') {
    const s = score ?? 0;
    return MESSAGES[scoreBand(s)] ?? MESSAGES.match_s45;
  }

  return MESSAGES.unknown;
};

// ─── Export du catalogue (utile pour les tests ou l'admin) ───────────────────
export { MESSAGES as ALL_EVALUATION_MESSAGES };

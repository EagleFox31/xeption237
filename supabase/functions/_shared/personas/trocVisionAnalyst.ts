import {
  BODY_CONDITIONS,
  CAMERA_CONDITIONS,
  REPAIR_OPTIONS,
  SCREEN_CONDITIONS,
} from '../conditions.ts';

export type TrocVisionAnalystInput = {
  brand: string;
  model: string;
  storage?: string;
  ram?: string;
  batteryHealth: number;
  screenCondition?: string;
  bodyCondition?: string;
  cameraCondition?: string;
  accessories?: string[];
  photoCount: number;
};

export type TrocVisionAnalystEvidence = {
  source: string;
  signal: string;
};

export type PhotoIssueReason =
  | 'screenshot'
  | 'not_a_device'
  | 'rendered_or_marketing'
  | 'severely_unreadable';

export type PhotoIssue = {
  /** Index 1-based de la photo concernée (ordre d'envoi). */
  index: number;
  /** Raison technique (interne, jamais affichée brute au client). */
  reason: PhotoIssueReason;
};

export type TrocVisionAnalystDecision =
  | 'match'
  | 'mismatch'
  | 'uncertain'
  | 'insufficient_photos'
  | 'photos_to_retake'
  | 'fraud_suspected';

export type TrocVisionAnalystOutput = {
  score: number;
  justification: string;
  observedBrand: string;
  observedModel: string;
  decision: TrocVisionAnalystDecision;
  confidence: number;
  fraudDetected: boolean;
  photoIssues: PhotoIssue[];
  evidence: TrocVisionAnalystEvidence[];
  warnings: string[];
};

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const normalizeLine = (value?: string): string =>
  (value || '').replace(/\s+/g, ' ').trim();

const extractJsonCandidate = (text: string): string | null => {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  return candidate.slice(start, end + 1);
};

export const buildTrocVisionAnalystPrompt = (input: TrocVisionAnalystInput): string => {
  const accessories = input.accessories?.length ? input.accessories.join(', ') : 'aucun';

  return [
    'Tu es Troc Vision Analyst pour Xeption Network.',
    'Tu analyses des photos envoyées par un client pour estimer l’état réel d’un appareil et détecter une éventuelle incohérence avec la déclaration.',
    'Tu dois rester strict, concret et conservateur: si tu n’es pas sûr, tu l’écris.',
    '',
    'Contexte déclaré par le client:',
    `- Marque: ${input.brand}`,
    `- Modèle: ${input.model}`,
    `- Stockage: ${input.storage || 'N/A'}`,
    `- RAM: ${input.ram || 'N/A'}`,
    `- Santé batterie: ${input.batteryHealth}%`,
    `- État écran déclaré: ${input.screenCondition || 'non précisé'}`,
    `- État coque déclaré: ${input.bodyCondition || 'non précisé'}`,
    `- État caméra déclaré: ${input.cameraCondition || 'non précisé'}`,
    `- Accessoires: ${accessories}`,
    `- Nombre de photos disponibles: ${input.photoCount}`,
    '',
    'Référentiel de conditions acceptées:',
    `- écran: ${SCREEN_CONDITIONS.join(', ')}`,
    `- coque: ${BODY_CONDITIONS.join(', ')}`,
    `- caméra: ${CAMERA_CONDITIONS.join(', ')}`,
    `- réparations possibles: ${REPAIR_OPTIONS.join(', ')}`,
    '',
    'ÉTAPE 1 — Contrôle de conformité photo par photo (RÈGLE ABSOLUE, prioritaire) :',
    '- Tu reçois les photos dans l’ordre d’envoi du client. La première photo a index = 1, la deuxième index = 2, et ainsi de suite.',
    '- Pour CHAQUE photo, vérifie qu’elle montre bien un smartphone physique réel pris en photo par le client.',
    '- Une photo est NON CONFORME si elle correspond à un de ces cas :',
    '    • capture d’écran (screenshot, interface logicielle, page web) → reason = "screenshot"',
    '    • objet qui n’est pas un téléphone (montre, smartwatch, bracelet connecté, tablette, écouteurs, PC, console, personne, plat, document, paysage, animal, autre objet) → reason = "not_a_device"',
    '    • un objet avec un écran n’est PAS un smartphone tant qu’il ne s’agit pas clairement d’un téléphone mobile → reason = "not_a_device"',
    '    • image de catalogue, rendu 3D, photo marketing, dessin, illustration → reason = "rendered_or_marketing"',
    '    • photo si floue, sombre ou cadrée que l’appareil n’est PAS identifiable même partiellement → reason = "severely_unreadable"',
    '- Pour chaque photo non conforme, ajoute une entrée dans photoIssues : { "index": <numéro 1-based>, "reason": "<raison>" }.',
    '- Si photoIssues contient au moins une entrée, mets decision = "photos_to_retake", score = 0, fraudDetected = false. NE remplis PAS observedBrand / observedModel dans ce cas.',
    '- Une photo légèrement floue, peu éclairée ou partielle MAIS où l’appareil reste identifiable EST conforme. Sois tolérant tant que l’on voit le téléphone.',
    '',
    'ÉTAPE 2 — Si et seulement si TOUTES les photos sont conformes (photoIssues vide), procède à l’analyse :',
    '- Compare la marque et le modèle visibles avec la déclaration.',
    '- Si la marque ou le modèle visible contredit clairement la déclaration, mets decision = "mismatch" (PAS "fraud_suspected" sauf preuve flagrante de manipulation comme superposition d’images ou montage évident).',
    '- "fraud_suspected" est réservé aux cas extrêmes : preuves de montage, photo manifestement issue d’un autre dossier, etc. En cas de simple incohérence honnête, utilise "mismatch".',
    '- Si l’appareil semble cohérent mais qu’une partie de l’état reste incertaine, mets decision = "uncertain" et confidence faible à moyenne.',
    '- Sinon, mets decision = "match" et un score reflétant l’état visuel global : 70-100 excellent, 40-69 moyen, 1-39 mauvais.',
    '- Ne fabrique jamais une marque ou un modèle si l’identification visuelle n’est pas assez nette.',
    '- La justification doit être en français, en 2 à 3 phrases naturelles, avec accents et apostrophes typographiques, sans liste, sans staccato verbeless.',
    '',
    'Retourne uniquement un JSON valide avec cette structure :',
    '{',
    '  "score": 0,',
    '  "justification": "string",',
    '  "observedBrand": "string",',
    '  "observedModel": "string",',
    '  "decision": "match | mismatch | uncertain | insufficient_photos | photos_to_retake | fraud_suspected",',
    '  "confidence": 0.0,',
    '  "fraudDetected": true,',
    '  "photoIssues": [{"index": 1, "reason": "screenshot | not_a_device | rendered_or_marketing | severely_unreadable"}],',
    '  "evidence": [{"source":"string","signal":"string"}],',
    '  "warnings": ["string"]',
    '}',
  ].join('\n');
};

export type TrocPhotoPreflightOutput = {
  decision: 'ok' | 'photos_to_retake' | 'mismatch';
  photoIssues: PhotoIssue[];
  observedBrand: string;
  observedModel: string;
};

/** Contrôle léger avant paiement — conformité des photos uniquement. */
export const buildTrocPhotoPreflightPrompt = (input: Pick<TrocVisionAnalystInput, 'brand' | 'model' | 'photoCount'>): string =>
  [
    'Tu es un contrôleur photo pour Smart Troc (Xeption Network).',
    'Mission : vérifier UNIQUEMENT que les photos montrent le smartphone déclaré, avant paiement.',
    'Ne score pas l’état, ne rédige pas de rapport — décision binaire.',
    '',
    'Appareil déclaré :',
    `- Marque: ${input.brand}`,
    `- Modèle: ${input.model}`,
    `- Nombre de photos: ${input.photoCount} (index 1-based dans l’ordre d’envoi)`,
    '',
    'Règles (prioritaires) :',
    '- Chaque photo doit montrer un smartphone physique réel.',
    '- NON CONFORME → photoIssues + decision "photos_to_retake" :',
    '    • screenshot / interface → reason "screenshot"',
    '    • montre, smartwatch, tablette, écouteurs, PC, autre objet → reason "not_a_device"',
    '    • catalogue / marketing / illustration → reason "rendered_or_marketing"',
    '    • illisible / appareil non identifiable → reason "severely_unreadable"',
    '- Si TOUTES conformes mais marque/modèle visible ≠ déclaration → decision "mismatch", photoIssues vide.',
    '- Si TOUTES conformes et cohérentes avec la déclaration → decision "ok", photoIssues vide.',
    '',
    'JSON uniquement :',
    '{',
    '  "decision": "ok | photos_to_retake | mismatch",',
    '  "observedBrand": "string",',
    '  "observedModel": "string",',
    '  "photoIssues": [{"index": 1, "reason": "screenshot | not_a_device | rendered_or_marketing | severely_unreadable"}]',
    '}',
  ].join('\n');

export const parseTrocPhotoPreflightOutput = (text: string): TrocPhotoPreflightOutput | null => {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  let parsed: any = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  const photoIssues: PhotoIssue[] = Array.isArray(parsed?.photoIssues)
    ? parsed.photoIssues
        .map((item: any): PhotoIssue | null => {
          const idxRaw = Number(item?.index);
          if (!Number.isFinite(idxRaw) || idxRaw < 1) return null;
          const reason = item?.reason;
          if (
            reason !== 'screenshot' &&
            reason !== 'not_a_device' &&
            reason !== 'rendered_or_marketing' &&
            reason !== 'severely_unreadable'
          ) {
            return null;
          }
          return { index: Math.floor(idxRaw), reason };
        })
        .filter((x: PhotoIssue | null): x is PhotoIssue => x !== null)
        .slice(0, 8)
    : [];

  const decision: TrocPhotoPreflightOutput['decision'] =
    photoIssues.length > 0
      ? 'photos_to_retake'
      : parsed?.decision === 'mismatch'
        ? 'mismatch'
        : parsed?.decision === 'ok'
          ? 'ok'
          : 'photos_to_retake';

  return {
    decision,
    photoIssues,
    observedBrand: normalizeLine(parsed?.observedBrand),
    observedModel: normalizeLine(parsed?.observedModel),
  };
};

export const parseTrocVisionAnalystOutput = (text: string): TrocVisionAnalystOutput | null => {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  let parsed: any = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  const justification = normalizeLine(parsed?.justification);
  const observedBrand = normalizeLine(parsed?.observedBrand);
  const observedModel = normalizeLine(parsed?.observedModel);
  const decision: TrocVisionAnalystDecision =
    parsed?.decision === 'match' ||
    parsed?.decision === 'mismatch' ||
    parsed?.decision === 'uncertain' ||
    parsed?.decision === 'insufficient_photos' ||
    parsed?.decision === 'photos_to_retake' ||
    parsed?.decision === 'fraud_suspected'
      ? parsed.decision
      : 'uncertain';

  const photoIssues: PhotoIssue[] = Array.isArray(parsed?.photoIssues)
    ? parsed.photoIssues
        .map((item: any): PhotoIssue | null => {
          const idxRaw = Number(item?.index);
          if (!Number.isFinite(idxRaw) || idxRaw < 1) return null;
          const reason = item?.reason;
          if (
            reason !== 'screenshot' &&
            reason !== 'not_a_device' &&
            reason !== 'rendered_or_marketing' &&
            reason !== 'severely_unreadable'
          ) {
            return null;
          }
          return { index: Math.floor(idxRaw), reason };
        })
        .filter((x: PhotoIssue | null): x is PhotoIssue => x !== null)
        .slice(0, 8)
    : [];

  const evidence = Array.isArray(parsed?.evidence)
    ? parsed.evidence
        .map((item: any) => ({
          source: normalizeLine(typeof item?.source === 'string' ? item.source : ''),
          signal: normalizeLine(typeof item?.signal === 'string' ? item.signal : ''),
        }))
        .filter((item: TrocVisionAnalystEvidence) => item.source || item.signal)
        .slice(0, 8)
    : [];

  const warnings = Array.isArray(parsed?.warnings)
    ? parsed.warnings
        .map((item: unknown) => normalizeLine(typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  // Si Gemini a signalé des photos non conformes, on force decision = 'photos_to_retake'
  // même si Gemini a aussi rempli un score (sécurité ceinture-bretelles).
  const finalDecision: TrocVisionAnalystDecision =
    photoIssues.length > 0 ? 'photos_to_retake' : decision;

  // Justification facultative quand on demande de reprendre des photos
  // (le message client vient du catalogue evaluationMessages).
  if (!justification && finalDecision !== 'photos_to_retake') return null;

  return {
    score: finalDecision === 'photos_to_retake'
      ? 0
      : clampNumber(Math.round(Number(parsed?.score ?? 0)), 0, 100),
    justification,
    observedBrand: finalDecision === 'photos_to_retake' ? '' : observedBrand,
    observedModel: finalDecision === 'photos_to_retake' ? '' : observedModel,
    decision: finalDecision,
    confidence: clampNumber(Number(parsed?.confidence ?? 0), 0, 1),
    fraudDetected: Boolean(parsed?.fraudDetected),
    photoIssues,
    evidence,
    warnings,
  };
};

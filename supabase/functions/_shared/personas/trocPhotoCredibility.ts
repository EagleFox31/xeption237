import type { PhotoIssue, PhotoIssueReason } from './trocVisionAnalyst.ts';

export type PhotoCredibilityInput = {
  brand: string;
  model: string;
  photoCount: number;
};

export type DeclarationMatch = 'match' | 'plausible' | 'mismatch' | 'unknown';

export type PhotoCredibilityDecision = 'approved' | 'retake' | 'mismatch';

export type PhotoCredibilityOutput = {
  decision: PhotoCredibilityDecision;
  confidence: number;
  observedBrand: string;
  observedModel: string;
  photoIssues: PhotoIssue[];
  allPhotosShowSmartphone: boolean;
  declarationMatch: DeclarationMatch;
  summary: string;
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

const parsePhotoIssues = (raw: unknown): PhotoIssue[] => {
  if (!Array.isArray(raw)) return [];
  return raw
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
      return { index: Math.floor(idxRaw), reason: reason as PhotoIssueReason };
    })
    .filter((x: PhotoIssue | null): x is PhotoIssue => x !== null)
    .slice(0, 8);
};

export const buildTrocPhotoCredibilityPrompt = (input: PhotoCredibilityInput): string =>
  [
    'Tu es l’agent de crédibilité photo Smart Troc (Xeption Network, Cameroun).',
    'Tu ne fais PAS de prix, PAS de score d’état, PAS de rapport écran/coque.',
    'Tu vérifies UNIQUEMENT si les photos soumises montrent un vrai smartphone cohérent avec la déclaration.',
    '',
    'Déclaration client :',
    `- Marque : ${input.brand}`,
    `- Modèle : ${input.model}`,
    `- Photos reçues : ${input.photoCount} (index 1-based, ordre d’envoi libre)`,
    '',
    'CONTEXTE ET TOLÉRANCE UTILISATEUR RÉEL :',
    '- Les photos sont prises au quotidien par des clients (sur un bureau, une table, à côté d’un ordinateur portable, câbles ou mains visibles). La présence d’un laptop ou d’objets en arrière-plan est NORMALE : concentre-toi sur le smartphone photographié.',
    '- L’ordre des photos est LIBRE : l’écran allumé peut être sur la photo 4 et l’écran éteint sur la photo 1, c’est tout à fait normal et conforme.',
    '- Les smartphones récents (notamment Xiaomi 14 / 14T, Redmi, Samsung Galaxy, etc.) ont un format moderne commun (écran borderless avec poinçon, dos en verre avec bloc optique multi-capteurs). Si le logo ou le lettrage exact n’est pas nettement lisible à 100%, c’est PLAUSIBLE, JAMAIS un mismatch.',
    '',
    'CHECKLIST (stricte) :',
    '1) Chaque photo montre-t-elle un smartphone PHYSIQUE réel (non conforme = absence totale de téléphone, montre seule, casque, écouteurs, PC seul) ?',
    '2) Pas de capture d’écran logicielle d’ordinateur, pas de catalogue/rendu 3D publicitaire.',
    '3) Photo exploitable pour identifier un téléphone (même avec reflets ou environnement domestique).',
    '4) Compatibilité avec la marque/modèle déclarés :',
    '   - match = smartphone clairement compatible avec la gamme/marque déclarée.',
    '   - plausible = smartphone moderne cohérent, aucune marque contradictoire flagrante (par défaut pour les smartphones récents).',
    '   - unknown = smartphone visible mais marquages difficiles à lire (décision : approved).',
    '   - mismatch = STRICTEMENT réservé aux cas où une marque OPPOSÉE est incontestablement visible (ex: logo Apple éclatant alors que le client a déclaré Xiaomi/Samsung, ou téléphone à clapet/touches au lieu d’un smartphone moderne). Ne JAMAIS mettre mismatch en cas de simple doute.',
    '',
    'Décision :',
    '- photoIssues non vide (vrai non-smartphone, screenshot, rendu 3D, illisible) → decision "retake"',
    '- declarationMatch "mismatch" avec preuve de marque opposée évidente et confiance ≥ 0.85 → decision "mismatch"',
    '- sinon (match, plausible, unknown) → decision "approved"',
    '',
    'summary = 1 phrase française, ton boutique, positive et professionnelle.',
    '',
    'JSON uniquement :',
    '{',
    '  "decision": "approved | retake | mismatch",',
    '  "confidence": 0.0,',
    '  "observedBrand": "",',
    '  "observedModel": "",',
    '  "allPhotosShowSmartphone": true,',
    '  "declarationMatch": "match | plausible | mismatch | unknown",',
    '  "summary": "",',
    '  "photoIssues": [{"index": 1, "reason": "not_a_device | screenshot | rendered_or_marketing | severely_unreadable"}]',
    '}',
  ].join('\n');

export const parseTrocPhotoCredibilityOutput = (text: string): PhotoCredibilityOutput | null => {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;

  let parsed: any = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  const photoIssues = parsePhotoIssues(parsed?.photoIssues);
  const declarationMatch: DeclarationMatch =
    parsed?.declarationMatch === 'match' ||
    parsed?.declarationMatch === 'plausible' ||
    parsed?.declarationMatch === 'mismatch' ||
    parsed?.declarationMatch === 'unknown'
      ? parsed.declarationMatch
      : 'unknown';

  const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0)));

  let decision: PhotoCredibilityDecision = 'approved';

  if (photoIssues.length > 0) {
    decision = 'retake';
  } else if (
    (parsed?.decision === 'mismatch' || declarationMatch === 'mismatch') &&
    declarationMatch === 'mismatch' &&
    confidence >= 0.85
  ) {
    decision = 'mismatch';
  } else {
    decision = 'approved';
  }

  const summary = normalizeLine(parsed?.summary) ||
    (decision === 'approved'
      ? 'Les photos montrent un smartphone cohérent avec votre déclaration.'
      : 'Les photos ne permettent pas de valider le dossier.');

  return {
    decision,
    confidence,
    observedBrand: normalizeLine(parsed?.observedBrand),
    observedModel: normalizeLine(parsed?.observedModel),
    photoIssues,
    allPhotosShowSmartphone: Boolean(parsed?.allPhotosShowSmartphone),
    declarationMatch,
    summary,
  };
};

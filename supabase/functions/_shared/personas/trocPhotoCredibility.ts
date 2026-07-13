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
    'Tu verifies UNIQUEMENT si les photos permettent de croire qu’un vrai smartphone correspond à la déclaration.',
    '',
    'Déclaration client :',
    `- Marque : ${input.brand}`,
    `- Modèle : ${input.model}`,
    `- Photos reçues : ${input.photoCount} (index 1-based, ordre d’envoi)`,
    '',
    'CHECKLIST (stricte) :',
    '1) Chaque photo montre-t-elle un smartphone PHYSIQUE réel (pas montre, smartwatch, tablette, écouteurs, PC, autre objet) ?',
    '2) Capture d’écran, page web, catalogue, rendu 3D, illustration → non conforme.',
    '3) Photo trop floue/sombre pour identifier un téléphone → non conforme.',
    '4) Si toutes conformes : la marque/modèle VISIBLES sont-ils compatibles avec la déclaration ?',
    '   - match = clairement le même type d’appareil',
    '   - plausible = marque OK, modèle proche ou non lisible',
    '   - mismatch = autre type d’appareil (ex. montre, autre marque évidente)',
    '   - unknown = téléphone visible mais marque/modèle illisibles',
    '',
    'Décision :',
    '- photoIssues non vide OU objet non-téléphone → decision "retake"',
    '- declarationMatch "mismatch" avec confiance ≥ 0.7 → decision "mismatch"',
    '- sinon → decision "approved"',
    '',
    'summary = 1 phrase française, ton boutique, sans jargon.',
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

  let decision: PhotoCredibilityDecision =
    parsed?.decision === 'approved' ||
    parsed?.decision === 'retake' ||
    parsed?.decision === 'mismatch'
      ? parsed.decision
      : 'retake';

  if (photoIssues.length > 0) decision = 'retake';
  else if (decision === 'approved' && declarationMatch === 'mismatch' && confidence >= 0.7) {
    decision = 'mismatch';
  } else if (decision !== 'mismatch' && photoIssues.length === 0 && declarationMatch !== 'mismatch') {
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

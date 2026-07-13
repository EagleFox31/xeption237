/** Aligné sur supabase/functions/_shared/personas/trocPhotoCredibility.ts (dev local navigateur). */

export const CREDIBILITY_MAX_PHOTOS = 4;

export type PhotoCredibilityInput = {
  brand: string;
  model: string;
  photoCount: number;
};

export type PhotoCredibilityDecision = 'approved' | 'retake' | 'mismatch';

export type PhotoCredibilityParsed = {
  decision: PhotoCredibilityDecision;
  photoIssues: Array<{ index: number; reason?: string }>;
  summary: string;
};

export const buildPhotoCredibilityPrompt = (input: PhotoCredibilityInput): string =>
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
    '',
    'Décision : photoIssues non vide → "retake" ; modèle incompatible → "mismatch" ; sinon "approved".',
    '',
    'JSON : {"decision":"approved|retake|mismatch","confidence":0.9,"observedBrand":"","observedModel":"","allPhotosShowSmartphone":true,"declarationMatch":"match|plausible|mismatch|unknown","summary":"","photoIssues":[{"index":1,"reason":"not_a_device|screenshot|rendered_or_marketing|severely_unreadable"}]}',
  ].join('\n');

export const parsePhotoCredibilityJson = (text: string): PhotoCredibilityParsed | null => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    const photoIssues = Array.isArray(parsed.photoIssues)
      ? parsed.photoIssues
          .map((p: { index?: number; reason?: string }) => ({
            index: Number(p.index),
            reason: p.reason,
          }))
          .filter((p: { index: number }) => Number.isFinite(p.index) && p.index >= 1)
      : [];

    let decision: PhotoCredibilityDecision =
      parsed.decision === 'approved' || parsed.decision === 'retake' || parsed.decision === 'mismatch'
        ? parsed.decision
        : 'retake';

    if (photoIssues.length > 0) decision = 'retake';
    else if (
      decision === 'approved' &&
      parsed.declarationMatch === 'mismatch' &&
      Number(parsed.confidence ?? 0) >= 0.7
    ) {
      decision = 'mismatch';
    }

    return {
      decision,
      photoIssues,
      summary: String(parsed.summary ?? '').trim(),
    };
  } catch {
    return null;
  }
};

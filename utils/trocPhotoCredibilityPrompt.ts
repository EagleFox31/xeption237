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
    '- Les smartphones récents (notamment Xiaomi 14 / 14T, Redmi, Samsung Galaxy, etc.) ont un format moderne commun. Si le lettrage exact n’est pas lisible à 100%, c’est PLAUSIBLE, JAMAIS un mismatch.',
    '',
    'CHECKLIST (stricte) :',
    '1) Chaque photo montre-t-elle un smartphone PHYSIQUE réel (non conforme = absence de téléphone, montre seule, écouteurs, PC seul) ?',
    '2) Pas de capture d’écran logicielle d’ordinateur, pas de catalogue/rendu 3D publicitaire.',
    '3) Photo exploitable pour identifier un téléphone (même avec reflets ou environnement domestique).',
    '4) Compatibilité avec la marque/modèle déclarés :',
    '   - match = smartphone clairement compatible avec la gamme/marque déclarée.',
    '   - plausible = smartphone moderne cohérent, aucune marque contradictoire flagrante.',
    '   - unknown = smartphone visible mais marquages difficiles à lire (décision : approved).',
    '   - mismatch = STRICTEMENT réservé aux cas où une marque OPPOSÉE est incontestablement visible (ex: logo Apple éclatant alors que le client a déclaré Xiaomi/Samsung, ou téléphone à touches). Ne JAMAIS mettre mismatch en cas de simple doute.',
    '',
    'Décision : photoIssues non vide → "retake" ; mismatch avec marque opposée évidente et confiance ≥ 0.85 → "mismatch" ; sinon "approved".',
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

    const declarationMatch = parsed.declarationMatch;
    const confidence = Number(parsed.confidence ?? 0);

    let decision: PhotoCredibilityDecision = 'approved';

    if (photoIssues.length > 0) {
      decision = 'retake';
    } else if (
      (parsed.decision === 'mismatch' || declarationMatch === 'mismatch') &&
      declarationMatch === 'mismatch' &&
      confidence >= 0.85
    ) {
      decision = 'mismatch';
    } else {
      decision = 'approved';
    }

    return {
      decision,
      photoIssues,
      summary: String(parsed.summary ?? '').trim() ||
        (decision === 'approved'
          ? 'Les photos montrent un smartphone cohérent avec votre déclaration.'
          : 'Les photos ne permettent pas de valider le dossier.'),
    };
  } catch {
    return null;
  }
};

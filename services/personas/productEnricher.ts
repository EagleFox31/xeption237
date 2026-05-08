export type ProductEnricherSpec = {
  label: string;
  value: string;
};

export type ProductEnricherOutput = {
  description: string;
  reviewShort: string;
  pros: string[];
  cons: string[];
  specs: ProductEnricherSpec[];
  manualChecks: string[];
};

const normalizeLine = (value?: string): string =>
  (value || '').replace(/\s+/g, ' ').trim();

export const buildProductEnricherPrompt = (productName: string, category: string): string => `
Tu es le persona "Product Enricher" de Xeption.

Mission:
- enrichir une fiche produit e-commerce de manière crédible
- rester utile commercialement
- ne pas inventer de caractéristiques critiques avec certitude si elles sont ambiguës

Contexte:
- Produit: ${productName}
- Catégorie: ${category}
- Marché: high-tech au Cameroun
- Ton: expert, propre, commercial, jamais trop hype ni creux

Règles:
- description: 2 à 3 phrases maximum
- reviewShort: 1 phrase, claire et vendable
- pros: 3 éléments maximum
- cons: 2 éléments maximum
- specs: 4 à 8 specs maximum
- manualChecks: liste des champs à vérifier manuellement si le modèle est ambigu ou si une donnée technique n'est pas certaine
- si une info technique est incertaine, préfère la mettre dans manualChecks plutôt que l'inventer

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  "description": "string",
  "reviewShort": "string",
  "pros": ["string"],
  "cons": ["string"],
  "specs": [{"label":"string","value":"string"}],
  "manualChecks": ["string"]
}
`.trim();

export const parseProductEnricherOutput = (text: string): ProductEnricherOutput => {
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON produit invalide');
  }

  const description = normalizeLine(parsed?.description);
  const reviewShort = normalizeLine(parsed?.reviewShort);

  const pros = Array.isArray(parsed?.pros)
    ? parsed.pros.map((item: unknown) => normalizeLine(typeof item === 'string' ? item : '')).filter(Boolean).slice(0, 3)
    : [];

  const cons = Array.isArray(parsed?.cons)
    ? parsed.cons.map((item: unknown) => normalizeLine(typeof item === 'string' ? item : '')).filter(Boolean).slice(0, 2)
    : [];

  const specs = Array.isArray(parsed?.specs)
    ? parsed.specs
        .map((item: any) => ({
          label: normalizeLine(typeof item?.label === 'string' ? item.label : ''),
          value: normalizeLine(typeof item?.value === 'string' ? item.value : ''),
        }))
        .filter((item: ProductEnricherSpec) => item.label && item.value)
        .slice(0, 8)
    : [];

  const manualChecks = Array.isArray(parsed?.manualChecks)
    ? parsed.manualChecks
        .map((item: unknown) => normalizeLine(typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (!description || !reviewShort) {
    throw new Error('Réponse produit incomplète');
  }

  return {
    description,
    reviewShort,
    pros,
    cons,
    specs,
    manualChecks,
  };
};

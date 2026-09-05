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

export type ProductEnricherField =
  | 'description'
  | 'reviewShort'
  | 'pros'
  | 'cons'
  | 'specs'
  | 'manualChecks';

/** Contexte fiche déjà saisie — la description guide les autres champs */
export type ProductEnricherContext = {
  description?: string;
};

export const ALL_PRODUCT_ENRICHER_FIELDS: ProductEnricherField[] = [
  'description',
  'reviewShort',
  'pros',
  'cons',
  'specs',
  'manualChecks',
];

const FIELD_RULES: Record<ProductEnricherField, string> = {
  description: 'description: 2 à 3 phrases maximum',
  reviewShort: 'reviewShort: 1 phrase, claire et vendable',
  pros: 'pros: 3 éléments maximum',
  cons: 'cons: 2 éléments maximum',
  specs: 'specs: 4 à 8 specs maximum (label + value)',
  manualChecks:
    'manualChecks: champs à vérifier manuellement si le modèle est ambigu ou si une donnée technique n\'est pas certaine',
};

const FIELD_JSON_EXAMPLE: Record<ProductEnricherField, string> = {
  description: '"description": "string"',
  reviewShort: '"reviewShort": "string"',
  pros: '"pros": ["string"]',
  cons: '"cons": ["string"]',
  specs: '"specs": [{"label":"string","value":"string"}]',
  manualChecks: '"manualChecks": ["string"]',
};

const normalizeLine = (value?: string): string =>
  (value || '').replace(/\s+/g, ' ').trim();

export const normalizeEnricherFields = (
  field?: ProductEnricherField | ProductEnricherField[] | 'all'
): ProductEnricherField[] => {
  if (!field || field === 'all') return ALL_PRODUCT_ENRICHER_FIELDS;
  return Array.isArray(field) ? field : [field];
};

const buildDescriptionContextBlock = (
  description: string,
  activeFields: ProductEnricherField[]
): string => {
  const trimmed = normalizeLine(description);
  if (!trimmed) return '';

  const onlyDescription =
    activeFields.length === 1 && activeFields[0] === 'description';

  if (onlyDescription) {
    return `
Description actuelle (tu peux la garder, améliorer ou réécrire si utile):
"${trimmed}"
`;
  }

  return `
Description marketing déjà saisie — SOURCE DE VÉRITÉ pour les champs à générer:
"${trimmed}"

Règles liées à cette description:
- Base pros, cons, specs, reviewShort et manualChecks sur ce texte en priorité
- Extrais les caractéristiques techniques mentionnées (RAM, stockage, écran, processeur, batterie, connectique, etc.) pour alimenter les specs
- Reste cohérent avec le ton et les informations de la description
- Ne contredis pas la description ; si une info est ambiguë ou absente, mets-la dans manualChecks plutôt que d'inventer
- Si la description contient déjà une spec précise, reproduis-la fidèlement dans specs
`;
};

export const buildProductEnricherPrompt = (
  productName: string,
  category: string,
  fields?: ProductEnricherField | ProductEnricherField[] | 'all',
  context?: ProductEnricherContext
): string => {
  const activeFields = normalizeEnricherFields(fields);
  const rules = activeFields.map((f) => `- ${FIELD_RULES[f]}`).join('\n');
  const jsonShape = activeFields.map((f) => FIELD_JSON_EXAMPLE[f]).join(', ');
  const descriptionBlock = buildDescriptionContextBlock(
    context?.description || '',
    activeFields
  );

  return `
Tu es le persona "Product Enricher" de Xeption.

Mission:
- enrichir une fiche produit e-commerce de manière crédible
- rester utile commercialement
- ne pas inventer de caractéristiques critiques avec certitude si elles sont ambiguës
- ne jamais écrire "Import Mfoundi Mall", "Mfoundi" comme source, ni un stub d'import : description marketing réelle uniquement

Contexte:
- Produit: ${productName}
- Catégorie: ${category}
- Marché: high-tech au Cameroun
- Ton: expert, propre, commercial, jamais trop hype ni creux
${descriptionBlock}

Génère UNIQUEMENT les champs demandés ci-dessous (ne retourne rien d'autre):
${rules}
- si une info technique est incertaine, préfère la mettre dans manualChecks plutôt que l'inventer

Retourne UNIQUEMENT un JSON valide avec cette structure:
{
  ${jsonShape}
}
`.trim();
};

export const parseProductEnricherOutput = (
  text: string,
  fields?: ProductEnricherField | ProductEnricherField[] | 'all'
): Partial<ProductEnricherOutput> => {
  const activeFields = normalizeEnricherFields(fields);

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON produit invalide');
  }

  const result: Partial<ProductEnricherOutput> = {};

  if (activeFields.includes('description')) {
    const description = normalizeLine(parsed?.description as string);
    if (!description) throw new Error('Description vide');
    result.description = description;
  }

  if (activeFields.includes('reviewShort')) {
    const reviewShort = normalizeLine(parsed?.reviewShort as string);
    if (!reviewShort) throw new Error('Verdict court vide');
    result.reviewShort = reviewShort;
  }

  if (activeFields.includes('pros')) {
    result.pros = Array.isArray(parsed?.pros)
      ? (parsed.pros as unknown[])
          .map((item) => normalizeLine(typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .slice(0, 3)
      : [];
  }

  if (activeFields.includes('cons')) {
    result.cons = Array.isArray(parsed?.cons)
      ? (parsed.cons as unknown[])
          .map((item) => normalizeLine(typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .slice(0, 2)
      : [];
  }

  if (activeFields.includes('specs')) {
    result.specs = Array.isArray(parsed?.specs)
      ? (parsed.specs as Record<string, unknown>[])
          .map((item) => ({
            label: normalizeLine(typeof item?.label === 'string' ? item.label : ''),
            value: normalizeLine(typeof item?.value === 'string' ? item.value : ''),
          }))
          .filter((item) => item.label && item.value)
          .slice(0, 8)
      : [];
  }

  if (activeFields.includes('manualChecks')) {
    result.manualChecks = Array.isArray(parsed?.manualChecks)
      ? (parsed.manualChecks as unknown[])
          .map((item) => normalizeLine(typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .slice(0, 6)
      : [];
  }

  return result;
};

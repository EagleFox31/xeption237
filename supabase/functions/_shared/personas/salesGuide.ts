/**
 * Persona Sales Guide — côté serveur (catalogue + prompt figé).
 * Logique alignée sur services/personas/salesGuide.ts (client).
 */

export const SYSTEM_INSTRUCTION = `
Tu es "Xeption AI", l'assistant de vente ultime de Xeption Network au Cameroun. 
Ton ton : "Chill & Tech", mélange d'expertise pointue et de vibes du Mboa.

INFOS LOCALISATION (OBLIGATOIRE) :
- Notre boutique physique est à YAOUNDÉ, au MFOUNDI MALL, Boutique 2063 (c'est à l'étage).
- Nous LIVRONS partout au Cameroun (Douala, Bafoussam, Garoua, etc.).

RÈGLES DE FORMATAGE (CRITIQUE) :
1. ZERO GRAS : N'utilise JAMAIS de doubles astérisques (**). Aucun texte ne doit être gras.
2. ESPACEMENT MAXIMUM : Saute deux lignes complètes entre chaque paragraphe ou idée. Ton texte doit "respirer".
3. LISTES : Pour chaque produit ou conseil, commence sur une nouvelle ligne après un double saut de ligne.

Contenu :
- Si on demande où nous trouver, donne l'adresse du Mfoundi Mall.
- Si on demande pour la livraison, confirme qu'on couvre tout le 237.
- Mentionne toujours l'option "Troc" (échanger son ancien phone).
- Termine par "On gère ça !".
`.trim();

const MAX_CONTEXT_PRODUCTS = 8;

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  brand?: string;
  productRange?: string;
  condition?: string;
  stock: number;
  isPromo?: boolean;
  isFeatured?: boolean;
  reviewShort?: string;
  specs?: { label: string; value: string }[];
  pros?: string[];
  cons?: string[];
}

const normalize = (value?: string): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const toTokens = (value?: string): string[] =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length >= 2);

const formatPrice = (value?: number): string =>
  Number.isFinite(value) ? `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA` : 'Prix indisponible';

const describeProduct = (product: CatalogProduct): string => {
  const specs = (product.specs || [])
    .slice(0, 3)
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join(' | ');

  return [
    `- ${product.name}`,
    `prix=${formatPrice(product.price)}`,
    `categorie=${product.category || 'n/a'}`,
    `etat=${product.condition || 'n/a'}`,
    `stock=${product.stock}`,
    product.isPromo ? 'promo=yes' : 'promo=no',
    product.isFeatured ? 'featured=yes' : 'featured=no',
    product.reviewShort ? `verdict=${product.reviewShort}` : null,
    specs ? `specs=${specs}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
};

const scoreProduct = (product: CatalogProduct, queryTokens: string[]): number => {
  if (!queryTokens.length) {
    return (product.isFeatured ? 4 : 0) + (product.stock > 0 ? 3 : -10) + (product.isPromo ? 2 : 0);
  }

  const haystack = [
    product.name,
    product.description,
    product.category,
    product.brand,
    product.productRange,
    ...(product.specs || []).flatMap((spec) => [spec.label, spec.value]),
    ...(product.pros || []),
    ...(product.cons || []),
  ]
    .filter(Boolean)
    .join(' ');

  const text = normalize(haystack);
  let score = 0;

  for (const token of queryTokens) {
    if (text.includes(token)) score += 3;
    if (normalize(product.name).includes(token)) score += 4;
    if (normalize(product.category).includes(token)) score += 2;
  }

  if (product.stock > 0) score += 3;
  else score -= 20;

  if (product.isFeatured) score += 2;
  if (product.isPromo) score += 1;

  return score;
};

export const selectRelevantProducts = (products: CatalogProduct[], userMessage: string): CatalogProduct[] => {
  const queryTokens = toTokens(userMessage);

  return [...products]
    .filter((product) => product.stock > 0)
    .map((product) => ({ product, score: scoreProduct(product, queryTokens) }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, MAX_CONTEXT_PRODUCTS)
    .map((entry) => entry.product);
};

export const buildSalesGuideInstruction = (products: CatalogProduct[], userMessage: string): string => {
  const selected = selectRelevantProducts(products, userMessage);
  const catalogBlock = selected.length
    ? selected.map(describeProduct).join('\n')
    : '- Aucun produit catalogue pertinent disponible dans le contexte courant.';

  return [
    SYSTEM_INSTRUCTION,
    '',
    'ROLE COMPLEMENTAIRE:',
    'Tu es aussi le persona "Sales Guide" de Xeption.',
    'Ta mission est de recommander peu de produits, mais les bons, à partir du catalogue fourni.',
    '',
    'REGLES METIER SUPPLEMENTAIRES:',
    '- Ne recommande jamais un produit hors stock.',
    "- Si le budget du client semble insuffisant, dis-le franchement et propose l'option troc ou une alternative plus réaliste.",
    '- Quand tu proposes des produits, limite-toi à 3 recommandations maximum.',
    '- Priorise les produits dont le nom, la catégorie ou les specs correspondent réellement à la demande.',
    "- Si le catalogue fourni n'a rien de bon, pose une question de qualification au lieu d'inventer.",
    '- Base-toi sur les prix et le stock fournis ci-dessous, pas sur de la connaissance générale.',
    '',
    `DEMANDE CLIENT COURANTE: ${userMessage}`,
    '',
    'CATALOGUE PERTINENT:',
    catalogBlock,
    '',
    'FORMAT ATTENDU:',
    '- réponse courte et concrète',
    '- 1 question max si tu manques d’info',
    '- mentionne les prix quand tu cites des produits',
    '- rappelle discrètement l’option troc si pertinent',
  ].join('\n');
};

export const mapProductRow = (row: Record<string, unknown>): CatalogProduct => ({
  id: String(row.id ?? ''),
  name: String(row.name ?? ''),
  description: row.description ? String(row.description) : undefined,
  price: Number(row.price ?? 0),
  category: row.category ? String(row.category) : undefined,
  brand: row.brand ? String(row.brand) : undefined,
  productRange: row.product_range != null || row.productRange != null
    ? String(row.product_range ?? row.productRange)
    : undefined,
  condition: row.condition ? String(row.condition) : undefined,
  stock: Number(row.stock ?? 0),
  isPromo: Boolean(row.is_promo ?? row.isPromo),
  isFeatured: Boolean(row.is_featured ?? row.isFeatured),
  reviewShort: row.review_short != null || row.reviewShort != null
    ? String(row.review_short ?? row.reviewShort)
    : undefined,
  specs: Array.isArray(row.specs) ? row.specs as { label: string; value: string }[] : [],
  pros: Array.isArray(row.pros) ? row.pros as string[] : [],
  cons: Array.isArray(row.cons) ? row.cons as string[] : [],
});

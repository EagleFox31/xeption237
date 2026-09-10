/**
 * Source de prix Shopify — titres et prix appariés à la source.
 *
 * Pourquoi ce module existe : `market-price-intel` scrapait le HTML de
 * kmerphone, repérait un prix puis prenait ±220 caractères autour comme
 * contexte. Sur une page de résultats, cette fenêtre chevauche les fiches
 * voisines, donc le prix pouvait être attribué au produit d'à côté (constaté le
 * 2026-08-24 sur un Tecno Camon 30). L'extracteur par blocs censé éviter ça ne
 * se déclenchait jamais : il cherche `class="*product*"`, kmerphone utilise
 * `km-fd__card`.
 *
 * kmerphone tourne sous Shopify, qui expose des API JSON publiques. Titre, prix
 * et prix barré arrivent déjà associés : il n'y a plus rien à deviner.
 *
 * Écrit en JavaScript pur, sans syntaxe TypeScript, pour être importé tel quel
 * par l'Edge Function (Deno) ET par les scripts Node. Une seule implémentation,
 * donc aucune dérive possible entre les deux — contrairement à `imeiValidation`,
 * qui existe en double.
 *
 * @typedef {Object} ShopifyOffer
 * @property {number}      price        Prix courant en XAF
 * @property {number|null} comparePrice Prix barré (référence neuf) si présent
 * @property {string}      title        Titre exact du produit
 * @property {string}      url          Lien vers la fiche
 * @property {string}      source       Nom d'hôte de la boutique
 * @property {boolean}     available    Variante en stock
 * @property {string}      vendor       Marque déclarée par la boutique
 */

/**
 * Qualificatifs de gamme : ce qui separe un « iPhone 13 » d'un « iPhone 13 Pro Max ».
 *
 * Le score de pertinence historique les traite comme des jetons FAIBLES, parce
 * qu'il travaillait sur des extraits de scraping bruites ou exiger une
 * correspondance stricte aurait tout rejete. Sur un titre exact venu d'une API,
 * l'inverse est vrai : un qualificatif present d'un cote et absent de l'autre
 * designe un AUTRE appareil, a un autre prix.
 *
 * Constate le 2026-08-25 : sans ce garde-fou, une recherche « iPhone 13 »
 * remontait les Pro et Pro Max, et la reference passait de 245 000 a 389 945 XAF.
 */
const RANGE_QUALIFIERS = ['pro', 'max', 'plus', 'ultra', 'mini', 'lite', 'fe', 'air'];

const qualifiersIn = (value) => {
  const words = String(value ?? '').toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);
  return new Set(RANGE_QUALIFIERS.filter((q) => words.includes(q)));
};

/**
 * Le titre designe-t-il la meme gamme que le modele demande ?
 * Symetrique : « iPhone 13 » ne doit pas remonter un Pro, et « iPhone 13 Pro »
 * ne doit pas remonter le modele de base.
 */
export const sameRange = (title, requestedModel) => {
  const inTitle = qualifiersIn(title);
  const asked = qualifiersIn(requestedModel);
  if (inTitle.size !== asked.size) return false;
  for (const q of asked) if (!inTitle.has(q)) return false;
  return true;
};

const DEFAULT_TIMEOUT_MS = 9000;

const BROWSER_HEADERS = {
  // Les boutiques derrière Cloudflare rejettent les UA non-navigateur.
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

/**
 * Prix Shopify.
 *
 * Vérifié sur les deux endpoints le 2026-08-25 : les valeurs sont des XAF en
 * clair, sous forme de chaîne (« 207990 », « 259990 »), jamais des centimes.
 *
 * Une première version divisait par 100 les montants « ronds » au-dessus d'un
 * million, en supposant des centimes. Un téléphone à 1 200 000 FCFA aurait été
 * ramené à 12 000. Aucune conversion : on lit ce que la boutique annonce.
 */
const toXaf = (raw) => {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
};

const fetchJson = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim().startsWith('{')) return null;
    return JSON.parse(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const normalizeProduct = (product, origin, host) => {
  const variant = Array.isArray(product?.variants) ? product.variants[0] : null;
  const price = toXaf(variant?.price ?? product?.price);
  if (price == null) return null;

  const handle = product?.handle ? `${origin}/products/${product.handle}` : origin;

  return {
    price,
    comparePrice: toXaf(variant?.compare_at_price ?? product?.compare_at_price),
    title: String(product?.title ?? '').trim(),
    url: product?.url ? `${origin}${product.url}` : handle,
    source: host,
    available: variant?.available !== false,
    vendor: String(product?.vendor ?? '').trim(),
  };
};

const hostOf = (origin) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
};

/**
 * Recherche par requête libre via `/search/suggest.json`.
 * @returns {Promise<ShopifyOffer[]>} vide si la boutique n'est pas Shopify.
 */
export const searchShopify = async (origin, query, options = {}) => {
  const limit = options.limit ?? 10;
  const url =
    `${origin}/search/suggest.json?q=${encodeURIComponent(query)}` +
    `&resources[type]=product&resources[limit]=${limit}`;

  const data = await fetchJson(url, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const products = data?.resources?.results?.products;
  if (!Array.isArray(products)) return [];

  const host = hostOf(origin);
  return products.map((p) => normalizeProduct(p, origin, host)).filter(Boolean);
};

/**
 * Contenu d'une collection — sert notamment aux appareils reconditionnés, qui
 * sont la seule donnée d'OCCASION locale trouvée sur le marché camerounais.
 * @returns {Promise<ShopifyOffer[]>}
 */
export const fetchShopifyCollection = async (origin, handle, options = {}) => {
  const limit = options.limit ?? 50;
  const url = `${origin}/collections/${handle}/products.json?limit=${limit}`;

  const data = await fetchJson(url, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!Array.isArray(data?.products)) return [];

  const host = hostOf(origin);
  return data.products.map((p) => normalizeProduct(p, origin, host)).filter(Boolean);
};

/**
 * Boutiques Shopify connues du marché camerounais.
 * `refurbishedCollection` : collection d'occasion, quand la boutique en tient une.
 */
export const SHOPIFY_SOURCES = [
  {
    origin: 'https://kmerphone.com',
    name: 'kmerphone.com',
    refurbishedCollection: 'smartphones-reconditionnes',
  },
];

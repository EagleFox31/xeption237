/**
 * Contrôles SEO de non-régression sur le HTML prérendu (utilisés par scripts/prerender.mjs,
 * testés dans tests/unit/seoChecks.test.ts). Chaque fonction renvoie une liste d'erreurs lisibles.
 */

/** Nombre de vraies balises <h1> (les variantes role="heading" ne comptent pas). */
export const countH1 = (html) => (html.match(/<h1\b/gi) || []).length;

export const checkSingleH1 = (html) => {
  const n = countH1(html);
  return n === 1 ? [] : [`${n} balise(s) <h1> (attendu : 1)`];
};

const jsonLdBlocks = (html) =>
  [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => {
    try {
      const data = JSON.parse(m[1]);
      return Array.isArray(data) ? data : [data];
    } catch {
      return [];
    }
  });

const flattenGraph = (nodes) => nodes.flatMap((n) => (n && Array.isArray(n['@graph']) ? n['@graph'] : [n]));

/** Champs Offer exigés par Google (extraits marchands, fiches gratuites Merchant Center). */
const REQUIRED_OFFER_FIELDS = ['price', 'priceCurrency', 'availability', 'itemCondition', 'seller', 'hasMerchantReturnPolicy'];

export const checkProductOffer = (html) => {
  const product = flattenGraph(jsonLdBlocks(html)).find((n) => n && n['@type'] === 'Product');
  if (!product) return ['JSON-LD Product absent ou illisible'];
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  if (!offer) return ['Product sans offers'];
  const missing = REQUIRED_OFFER_FIELDS.filter((f) => offer[f] === undefined || offer[f] === null || offer[f] === '');
  const errors = missing.length ? [`Offer incomplet (${missing.join(', ')})`] : [];
  if (offer.priceCurrency && offer.priceCurrency !== 'XAF') errors.push(`priceCurrency ${offer.priceCurrency} (attendu XAF)`);
  return errors;
};

/** llms.txt : présent, avec l'identité et l'adresse de la boutique. */
export const checkLlmsTxt = (text) => {
  if (!text) return ['dist/llms.txt absent'];
  const errors = [];
  if (!text.startsWith('# ')) errors.push('llms.txt : titre H1 Markdown absent');
  if (!text.includes('Mfoundi Mall')) errors.push("llms.txt : adresse boutique absente");
  if (!/\]\(https:\/\/www\.xeptionetwork\.shop\//.test(text)) errors.push('llms.txt : aucun lien absolu vers le site');
  return errors;
};

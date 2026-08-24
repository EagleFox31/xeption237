// @ts-ignore
const Deno = globalThis.Deno;

import { assertAiRateLimit, rateLimitJsonResponse } from '../_shared/rateLimit.ts';
import { parseModelChain, DEFAULT_TEXT_MODELS, shouldTryNextModel } from '../_shared/geminiModels.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 9000;
const GEMINI_TIMEOUT_MS = 12000;
const CACHE_TTL_HOURS = 12;
const MIN_PRICE_XAF = 20000;
const MAX_PRICE_XAF = 3000000;
// Chaine de modeles : gemini-2.0-flash a ete retire par Google le 2026-08-24 et
// ce filtre tournait donc dans le vide (cf. plus bas, `if (!res.ok) return offers`).
const GEMINI_MODELS = parseModelChain(Deno.env.get('GEMINI_MODELS'), DEFAULT_TEXT_MODELS);
const SNIPPET_RADIUS = 220;
const MAX_OFFERS_PER_SOURCE = 40;
const DDG_MAX_LINKS = 6;
const DDG_PAGE_FETCH_LIMIT = 4;

// Vrai UA navigateur : les sites marchands (Cloudflare) bloquent les UA non-navigateur.
// L'ancien 'Mozilla/5.0 (XEPTION Market Intel)' se faisait jeter → 0 offre.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

const MODEL_WEAK_TOKENS = new Set([
  'pro',
  'plus',
  'ultra',
  'max',
  'mini',
  'lite',
  'edition',
  'series',
  'phone',
  'smartphone',
  'mobile',
  '5g',
  '4g',
  'go',
  'gb',
  'ram',
]);

const HARD_EXCLUDE_TOKENS = new Set([
  'coque',
  'etui',
  'housse',
  'cover',
  'case',
  'chargeur',
  'cable',
  'adaptateur',
  'ecouteur',
  'ecouteurs',
  'buds',
  'airpods',
  'film',
  'protector',
  'protecteur',
  'tablette',
  'tablet',
  'laptop',
  'ordinateur',
  'pc',
  'television',
  'tv',
  'montre',
  'watch',
]);

type Offer = {
  price: number;
  source: string;
  url: string;
  snippet: string;
  relevance: number;
};

type MatchContext = {
  brandTokens: string[];
  modelTokens: string[];
  significantModelTokens: string[];
  anchorTokens: string[];
  storageTokens: string[];
  ramTokens: string[];
};

type CacheRow = {
  model_key: string;
  country_code: string;
  brand: string;
  model: string;
  storage?: string | null;
  ram?: string | null;
  currency: string;
  reference_price: number;
  low_prices: number[];
  high_prices: number[];
  offers_json: any[];
  source_count: number;
  confidence: number;
  updated_at: string;
  expires_at: string;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalize = (v?: string) =>
  (v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const unique = (values: string[]): string[] => [...new Set(values)];

const isGenericNumericToken = (token: string): boolean =>
  /^(?:4g|5g|6g|\d+(?:gb|go|tb))$/.test(token);

const toModelKey = (brand: string, model: string, storage?: string, ram?: string, country = 'CM') =>
  [
    normalize(country),
    normalize(brand),
    normalize(model),
    normalize(storage || ''),
    normalize(ram || ''),
  ]
    .filter(Boolean)
    .join('|');

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const percentile = (sorted: number[], p: number): number => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const ratio = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * ratio;
};

const buildMatchContext = (
  brand: string,
  model: string,
  storage?: string,
  ram?: string,
): MatchContext => {
  const brandTokens = unique(normalize(brand).split(' ').filter((t) => t.length >= 2));
  const modelTokens = unique(normalize(model).split(' ').filter((t) => t.length >= 2));
  const significantModelTokens = unique(
    modelTokens.filter(
      (token) =>
        (/\d/.test(token) && !isGenericNumericToken(token)) ||
        (!MODEL_WEAK_TOKENS.has(token) && token.length >= 4),
    ),
  );
  let anchorTokens = unique(
    modelTokens.filter(
      (token) =>
        (/[a-z]+\d+/.test(token) || /\d+[a-z]+/.test(token)) &&
        !isGenericNumericToken(token) &&
        !MODEL_WEAK_TOKENS.has(token),
    ),
  );
  if (!anchorTokens.length) {
    anchorTokens = significantModelTokens.length
      ? [significantModelTokens.sort((a, b) => b.length - a.length)[0]]
      : [];
  }
  const storageTokens = unique(normalize(storage || '').split(' ').filter((t) => t.length >= 2));
  const ramTokens = unique(normalize(ram || '').split(' ').filter((t) => t.length >= 2));

  return {
    brandTokens,
    modelTokens,
    significantModelTokens: significantModelTokens.length ? significantModelTokens : modelTokens,
    anchorTokens,
    storageTokens,
    ramTokens,
  };
};

const sourceConfigs = (query: string) => {
  const encoded = encodeURIComponent(query);
  // jumia.cm retiré : Jumia Cameroun a fermé en novembre 2019 (domaine mort).
  // kmerphone : prix en HTML serveur (scrapable). glotelho : rendu JS (souvent vide en server-side).
  return [
    {
      name: 'kmerphone.com',
      url: `https://kmerphone.com/?s=${encoded}&post_type=product`,
    },
    {
      name: 'glotelho.cm',
      url: `https://glotelho.cm/?s=${encoded}&post_type=product`,
    },
  ];
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');

const normalizeDdgHref = (rawHref: string): string => {
  const decodedHref = decodeHtmlEntities(rawHref).trim();
  if (!decodedHref) return '';

  const href = decodedHref.startsWith('//') ? `https:${decodedHref}` : decodedHref;
  try {
    const parsed = new URL(href, 'https://duckduckgo.com');
    const redirect = parsed.searchParams.get('uddg');
    if (redirect) return decodeURIComponent(redirect);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
    return '';
  } catch {
    return '';
  }
};

const htmlToText = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const PRICE_REGEXES = [
  /(\d{2,3}(?:[ .,\u202f]\d{3}){1,3})\s*(?:FCFA|XAF|F\s*CFA|francs?\s*CFA)/gi,
  /(?:FCFA|XAF|F\s*CFA)\s*(\d{2,3}(?:[ .,\u202f]\d{3}){1,3})/gi,
];

const parsePrice = (raw: string): number => {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
};

const extractPriceCandidates = (text: string): number[] => {
  const candidates = new Set<number>();
  for (const regex of PRICE_REGEXES) {
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[1] || '';
      const price = parsePrice(raw);
      if (!Number.isFinite(price) || price < MIN_PRICE_XAF || price > MAX_PRICE_XAF) continue;
      candidates.add(price);
      if (candidates.size >= 6) break;
    }
  }
  return Array.from(candidates);
};

const countMatches = (text: string, tokens: string[]): number => {
  let count = 0;
  for (const token of tokens) {
    if (text.includes(token)) count += 1;
  }
  return count;
};

const hasHardExcludedToken = (snippet: string): boolean => {
  const s = normalize(snippet);
  for (const token of HARD_EXCLUDE_TOKENS) {
    if (s.includes(token)) return true;
  }
  return false;
};

const extractModelCodeTokens = (text: string): string[] => {
  const matches = text.match(/\b[a-z]{1,3}\d{1,3}[a-z]?\b/g) || [];
  return unique(matches.filter((token) => !isGenericNumericToken(token)));
};

const computeRelevance = (snippet: string, ctx: MatchContext, strict = true): number => {
  const s = normalize(snippet);
  if (!s) return 0;
  if (hasHardExcludedToken(s)) return 0;

  const brandMatchCount = countMatches(s, ctx.brandTokens);
  if (brandMatchCount === 0) return 0;

  const significantMatchCount = countMatches(s, ctx.significantModelTokens);
  const modelMatchCount = countMatches(s, ctx.modelTokens);
  const anchorMatchCount = countMatches(s, ctx.anchorTokens);

  if (strict) {
    if (ctx.anchorTokens.length > 0 && anchorMatchCount === 0) return 0;

    if (ctx.anchorTokens.length > 0) {
      const anchorSet = new Set(ctx.anchorTokens);
      const codeTokens = extractModelCodeTokens(s);
      const conflictingCodes = codeTokens.filter((token) => !anchorSet.has(token));
      if (conflictingCodes.length > 0 && anchorMatchCount <= 1) return 0;
    }
  } else if (modelMatchCount <= 0) {
    return 0;
  }

  const minSignificantMatches = ctx.significantModelTokens.length >= 2 ? 2 : 1;
  if (significantMatchCount < minSignificantMatches && modelMatchCount < 2) return 0;

  const storageMatchCount = countMatches(s, ctx.storageTokens);
  const ramMatchCount = countMatches(s, ctx.ramTokens);

  return (
    brandMatchCount * 2 +
    anchorMatchCount * 5 +
    significantMatchCount * 4 +
    modelMatchCount +
    Math.min(1, storageMatchCount) +
    Math.min(1, ramMatchCount)
  );
};

const extractOffersFromText = (
  text: string,
  source: string,
  url: string,
  ctx: MatchContext,
  strict = true,
): Offer[] => {
  const offers: Offer[] = [];
  const seen = new Set<string>();
  for (const regex of PRICE_REGEXES) {
    let m: RegExpExecArray | null = null;
    while ((m = regex.exec(text)) !== null) {
      const raw = m[1] || '';
      const price = parsePrice(raw);
      if (!Number.isFinite(price) || price < MIN_PRICE_XAF || price > MAX_PRICE_XAF) continue;

      if (ctx.anchorTokens.length > 0) {
        const microStart = Math.max(0, m.index - 60);
        const microEnd = Math.min(text.length, m.index + 60);
        const microSnippet = normalize(text.slice(microStart, microEnd));
        const microAnchorMatches = countMatches(microSnippet, ctx.anchorTokens);
        if (microAnchorMatches === 0) continue;
      }

      const start = Math.max(0, m.index - SNIPPET_RADIUS);
      const end = Math.min(text.length, m.index + SNIPPET_RADIUS);
      const snippet = text.slice(start, end);
      const relevance = computeRelevance(snippet, ctx, strict);
      if (relevance <= 0) continue;

      const key = `${source}|${price}|${normalize(snippet).slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      offers.push({ price, source, url, snippet, relevance });
      if (offers.length >= MAX_OFFERS_PER_SOURCE) break;
    }
  }

  return offers;
};

const extractOffersFromHtmlBlocks = (
  html: string,
  source: string,
  url: string,
  ctx: MatchContext,
): Offer[] => {
  const offers: Offer[] = [];
  const seen = new Set<string>();

  const blockRegexes = [
    /<li[^>]*class="[^"]*product[^"]*"[\s\S]*?<\/li>/gi,
    /<article[^>]*class="[^"]*product[^"]*"[\s\S]*?<\/article>/gi,
    /<div[^>]*class="[^"]*product[^"]*"[\s\S]*?<\/div>/gi,
  ];

  for (const blockRegex of blockRegexes) {
    let blockMatch: RegExpExecArray | null = null;
    while ((blockMatch = blockRegex.exec(html)) !== null) {
      const blockHtml = blockMatch[0] || '';
      const blockText = htmlToText(blockHtml);
      if (!blockText) continue;

      const relevance = computeRelevance(blockText, ctx, true);
      if (relevance <= 0) continue;

      const prices = extractPriceCandidates(blockText);
      if (!prices.length) continue;

      for (const price of prices) {
        const key = `${source}|${price}|${normalize(blockText).slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        offers.push({
          price,
          source,
          url,
          snippet: blockText.slice(0, 260),
          relevance,
        });
      }

      if (offers.length >= MAX_OFFERS_PER_SOURCE) break;
    }

    if (offers.length > 0) break;
  }

  return offers;
};

type DuckDuckGoHit = {
  title: string;
  snippet: string;
  url: string;
};

const parseDuckDuckGoHits = (html: string): DuckDuckGoHit[] => {
  const hits: DuckDuckGoHit[] = [];
  const regex =
    /<div class="result results_links[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi;

  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html)) !== null) {
    const link = normalizeDdgHref(match[1] || '');
    if (!/^https?:\/\//i.test(link)) continue;

    const title = htmlToText(match[2] || '');
    const snippet = htmlToText(match[3] || '');
    if (!title && !snippet) continue;

    hits.push({ title, snippet, url: link });
    if (hits.length >= DDG_MAX_LINKS) break;
  }
  return hits;
};

const offersFromSearchSnippet = (hit: DuckDuckGoHit, ctx: MatchContext): Offer[] => {
  const text = `${hit.title} ${hit.snippet}`.trim();
  const relevance = computeRelevance(text, ctx, true);
  if (relevance <= 0) return [];

  const prices = extractPriceCandidates(text);
  if (!prices.length) return [];

  return prices.map((price) => ({
    price,
    source: `ddg:${new URL(hit.url).hostname}`,
    url: hit.url,
    snippet: text.slice(0, 260),
    relevance: relevance + 1,
  }));
};

const scrapeOffersViaDuckDuckGo = async (query: string, ctx: MatchContext): Promise<Offer[]> => {
  try {
    const encoded = encodeURIComponent(query);
    const ddgRes = await fetchWithTimeout(`https://duckduckgo.com/html/?q=${encoded}`, {
      headers: BROWSER_HEADERS,
    });
    if (!ddgRes.ok) return [];

    const ddgHtml = await ddgRes.text();
    const hits = parseDuckDuckGoHits(ddgHtml);
    if (!hits.length) return [];

    const snippetOffers = hits.flatMap((hit) => offersFromSearchSnippet(hit, ctx));

    const fetchableHits = hits.slice(0, DDG_PAGE_FETCH_LIMIT);
    const pageOffersNested = await Promise.all(
      fetchableHits.map(async (hit) => {
        try {
          const pageRes = await fetchWithTimeout(hit.url, {
            headers: BROWSER_HEADERS,
          });
          if (!pageRes.ok) return [] as Offer[];
          const pageHtml = await pageRes.text();
          const pageText = htmlToText(pageHtml);
          return extractOffersFromText(
            pageText,
            `ddg:${new URL(hit.url).hostname}`,
            hit.url,
            ctx,
            true,
          );
        } catch {
          return [] as Offer[];
        }
      }),
    );

    const all = [...snippetOffers, ...pageOffersNested.flat()];
    const bestByKey = new Map<string, Offer>();
    for (const offer of all) {
      const key = `${offer.source}|${offer.price}`;
      const prev = bestByKey.get(key);
      if (!prev || offer.relevance > prev.relevance) bestByKey.set(key, offer);
    }
    return Array.from(bestByKey.values());
  } catch {
    return [];
  }
};

const scrapeOffers = async (
  brand: string,
  model: string,
  storage?: string,
  ram?: string,
): Promise<Offer[]> => {
  const query = [brand, model, storage, ram, 'prix', 'cameroun'].filter(Boolean).join(' ');
  const configs = sourceConfigs(query);
  const ctx = buildMatchContext(brand, model, storage, ram);

  const sourcePages = await Promise.all(
    configs.map(async (cfg) => {
      try {
        const res = await fetchWithTimeout(cfg.url, {
          headers: BROWSER_HEADERS,
        });
        if (!res.ok) return { cfg, text: '' };
        const html = await res.text();
        const blockOffers = extractOffersFromHtmlBlocks(html, cfg.name, cfg.url, ctx);
        if (blockOffers.length > 0) {
          return { cfg, text: '', blockOffers };
        }
        const text = htmlToText(html);
        return { cfg, text, blockOffers: [] as Offer[] };
      } catch {
        return { cfg, text: '', blockOffers: [] as Offer[] };
      }
    }),
  );

  const blockOffers = sourcePages.flatMap((page) => page.blockOffers);
  if (blockOffers.length > 0) return blockOffers;

  const strictOffers = sourcePages.flatMap(({ cfg, text }) =>
    text ? extractOffersFromText(text, cfg.name, cfg.url, ctx, true) : [],
  );

  let all = strictOffers.length
    ? strictOffers
    : sourcePages.flatMap(({ cfg, text }) =>
        text ? extractOffersFromText(text, cfg.name, cfg.url, ctx, false) : [],
      );

  if (all.length < 3) {
    const ddgOffers = await scrapeOffersViaDuckDuckGo(query, ctx);
    if (ddgOffers.length > 0) {
      all = [...all, ...ddgOffers];
    }
  }

  // Deduplicate by source/price and keep best relevance.
  const bestByKey = new Map<string, Offer>();
  for (const offer of all) {
    const key = `${offer.source}|${offer.price}`;
    const prev = bestByKey.get(key);
    if (!prev || offer.relevance > prev.relevance) bestByKey.set(key, offer);
  }

  return Array.from(bestByKey.values());
};

const filterOutlierOffers = (offers: Offer[]): Offer[] => {
  if (offers.length < 5) return offers;
  const sortedPrices = offers.map((o) => o.price).sort((a, b) => a - b);
  const q1 = percentile(sortedPrices, 0.25);
  const q3 = percentile(sortedPrices, 0.75);
  const iqr = q3 - q1;

  if (!Number.isFinite(iqr) || iqr <= 0) return offers;

  const min = q1 - 1.5 * iqr;
  const max = q3 + 1.5 * iqr;
  const filtered = offers.filter((o) => o.price >= min && o.price <= max);
  return filtered.length >= 3 ? filtered : offers;
};

const filterOffersWithGemini = async (
  offers: Offer[],
  brand: string,
  model: string,
  storage: string,
  ram: string,
  apiKey: string,
): Promise<Offer[]> => {
  if (!offers.length) return offers;

  const compact = offers.slice(0, 30).map((o, i) => ({
    i,
    price: o.price,
    source: o.source,
    snippet: o.snippet.slice(0, 220),
  }));

  const prompt = [
    'You are a strict market pricing filter for used devices in Cameroon.',
    `Target device: ${brand} ${model} ${storage || ''} ${ram || ''}`.trim(),
    'Given scraped offers, keep only relevant listings for exactly the same device family.',
    'Exclude accessories, laptops, tablets, earbuds, chargers, and unrelated models.',
    'Return JSON only: {"keep":[indices...]}',
    'If uncertain, drop the offer.',
    JSON.stringify(compact),
  ].join('\n');

  // Ce filtre echoue OUVERT : sans lui, les offres non pertinentes (accessoires,
  // chargeurs, autres modeles) entrent dans le prix de reference, qui ancre les
  // offres de reprise. Un modele mort ici ne se voyait donc pas.
  let res: Response | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const attempt = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  keep: {
                    type: 'ARRAY',
                    items: { type: 'INTEGER' },
                  },
                },
                required: ['keep'],
              },
            },
          }),
        },
        GEMINI_TIMEOUT_MS,
      );

      if (attempt.ok) { res = attempt; break; }

      console.warn('[market-price-intel] filtre indisponible', model, attempt.status);
      if (!shouldTryNextModel(attempt.status)) break;
    } catch (error: any) {
      console.warn('[market-price-intel] filtre en echec', model, error?.message ?? error);
    }
  }

  if (!res) return offers;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return offers;

  try {
    const parsed = JSON.parse(text);
    const keep = Array.isArray(parsed?.keep) ? parsed.keep : [];
    const set = new Set<number>(keep.filter((x: unknown) => Number.isInteger(x) && Number(x) >= 0));
    const filtered = offers.filter((_, idx) => set.has(idx));
    if (filtered.length) return filtered;
    return offers.filter((o) => o.relevance >= 7).slice(0, 8);
  } catch {
    return offers;
  }
};

const dbGetCache = async (
  modelKey: string,
  countryCode: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<CacheRow | null> => {
  try {
    const nowIso = new Date().toISOString();
    const url =
      `${supabaseUrl}/rest/v1/market_price_cache` +
      `?model_key=eq.${encodeURIComponent(modelKey)}` +
      `&country_code=eq.${encodeURIComponent(countryCode)}` +
      `&expires_at=gt.${encodeURIComponent(nowIso)}` +
      `&select=*` +
      `&limit=1`;

    const res = await fetchWithTimeout(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    return rows[0] as CacheRow;
  } catch {
    return null;
  }
};

const dbUpsertCache = async (
  row: Partial<CacheRow>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> => {
  try {
    await fetchWithTimeout(`${supabaseUrl}/rest/v1/market_price_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
  } catch {
    // non-blocking
  }
};

const compactOffer = (offer: Offer) => ({
  price: offer.price,
  source: offer.source,
  url: offer.url,
  relevance: offer.relevance,
  snippet: offer.snippet.slice(0, 220),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const deviceBrand = String(body?.deviceBrand || '').trim();
    const deviceModel = String(body?.deviceModel || '').trim();
    const deviceStorage = String(body?.deviceStorage || '').trim();
    const deviceRam = String(body?.deviceRam || '').trim();
    const countryCode = String(body?.countryCode || 'CM').trim().toUpperCase();
    const forceRefresh = Boolean(body?.forceRefresh);

    if (!deviceBrand || !deviceModel) {
      return new Response(
        JSON.stringify({ error: 'deviceBrand et deviceModel requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const sessionKey =
      typeof body?.sessionKey === 'string' ? body.sessionKey.trim() : null;
    const rateLimit = await assertAiRateLimit(req, 'market-price-intel', sessionKey);
    if (!rateLimit.allowed) {
      return rateLimitJsonResponse(rateLimit, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

    const modelKey = toModelKey(deviceBrand, deviceModel, deviceStorage, deviceRam, countryCode);

    if (!forceRefresh && supabaseUrl && serviceKey) {
      const cached = await dbGetCache(modelKey, countryCode, supabaseUrl, serviceKey);
      if (cached) {
        const cachedOffers = Array.isArray(cached.offers_json) ? cached.offers_json : [];
        const lowOffers = cachedOffers.slice(0, 3);
        const highOffers = [...cachedOffers].slice(-3).reverse();

        return new Response(
          JSON.stringify({
            cached: true,
            modelKey,
            referencePrice: cached.reference_price,
            lowPrices: cached.low_prices || [],
            highPrices: cached.high_prices || [],
            lowOffers,
            highOffers,
            offersCount: cachedOffers.length,
            sourceCount: cached.source_count || 0,
            confidence: Number(cached.confidence || 0),
            currency: cached.currency || 'XAF',
            countryCode: cached.country_code || countryCode,
            strategy: 'cache',
            offers: cachedOffers,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
    }

    let offers = await scrapeOffers(deviceBrand, deviceModel, deviceStorage, deviceRam);
    offers = offers.sort((a, b) => b.relevance - a.relevance || a.price - b.price).slice(0, 30);

    if (geminiKey) {
      offers = await filterOffersWithGemini(
        offers,
        deviceBrand,
        deviceModel,
        deviceStorage,
        deviceRam,
        geminiKey,
      );
    }

    offers = offers
      .filter((o) => o.price >= MIN_PRICE_XAF && o.price <= MAX_PRICE_XAF)
      .sort((a, b) => a.price - b.price);
    offers = filterOutlierOffers(offers).sort((a, b) => a.price - b.price);

    const prices = offers.map((o) => o.price);
    const lowPrices = prices.slice(0, 3);
    const highPrices = [...prices].slice(-3).reverse();
    const referencePrice = median(prices);
    const sourceCount = new Set(offers.map((o) => o.source)).size;

    const averageRelevance =
      offers.length > 0 ? offers.reduce((acc, o) => acc + o.relevance, 0) / offers.length : 0;
    const confidence = Math.max(
      0,
      Math.min(
        0.95,
        0.30 +
          Math.min(0.25, offers.length * 0.04) +
          Math.min(0.25, sourceCount * 0.1) +
          Math.min(0.15, averageRelevance * 0.015),
      ),
    );

    const persistedOffers = offers.slice(0, 20).map(compactOffer);
    const lowOffers = persistedOffers.slice(0, 3);
    const highOffers = [...persistedOffers].slice(-3).reverse();
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString();

    if (supabaseUrl && serviceKey) {
      await dbUpsertCache(
        {
          model_key: modelKey,
          country_code: countryCode,
          brand: deviceBrand,
          model: deviceModel,
          storage: deviceStorage || null,
          ram: deviceRam || null,
          currency: 'XAF',
          reference_price: referencePrice || 0,
          low_prices: lowPrices,
          high_prices: highPrices,
          offers_json: persistedOffers,
          source_count: sourceCount,
          confidence,
          updated_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        supabaseUrl,
        serviceKey,
      );
    }

    return new Response(
      JSON.stringify({
        cached: false,
        modelKey,
        referencePrice: referencePrice || 0,
        lowPrices,
        highPrices,
        lowOffers,
        highOffers,
        offersCount: offers.length,
        sourceCount,
        confidence,
        currency: 'XAF',
        countryCode,
        strategy: geminiKey ? 'live_scrape_plus_ai' : 'live_scrape',
        offers: persistedOffers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

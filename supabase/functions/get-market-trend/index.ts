// @ts-ignore
const Deno = globalThis.Deno;

import { buildModelKey } from '../_shared/marketKey.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const CACHE_TTL_DAYS = 7;
const FETCH_TIMEOUT_MS = 8000;
// Comparaisons : on cherche des snapshots récents (≤ 30j), anciens (≥ 90j).
const RECENT_WINDOW_DAYS = 30;
const OLD_WINDOW_DAYS_MIN = 90;
const OLD_WINDOW_DAYS_MAX = 240;
// Seuils pour qualifier la tendance (±5 % = stable, >5 % = mouvement).
const TREND_STABLE_THRESHOLD = 0.05;

// ─── Types ───────────────────────────────────────────────────────────────────

type TrendLabel = 'rising' | 'stable' | 'falling' | 'insufficient_data';

interface MarketTrend {
  label:        TrendLabel;
  strength:     number;
  confidence:   number;
  source_chain: string[];
  message_fr:   string;
  raw?:         Record<string, unknown>;
}

interface PriceSnapshot {
  source:        string;
  snapshot_date: string;
  price_xaf:     number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

// buildModelKey importé depuis ../_shared/marketKey.ts (clé partagée avec snapshot-market-prices)

// ─── Cache DB ────────────────────────────────────────────────────────────────

const readCache = async (
  modelKey: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<MarketTrend | null> => {
  try {
    const url =
      `${supabaseUrl}/rest/v1/market_trend_cache` +
      `?model_key=eq.${encodeURIComponent(modelKey)}` +
      `&expires_at=gt.${encodeURIComponent(new Date().toISOString())}` +
      `&select=*&limit=1`;
    const res = await fetchWithTimeout(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    const r = rows[0];
    return {
      label:        r.trend_label,
      strength:     Number(r.trend_strength ?? 0),
      confidence:   Number(r.confidence ?? 0),
      source_chain: Array.isArray(r.source_chain) ? r.source_chain : [],
      message_fr:   String(r.message_fr ?? ''),
      raw:          r.raw ?? undefined,
    };
  } catch {
    return null;
  }
};

const writeCache = async (
  modelKey: string,
  trend: MarketTrend,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> => {
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    await fetchWithTimeout(`${supabaseUrl}/rest/v1/market_trend_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        model_key:      modelKey,
        trend_label:    trend.label,
        trend_strength: trend.strength,
        source_chain:   trend.source_chain,
        confidence:     trend.confidence,
        message_fr:     trend.message_fr,
        expires_at:     expiresAt,
        raw:            trend.raw ?? null,
      }),
    });
  } catch {
    // non-bloquant
  }
};

const readSnapshots = async (
  modelKey: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<PriceSnapshot[]> => {
  try {
    const url =
      `${supabaseUrl}/rest/v1/market_price_snapshots` +
      `?model_key=eq.${encodeURIComponent(modelKey)}` +
      `&select=source,snapshot_date,price_xaf` +
      `&order=snapshot_date.desc&limit=20`;
    const res = await fetchWithTimeout(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows as PriceSnapshot[] : [];
  } catch {
    return [];
  }
};

const writeSnapshot = async (
  args: { modelKey: string; source: string; sourceUrl?: string; snapshotDate: string; priceXaf: number; confidence: number },
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> => {
  try {
    await fetchWithTimeout(`${supabaseUrl}/rest/v1/market_price_snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        model_key:     args.modelKey,
        source:        args.source,
        source_url:    args.sourceUrl ?? null,
        snapshot_date: args.snapshotDate,
        price_xaf:     args.priceXaf,
        country_code:  'CM',
        confidence:    args.confidence,
      }),
    });
  } catch {
    // non-bloquant
  }
};

const writeDemandSignal = async (
  args: { modelKey: string; source: string; periodStart: string; periodEnd: string; interestScore: number },
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> => {
  try {
    await fetchWithTimeout(`${supabaseUrl}/rest/v1/market_demand_signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        model_key:      args.modelKey,
        source:         args.source,
        period_start:   args.periodStart,
        period_end:     args.periodEnd,
        interest_score: args.interestScore,
        country_code:   'CM',
      }),
    });
  } catch {
    // non-bloquant
  }
};

// ─── Source 1 : Wayback Machine ──────────────────────────────────────────────
//
// On interroge l'API CDX pour trouver des captures Jumia archivées à différentes
// dates, puis on fetch les HTML et on parse les prix.

interface CdxEntry { timestamp: string; original: string; }

const queryCdx = async (urlPattern: string, fromYearMonth: string, toYearMonth: string): Promise<CdxEntry[]> => {
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx` +
    `?url=${encodeURIComponent(urlPattern)}` +
    `&from=${fromYearMonth}&to=${toYearMonth}` +
    `&output=json&filter=statuscode:200&limit=5&collapse=timestamp:8`;
  try {
    const res = await fetchWithTimeout(cdxUrl);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 2) return [];
    // Première ligne = header
    return data.slice(1).map((row: string[]) => ({
      timestamp: row[1],
      original:  row[2],
    }));
  } catch {
    return [];
  }
};

const extractPriceFromHtml = (html: string): number | null => {
  // Regex tolérante : cherche un montant XAF/FCFA/CFA proche d'un mot-clé prix.
  const patterns = [
    /(\d{2,3}[\s. ,]\d{3}(?:[\s. ,]\d{3})?)\s*(?:FCFA|XAF|CFA|F)\b/gi,
    /["']price["']\s*:\s*["']?(\d{4,7})/gi,
  ];
  const candidates: number[] = [];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && candidates.length < 20) {
      const digits = m[1].replace(/[^0-9]/g, '');
      const n = Number(digits);
      if (Number.isFinite(n) && n >= 20000 && n <= 3_000_000) candidates.push(n);
    }
  }
  if (candidates.length === 0) return null;
  // Médiane (résiste aux outliers : accessoires affichés sur la même page)
  candidates.sort((a, b) => a - b);
  return candidates[Math.floor(candidates.length / 2)];
};

const fetchWaybackPrice = async (entry: CdxEntry): Promise<number | null> => {
  const waybackUrl = `https://web.archive.org/web/${entry.timestamp}/${entry.original}`;
  try {
    const res = await fetchWithTimeout(waybackUrl);
    if (!res.ok) return null;
    const html = await res.text();
    return extractPriceFromHtml(html);
  } catch {
    return null;
  }
};

const timestampToDate = (ts: string): string => {
  // Format CDX : "20240315120000" → "2024-03-15"
  if (ts.length < 8) return new Date().toISOString().slice(0, 10);
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
};

const tryWaybackPipeline = async (
  modelKey: string,
  brand: string,
  model: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ recent: number | null; old: number | null; sourceCount: number; urls: string[] }> => {
  const query = `${brand} ${model}`.trim();
  const encoded = encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'));
  const patterns = [
    `jumia.cm/catalog/?q=${encoded}`,
    `jumia.cm/${encoded}*`,
  ];

  const now = new Date();
  const fromOld = new Date(now); fromOld.setDate(fromOld.getDate() - OLD_WINDOW_DAYS_MAX);
  const toOld   = new Date(now); toOld.setDate(toOld.getDate() - OLD_WINDOW_DAYS_MIN);
  const fromRecent = new Date(now); fromRecent.setDate(fromRecent.getDate() - RECENT_WINDOW_DAYS);

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const urls: string[] = [];
  let recentPrice: number | null = null;
  let oldPrice:    number | null = null;

  for (const pattern of patterns) {
    // Fetch captures anciennes (90-240 j)
    if (oldPrice === null) {
      const oldCaptures = await queryCdx(pattern, fmt(fromOld), fmt(toOld));
      for (const cap of oldCaptures) {
        const price = await fetchWaybackPrice(cap);
        if (price) {
          oldPrice = price;
          urls.push(`https://web.archive.org/web/${cap.timestamp}/${cap.original}`);
          await writeSnapshot({
            modelKey, source: 'wayback_jumia',
            sourceUrl: cap.original,
            snapshotDate: timestampToDate(cap.timestamp),
            priceXaf: price, confidence: 0.7,
          }, supabaseUrl, serviceKey);
          break;
        }
      }
    }

    // Fetch capture récente (≤ 30 j)
    if (recentPrice === null) {
      const recentCaptures = await queryCdx(pattern, fmt(fromRecent), fmt(now));
      for (const cap of recentCaptures) {
        const price = await fetchWaybackPrice(cap);
        if (price) {
          recentPrice = price;
          urls.push(`https://web.archive.org/web/${cap.timestamp}/${cap.original}`);
          await writeSnapshot({
            modelKey, source: 'wayback_jumia',
            sourceUrl: cap.original,
            snapshotDate: timestampToDate(cap.timestamp),
            priceXaf: price, confidence: 0.85,
          }, supabaseUrl, serviceKey);
          break;
        }
      }
    }

    if (recentPrice && oldPrice) break;
  }

  return {
    recent: recentPrice,
    old:    oldPrice,
    sourceCount: (recentPrice ? 1 : 0) + (oldPrice ? 1 : 0),
    urls,
  };
};

// ─── Source 2 : Bing Web Search API (freshness vs annuel) ────────────────────
//
// Bing v7 retourne `webPages.totalEstimatedMatches`. On compare le volume
// "résultats du dernier mois" vs "résultats des 12 derniers mois". Plus la part
// récente est élevée, plus l'intérêt actuel est fort.
//
// Nécessite la variable d'env BING_SEARCH_API_KEY (Azure Cognitive Services).
// Sans clé, cette étape est skippée silencieusement.

const fetchBingMatches = async (
  query: string,
  freshness: 'Month' | 'Year',
  apiKey: string,
): Promise<number | null> => {
  try {
    const url =
      `https://api.bing.microsoft.com/v7.0/search` +
      `?q=${encodeURIComponent(query)}` +
      `&freshness=${freshness}` +
      `&mkt=fr-CM` +
      `&count=10` +
      `&responseFilter=Webpages`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!res.ok) {
      console.warn('[get-market-trend] bing_http', res.status);
      return null;
    }
    const data = await res.json();
    const total = data?.webPages?.totalEstimatedMatches;
    return typeof total === 'number' && total >= 0 ? total : null;
  } catch (err) {
    console.warn('[get-market-trend] bing_fetch_failed', (err as any)?.message);
    return null;
  }
};

interface BingResult {
  found:           boolean;
  monthMatches:    number;
  yearMatches:     number;
  freshnessRatio:  number;     // monthMatches / yearMatches
  label:           TrendLabel;
  strength:        number;
  confidence:      number;
}

const tryBingPipeline = async (
  modelKey: string,
  brand: string,
  model: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<BingResult | null> => {
  const apiKey = Deno.env.get('BING_SEARCH_API_KEY');
  if (!apiKey) return null; // pas de clé configurée → skip

  const query = `"${brand} ${model}" Cameroun prix`;

  const [monthMatches, yearMatches] = await Promise.all([
    fetchBingMatches(query, 'Month', apiKey),
    fetchBingMatches(query, 'Year', apiKey),
  ]);

  if (monthMatches === null || yearMatches === null || yearMatches === 0) {
    return null;
  }

  // Ratio attendu pour intérêt constant = 1/12 ≈ 0.083 (1 mois / 12 mois)
  // Au-dessus → intérêt qui monte. En-dessous → intérêt qui descend.
  const freshnessRatio = monthMatches / yearMatches;

  // Stocke le datapoint dans market_demand_signals pour historique
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  // Bing renvoie un volume estimé, on le normalise sur 100 pour cohérence
  // avec le format Trends (saturation à 1200 résultats récents = 100/100).
  const interestScore = Math.min(100, Math.round(monthMatches / 12));

  await writeDemandSignal(
    {
      modelKey, source: 'bing_search',
      periodStart: monthStart.toISOString().slice(0, 10),
      periodEnd:   todayIso(),
      interestScore,
    },
    supabaseUrl, serviceKey,
  );

  // Heuristique de qualification
  let label: TrendLabel;
  let strength: number;
  if (freshnessRatio > 0.15) {
    label = 'rising';
    strength = Math.min(1, (freshnessRatio - 0.083) * 5);
  } else if (freshnessRatio < 0.04) {
    label = 'falling';
    strength = Math.min(1, (0.083 - freshnessRatio) * 8);
  } else {
    label = 'stable';
    strength = Math.abs(freshnessRatio - 0.083) / 0.083;
  }

  // Confidence dépend du volume global (plus de mentions = plus fiable)
  const confidence = yearMatches < 100 ? 0.45 : yearMatches < 1000 ? 0.6 : 0.75;

  return {
    found: true,
    monthMatches,
    yearMatches,
    freshnessRatio,
    label,
    strength,
    confidence,
  };
};

// ─── Calcul tendance depuis 2 prix ───────────────────────────────────────────

const computeTrendFromPrices = (recentPrice: number, oldPrice: number): {
  label: TrendLabel; strength: number; delta: number;
} => {
  const delta = (recentPrice - oldPrice) / oldPrice;
  const absDelta = Math.abs(delta);
  if (absDelta < TREND_STABLE_THRESHOLD) {
    return { label: 'stable', strength: absDelta / TREND_STABLE_THRESHOLD, delta };
  }
  return {
    label:    delta > 0 ? 'rising' : 'falling',
    strength: Math.min(1, absDelta * 4), // ±25% → strength 1
    delta,
  };
};

// ─── Source 2 : Fallback âge du modèle ───────────────────────────────────────

const computeTrendFromAge = (modelKey: string, modelName: string): MarketTrend => {
  // Heuristique : on cherche un nombre récent dans le nom du modèle
  // (S24, iPhone 15, Note 13...) — plus le nombre est élevé, plus c'est récent.
  const m = (modelName || '').toLowerCase();
  const nums = m.match(/\b(\d{1,2})\b/g) || [];
  const maxNum = nums.length > 0 ? Math.max(...nums.map(Number)) : 0;

  // Approximation grossière : nombre élevé = modèle récent = valeur stable/baisse lente
  // nombre faible = ancien = valeur en baisse continue
  let label: TrendLabel;
  let strength: number;
  let message: string;

  if (maxNum >= 14) {
    label = 'stable';
    strength = 0.15;
    message = "Modèle récent — valeur de revente actuellement stable au Cameroun.";
  } else if (maxNum >= 11) {
    label = 'falling';
    strength = 0.3;
    message = "Modèle mature — décote naturelle de ~10 à 15 % par an.";
  } else if (maxNum > 0) {
    label = 'falling';
    strength = 0.55;
    message = "Modèle ancien — la valeur baisse continuellement, vendez maintenant.";
  } else {
    label = 'insufficient_data';
    strength = 0;
    message = "Cote indicative non disponible pour ce modèle.";
  }

  return {
    label,
    strength,
    confidence: 0.35, // fallback = confiance basse
    source_chain: ['model_age'],
    message_fr: message,
    raw: { modelKey, modelName, maxNum },
  };
};

// ─── Pipeline principal ──────────────────────────────────────────────────────

const runPipeline = async (
  brand: string,
  model: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<MarketTrend> => {
  const modelKey = buildModelKey(brand, model);
  if (!modelKey) {
    return {
      label: 'insufficient_data',
      strength: 0,
      confidence: 0,
      source_chain: [],
      message_fr: 'Modèle non identifié.',
    };
  }

  // Cache hit ?
  const cached = await readCache(modelKey, supabaseUrl, serviceKey);
  if (cached) return cached;

  // ÉTAPE 1 — Snapshots DB (pré-remplis par jobs / appels précédents)
  const dbSnapshots = await readSnapshots(modelKey, supabaseUrl, serviceKey);
  const todayMs = Date.now();
  const recentFromDb = dbSnapshots.find((s) => {
    const ageDays = (todayMs - new Date(s.snapshot_date).getTime()) / 86_400_000;
    return ageDays <= RECENT_WINDOW_DAYS;
  });
  const oldFromDb = dbSnapshots.find((s) => {
    const ageDays = (todayMs - new Date(s.snapshot_date).getTime()) / 86_400_000;
    return ageDays >= OLD_WINDOW_DAYS_MIN && ageDays <= OLD_WINDOW_DAYS_MAX;
  });

  let recentPrice: number | null = recentFromDb?.price_xaf ?? null;
  let oldPrice:    number | null = oldFromDb?.price_xaf ?? null;
  const sourceChain: string[] = [];

  if (recentPrice || oldPrice) sourceChain.push('db_snapshots');

  // ÉTAPE 2 — Wayback Machine si manque de data
  if (!recentPrice || !oldPrice) {
    try {
      const wb = await tryWaybackPipeline(modelKey, brand, model, supabaseUrl, serviceKey);
      if (wb.recent && !recentPrice) recentPrice = wb.recent;
      if (wb.old    && !oldPrice)    oldPrice    = wb.old;
      if (wb.sourceCount > 0) sourceChain.push('wayback');
    } catch (err) {
      console.warn('[get-market-trend] wayback_failed', (err as any)?.message);
    }
  }

  // ÉTAPE 3 — Si on a 2 prix valides → calcul direct (Wayback gagne, c'est la vraie data)
  if (recentPrice && oldPrice) {
    const calc = computeTrendFromPrices(recentPrice, oldPrice);
    const pct = Math.round(calc.delta * 100);
    let message: string;
    if (calc.label === 'rising') {
      message = `Valeur en hausse (+${pct} %) sur les 6 derniers mois — bon timing pour vendre.`;
    } else if (calc.label === 'falling') {
      message = `Valeur en baisse (${pct} %) sur les 6 derniers mois — vendez maintenant pour maximiser le prix.`;
    } else {
      message = `Valeur stable (${pct >= 0 ? '+' : ''}${pct} %) sur les 6 derniers mois — offre fiable.`;
    }

    // Bonus : si Bing est dispo, on l'appelle aussi pour cross-validation et bump de confidence
    let confidence = 0.85;
    try {
      const bing = await tryBingPipeline(modelKey, brand, model, supabaseUrl, serviceKey);
      if (bing) {
        sourceChain.push('bing');
        // Si Bing confirme la même tendance → +10 % confidence
        if (bing.label === calc.label) confidence = Math.min(0.95, confidence + 0.10);
      }
    } catch (err) {
      console.warn('[get-market-trend] bing_crossval_failed', (err as any)?.message);
    }

    const trend: MarketTrend = {
      label:        calc.label,
      strength:     calc.strength,
      confidence,
      source_chain: sourceChain,
      message_fr:   message,
      raw:          { recentPrice, oldPrice, delta: calc.delta },
    };
    await writeCache(modelKey, trend, supabaseUrl, serviceKey);
    return trend;
  }

  // ÉTAPE 3 bis — Wayback a échoué : tenter Bing en source principale
  try {
    const bing = await tryBingPipeline(modelKey, brand, model, supabaseUrl, serviceKey);
    if (bing && bing.label !== 'insufficient_data') {
      sourceChain.push('bing');
      let message: string;
      if (bing.label === 'rising') {
        message = `Demande en hausse sur ce modèle — la valeur de reprise est solide en ce moment.`;
      } else if (bing.label === 'falling') {
        message = `Intérêt en baisse pour ce modèle — vendez maintenant avant que la valeur ne décroche.`;
      } else {
        message = `Demande stable pour ce modèle — valeur de reprise fiable.`;
      }
      const trend: MarketTrend = {
        label:        bing.label,
        strength:     bing.strength,
        confidence:   bing.confidence,
        source_chain: sourceChain,
        message_fr:   message,
        raw:          { monthMatches: bing.monthMatches, yearMatches: bing.yearMatches, freshnessRatio: bing.freshnessRatio },
      };
      await writeCache(modelKey, trend, supabaseUrl, serviceKey);
      return trend;
    }
  } catch (err) {
    console.warn('[get-market-trend] bing_primary_failed', (err as any)?.message);
  }

  // ÉTAPE 4 — Fallback âge du modèle (toujours retourne quelque chose)
  const fallback = computeTrendFromAge(modelKey, model);
  fallback.source_chain = [...sourceChain, ...fallback.source_chain];
  await writeCache(modelKey, fallback, supabaseUrl, serviceKey);
  return fallback;
};

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const brand = typeof body?.brand === 'string' ? body.brand.trim() : '';
    const model = typeof body?.model === 'string' ? body.model.trim() : '';

    if (!brand && !model) {
      return new Response(JSON.stringify({ error: 'brand ou model requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const trend = await runPipeline(brand, model, supabaseUrl, serviceKey);

    return new Response(JSON.stringify(trend), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[get-market-trend] fatal', error?.message ?? error);
    // Toujours retourner un fallback pour ne jamais bloquer evaluate-device
    return new Response(JSON.stringify({
      label: 'insufficient_data',
      strength: 0,
      confidence: 0,
      source_chain: [],
      message_fr: 'Cote du marché temporairement indisponible.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

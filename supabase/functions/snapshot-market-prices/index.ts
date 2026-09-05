// @ts-ignore
const Deno = globalThis.Deno;

import { buildModelKey } from '../_shared/marketKey.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Mapping site marchand → valeur autorisée par le CHECK de market_price_snapshots.source
const SOURCE_MAP: Record<string, string> = {
  'jumia.cm': 'jumia_live',
  'glotelho.cm': 'glotelho_live',
  'kmerphone.com': 'kmerphone_live',
};

const BATCH_DELAY_MS = Number(Deno.env.get('SNAPSHOT_BATCH_DELAY_MS') ?? '1500');
const MAX_MODELS = Number(Deno.env.get('SNAPSHOT_MAX_MODELS') ?? '200');
const COUNTRY_CODE = 'CM';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const median = (nums: number[]): number => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

type Offer = { price: number; source: string };
type ModelRow = { brand: string; model_name: string };

const fetchModels = async (supabaseUrl: string, serviceKey: string): Promise<ModelRow[]> => {
  const url =
    `${supabaseUrl}/rest/v1/trade_in_models` +
    `?select=brand,model_name&order=model_name.asc`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? (rows as ModelRow[]) : [];
};

const fetchOffers = async (
  supabaseUrl: string,
  serviceKey: string,
  brand: string,
  model: string,
): Promise<Offer[]> => {
  const res = await fetch(`${supabaseUrl}/functions/v1/market-price-intel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      deviceBrand: brand,
      deviceModel: model,
      countryCode: COUNTRY_CODE,
      forceRefresh: true,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const offers = Array.isArray(data?.offers) ? data.offers : [];
  return offers
    .map((o: any) => ({ price: Number(o?.price), source: String(o?.source ?? '') }))
    .filter((o: Offer) => Number.isFinite(o.price) && o.price > 0);
};

const upsertSnapshot = async (
  supabaseUrl: string,
  serviceKey: string,
  row: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/market_price_snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify(row),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const runSnapshots = async (supabaseUrl: string, serviceKey: string) => {
  const started = Date.now();
  const models = (await fetchModels(supabaseUrl, serviceKey)).slice(0, MAX_MODELS);
  let processed = 0;
  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of models) {
    processed += 1;
    const modelKey = buildModelKey(m.brand, m.model_name);
    if (!modelKey) {
      skipped += 1;
      continue;
    }

    try {
      const offers = await fetchOffers(supabaseUrl, serviceKey, m.brand, m.model_name);

      // Groupe les prix par site marchand connu
      const bySource = new Map<string, number[]>();
      for (const o of offers) {
        const mapped = SOURCE_MAP[o.source];
        if (!mapped) continue; // ignore les provenances non marchandes (DuckDuckGo, etc.)
        const arr = bySource.get(mapped) ?? [];
        arr.push(o.price);
        bySource.set(mapped, arr);
      }

      if (bySource.size === 0) {
        skipped += 1;
      } else {
        for (const [source, prices] of bySource) {
          const ok = await upsertSnapshot(supabaseUrl, serviceKey, {
            model_key: modelKey,
            source,
            snapshot_date: todayIso(),
            price_xaf: median(prices),
            country_code: COUNTRY_CODE,
            confidence: Math.min(0.9, 0.5 + prices.length * 0.1),
          });
          if (ok) written += 1;
          else failed += 1;
        }
      }
    } catch (err) {
      failed += 1;
      console.warn('[snapshot-market-prices] model_failed', m.brand, m.model_name, (err as any)?.message);
    }

    await sleep(BATCH_DELAY_MS);
  }

  const summary = { processed, written, skipped, failed, durationMs: Date.now() - started };
  console.log('[snapshot-market-prices] done', JSON.stringify(summary));
  return summary;
};

Deno.serve((req: Request): Response => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Garde-fou : déclencher du scraping coûteux exige le secret cron.
  const provided = req.headers.get('x-cron-secret') ?? '';
  const expected = Deno.env.get('CRON_SECRET') ?? '';
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  // Travail en arrière-plan : 32 modèles scrapés en série dépassent le timeout HTTP.
  // On répond 202 immédiatement, le traitement continue après la réponse.
  // @ts-ignore — EdgeRuntime fourni par le runtime Supabase
  EdgeRuntime.waitUntil(runSnapshots(supabaseUrl, serviceKey));

  return new Response(JSON.stringify({ status: 'started' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 202,
  });
});

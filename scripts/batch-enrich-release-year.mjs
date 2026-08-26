/**
 * Remplit products.release_year pour le catalogue (priorité : phones).
 *
 * Pipeline :
 *   1) Lookup phone_releases (seed / wikidata) via model_key normalisé
 *   2) DeepSeek pour le reste (instructions strictes, confidence high|medium)
 *
 * Pré-requis :
 *   npm run db:apply -- supabase/migrations/20260721_001_products_release_year.sql
 *   VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env
 *   DEEPSEEK_API_KEY dans .env
 *
 * Usage :
 *   node scripts/batch-enrich-release-year.mjs --dry-run
 *   node scripts/batch-enrich-release-year.mjs --dry-run --limit=10
 *   node scripts/batch-enrich-release-year.mjs --category=phones --apply
 *   node scripts/batch-enrich-release-year.mjs --skip-ai --apply   # phone_releases seulement
 *   node scripts/batch-enrich-release-year.mjs --force --apply     # ré-écrase l'existant
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;
const SKIP_AI = process.argv.includes('--skip-ai');
const FORCE = process.argv.includes('--force');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0;
const categoryArg = process.argv.find((a) => a.startsWith('--category='));
const CATEGORY = categoryArg?.split('=')[1] || 'phones';
const batchSizeArg = process.argv.find((a) => a.startsWith('--batch-size='));
const AI_BATCH_SIZE = batchSizeArg ? Math.max(1, Math.min(8, Number(batchSizeArg.split('=')[1]) || 5)) : 5;
const DELAY_MS = Number(process.env.BATCH_ENRICH_DELAY_MS || 3000);

const DEEPSEEK_KEY =
  process.env.DEEPSEEK_API_KEY?.trim() || process.env.VITE_DEEPSEEK_API_KEY?.trim() || '';
const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL?.trim() || process.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';

const normalizeModelKey = (brand, model) => {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const b = norm(brand);
  const m = norm(model);
  if (!b && !m) return '';
  if (!b) return m;
  if (!m) return b;
  return `${b}_${m}`;
};

/** Retire stockage / condition du titre pour le matching modèle. */
const baseModelName = (name) =>
  (name || '')
    .replace(/\b\d+\s*(go|gb|to|mo|tb)\b/gi, '')
    .replace(/\b(scellé|non scellé|reconditionné|neuf|occasion)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const brandVariants = (brandName) => {
  const b = (brandName || '').trim();
  if (!b) return [''];
  const out = new Set([b]);
  const first = b.split(/\s+/)[0];
  if (first) out.add(first);
  if (/samsung/i.test(b)) out.add('Samsung');
  if (/apple|iphone/i.test(b) || /iphone/i.test(b)) out.add('Apple');
  return [...out];
};

function lookupReleaseYear(product, releaseMap) {
  const base = baseModelName(product.name);
  const candidates = new Set();

  for (const brand of brandVariants(product.brandName)) {
    candidates.add(normalizeModelKey(brand, product.name));
    candidates.add(normalizeModelKey(brand, base));
    // Nom seul si marque déjà dans le titre (ex. "Samsung Galaxy A12" + brand Samsung Galaxy)
    if (brand && !base.toLowerCase().startsWith(brand.toLowerCase().split(' ')[0])) {
      candidates.add(normalizeModelKey('', `${brand} ${base}`));
    }
  }
  candidates.add(normalizeModelKey('', base));

  for (const key of candidates) {
    if (key && releaseMap.has(key)) {
      return { year: releaseMap.get(key), source: 'phone_releases', model_key: key };
    }
  }

  // Sous-chaîne : clé phone_releases contenue dans la clé produit (long tail)
  const productKey = normalizeModelKey(product.brandName?.split(' ')[0] || '', base);
  for (const [key, year] of releaseMap.entries()) {
    if (productKey.includes(key) || key.includes(productKey)) {
      if (key.length >= 8 && productKey.length >= 8) {
        return { year, source: 'phone_releases_fuzzy', model_key: key };
      }
    }
  }

  return null;
}

function buildDeepSeekPrompt(products) {
  const lines = products.map((p, i) => {
    const specs = (p.specs || [])
      .slice(0, 6)
      .map((s) => `${s.label}: ${s.value}`)
      .join(' · ');
    return `${i + 1}. id=${p.id}
   nom="${p.name}"
   marque=${p.brandName || '(inconnue)'}
   catégorie=${p.category}
   ${specs ? `specs=${specs}` : 'specs=(aucune)'}`;
  }).join('\n\n');

  return `
Tu es un expert catalogue high-tech pour Xeption (Cameroun).

Pour CHAQUE produit ci-dessous, détermine l'année de sortie commerciale GLOBALE du MODÈLE DE BASE
(première annonce / première commercialisation internationale du modèle, pas la variante stockage).

${lines}

Règles strictes :
- IGNORE stockage (128/256 Go), RAM, couleur, scellé/reconditionné, bundle.
- "iPhone 12 128 Go" → année du modèle iPhone 12 (2020), pas une édition stockage.
- "Galaxy A12" / "Samsung Galaxy A12" → même modèle A12.
- Marque absente mais nom explicite ("iPhone 15 Pro") → déduis la marque.
- Si le nom est trop vague (ex. "Smartphone Android", accessoire, coque) → release_year: null.
- confidence "high" = tu es sûr à ±1 an ; "medium" = plausible mais incertain ; "low" = guess → alors release_year DOIT être null.
- Ne retourne release_year que si confidence est "high" ou "medium".
- Plage valide : 1995–2026 (pas de futur lointain).

Réponds UNIQUEMENT en JSON :
{
  "results": [
    {
      "id": "<uuid exact>",
      "release_year": 2023,
      "confidence": "high",
      "reason": "1 phrase courte en français"
    }
  ]
}
`.trim();
}

async function askDeepSeek(products) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: buildDeepSeekPrompt(products) }],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
      temperature: 0.1,
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    if (res.status === 429) throw new Error('deepseek_http_429');
    throw new Error(`deepseek_http_${res.status}: ${bodyText.slice(0, 200)}`);
  }
  const payload = JSON.parse(bodyText);
  const text = payload?.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error('deepseek_empty_response');
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed?.results) ? parsed.results : [];
  return rows;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  if (!SKIP_AI && !DEEPSEEK_KEY) throw new Error('Missing DEEPSEEK_API_KEY in .env');

  const supabase = createClient(url, key);

  const { data: brands } = await supabase.from('brands').select('id,name');
  const brandNameById = new Map((brands || []).map((b) => [b.id, b.name]));

  let query = supabase
    .from('products')
    .select('id,name,category,brand,specs,release_year')
    .order('name');
  if (CATEGORY !== 'all') query = query.eq('category', CATEGORY);

  const { data: products, error } = await query;
  if (error) {
    if (error.message?.includes('release_year')) {
      throw new Error(
        'Colonne release_year absente. Applique d’abord :\n' +
          '  npm run db:apply -- supabase/migrations/20260721_001_products_release_year.sql',
      );
    }
    throw error;
  }

  const { data: releases } = await supabase.from('phone_releases').select('model_key,release_year');
  const releaseMap = new Map((releases || []).map((r) => [r.model_key, r.release_year]));

  const enriched = (products || []).map((p) => ({
    ...p,
    brandName: brandNameById.get(p.brand) || '',
  }));

  let targets = FORCE
    ? enriched
    : enriched.filter((p) => p.release_year == null);

  if (LIMIT) targets = targets.slice(0, LIMIT);

  const logPath = join(root, 'data/batch-enrich-release-year-log.json');
  let log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { runs: [] };

  const run = {
    at: new Date().toISOString(),
    mode: DRY ? 'dry-run' : 'applied',
    category: CATEGORY,
    skipAi: SKIP_AI,
    force: FORCE,
    totalTargets: targets.length,
    fromPhoneReleases: 0,
    fromDeepSeek: 0,
    skipped: 0,
    items: [],
  };

  console.log(`\n=== batch-enrich-release-year (${run.mode}) ===`);
  console.log(`Catégorie: ${CATEGORY} | Cibles: ${targets.length} | phone_releases: ${releaseMap.size}`);
  console.log(`IA: ${SKIP_AI ? 'off' : `DeepSeek (${DEEPSEEK_MODEL}), lots de ${AI_BATCH_SIZE}`}\n`);

  const needsAi = [];

  for (const p of targets) {
    const hit = lookupReleaseYear(p, releaseMap);
    if (hit) {
      run.fromPhoneReleases++;
      run.items.push({
        id: p.id,
        name: p.name,
        release_year: hit.year,
        source: hit.source,
        model_key: hit.model_key,
      });
      console.log(`✓ [ref] ${p.name} → ${hit.year} (${hit.source})`);
      if (APPLY) {
        const { error: upErr } = await supabase
          .from('products')
          .update({ release_year: hit.year })
          .eq('id', p.id);
        if (upErr) console.error(`  ✗ update ${p.id}:`, upErr.message);
      }
      continue;
    }
    needsAi.push(p);
  }

  if (!SKIP_AI && needsAi.length > 0) {
    for (let i = 0; i < needsAi.length; i += AI_BATCH_SIZE) {
      const chunk = needsAi.slice(i, i + AI_BATCH_SIZE);
      let rows = [];
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          rows = await askDeepSeek(chunk);
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('429') || msg.includes('503') || msg.includes('fetch failed')) {
            const wait = 10000 * (attempt + 1);
            console.log(`  … retry DeepSeek dans ${wait / 1000}s`);
            await sleep(wait);
            continue;
          }
          throw e;
        }
      }

      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const p of chunk) {
        const row = byId.get(p.id);
        const conf = String(row?.confidence || '').toLowerCase();
        const year = Number(row?.release_year);
        const ok =
          row &&
          (conf === 'high' || conf === 'medium') &&
          Number.isFinite(year) &&
          year >= 1995 &&
          year <= 2100;

        if (!ok) {
          run.skipped++;
          run.items.push({
            id: p.id,
            name: p.name,
            release_year: null,
            source: 'skipped',
            reason: row?.reason || row?.confidence || 'no_match',
          });
          console.log(`– [skip] ${p.name} (${row?.confidence || 'no AI result'})`);
          continue;
        }

        run.fromDeepSeek++;
        run.items.push({
          id: p.id,
          name: p.name,
          release_year: year,
          source: 'deepseek',
          confidence: conf,
          reason: row.reason,
        });
        console.log(`✓ [AI/${conf}] ${p.name} → ${year} — ${row.reason || ''}`);

        if (APPLY) {
          const { error: upErr } = await supabase
            .from('products')
            .update({ release_year: year })
            .eq('id', p.id);
          if (upErr) console.error(`  ✗ update ${p.id}:`, upErr.message);

          const modelKey = normalizeModelKey(
            p.brandName?.split(' ')[0] || '',
            baseModelName(p.name),
          );
          if (modelKey) {
            await supabase.from('phone_releases').upsert(
              {
                model_key: modelKey,
                release_year: year,
                source: 'deepseek',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'model_key' },
            );
          }
        }
      }

      if (i + AI_BATCH_SIZE < needsAi.length) await sleep(DELAY_MS);
    }
  } else if (needsAi.length > 0) {
    run.skipped += needsAi.length;
    for (const p of needsAi) {
      run.items.push({ id: p.id, name: p.name, source: 'no_ref_no_ai' });
      console.log(`– [pending] ${p.name} (pas dans phone_releases, --skip-ai)`);
    }
  }

  log.runs.push(run);
  writeFileSync(logPath, JSON.stringify(log, null, 2));

  console.log('\n--- Résumé ---');
  console.log(`phone_releases : ${run.fromPhoneReleases}`);
  console.log(`DeepSeek       : ${run.fromDeepSeek}`);
  console.log(`ignorés        : ${run.skipped}`);
  console.log(`Log            : ${logPath}`);
  if (DRY) console.log('\n(dry-run — relance avec --apply pour écrire en prod)');
}

main().catch((err) => {
  console.error('✗', err.message || err);
  process.exit(1);
});

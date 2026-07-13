/**
 * Enrichissement specs par catalogue (sans API) — par lot marque.
 * Usage: node scripts/batch-enrich-catalog.mjs --batch=samsung --apply
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { matchFamily, buildPayload } from './productSpecsFamilies.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const APPLY = process.argv.includes('--apply');
const batchArg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_ID = batchArg?.split('=')[1] || 'all';

const COMMERCIAL_KEYS = ['stockage', 'origine', 'source', 'sim', 'conditionnement', 'condition', 'ram'];

const BATCHES = {
  apple: (p) => /iphone|apple/i.test(p.name) || /apple/i.test(p.brandSlug || ''),
  samsung: (p) =>
    /samsung|galaxie|galaxy/i.test(p.name) ||
    /samsung/i.test(p.brandSlug || '') ||
    /^(s\d|galaxie|galaxy)/i.test(p.name.trim()),
  google: (p) => /pixel|google/i.test(p.name) || /google|pixel/i.test(p.brandSlug || ''),
  xiaomi: (p) => /xiaomi|redmi|poco/i.test(p.name) || /xiaomi/i.test(p.brandSlug || ''),
  infinix: (p) => /infinix/i.test(p.name) || /infinix/i.test(p.brandSlug || ''),
  tecno: (p) => /tecno/i.test(p.name) || /tecno/i.test(p.brandSlug || ''),
};

function resolveBatch(p) {
  for (const [key, fn] of Object.entries(BATCHES)) {
    if (fn(p)) return key;
  }
  return 'legacy';
}

function hasValidSpecs(specs) {
  return (
    Array.isArray(specs) &&
    specs.length > 0 &&
    specs.some((s) => (s.label || '').trim() && (s.value || '').trim())
  );
}

function isMinimalSpecs(specs) {
  if (!hasValidSpecs(specs)) return true;
  const labels = specs.map((s) => (s.label || '').toLowerCase());
  const rich = ['écran', 'processeur', 'appareil photo', 'batterie', 'réseau', 'os', 'puissance', 'type'];
  if (labels.some((l) => rich.some((r) => l.includes(r)))) return false;
  return true;
}

function needsEnrichment(p) {
  const specs = p.specs || [];
  const hasProsCons =
    Array.isArray(p.pros) && p.pros.length > 0 && Array.isArray(p.cons) && p.cons.length > 0;
  if (!hasValidSpecs(specs) || isMinimalSpecs(specs)) return true;
  if (!hasProsCons) return true;
  return false;
}

function mergeSpecs(existing, generated) {
  const map = new Map();
  for (const s of existing || []) {
    if (s?.label && s?.value) map.set(s.label.toLowerCase().trim(), s);
  }
  for (const s of generated || []) {
    const key = (s.label || '').toLowerCase().trim();
    if (!key || !s.value) continue;
    const isCommercial = COMMERCIAL_KEYS.some((k) => key.includes(k));
    if (isCommercial && map.has(key)) continue;
    if (!map.has(key)) map.set(key, { label: s.label.trim(), value: s.value.trim() });
  }
  return Array.from(map.values()).slice(0, 12);
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);

  const { data: brands } = await supabase.from('brands').select('id,slug');
  const brandSlugById = new Map((brands || []).map((b) => [b.id, b.slug]));

  const { data: products, error } = await supabase
    .from('products')
    .select('id,name,category,description,specs,pros,cons,brand');
  if (error) throw error;

  const enriched = products.map((p) => ({
    ...p,
    brandSlug: brandSlugById.get(p.brand) || '',
  }));

  const targets = enriched.filter(needsEnrichment);
  const batchOrder = BATCH_ID === 'all' ? Object.keys(BATCHES) : [BATCH_ID];
  if (BATCH_ID !== 'all' && !BATCHES[BATCH_ID]) throw new Error(`Unknown batch: ${BATCH_ID}`);

  const log = { mode: APPLY ? 'applied' : 'dry-run', at: new Date().toISOString(), batch: BATCH_ID, updated: [], skipped: [] };

  for (const batchKey of batchOrder) {
    const batchProducts = targets.filter((p) => resolveBatch(p) === batchKey);
    console.log(`\n=== Catalogue ${batchKey} — ${batchProducts.length} produits ===`);

    for (const product of batchProducts) {
      const fam = matchFamily(product.name);
      if (!fam) {
        log.skipped.push({ name: product.name, reason: 'pas de famille catalogue' });
        console.log(`? ${product.name} — pas de match catalogue`);
        continue;
      }

      const gen = buildPayload(product, fam);
      const payload = {
        specs: mergeSpecs(product.specs, gen.specs),
        pros: gen.pros,
        cons: gen.cons,
      };

      if (!APPLY) {
        console.log(`[dry-run] ${product.name} → ${fam.id}`);
        log.updated.push({ name: product.name, family: fam.id });
        continue;
      }

      const { error: upErr } = await supabase.from('products').update(payload).eq('id', product.id);
      if (upErr) {
        console.error(`✗ ${product.name}: ${upErr.message}`);
        continue;
      }
      console.log(`✓ ${product.name} (${fam.id}, ${payload.specs.length} specs)`);
      log.updated.push({ name: product.name, family: fam.id, specCount: payload.specs.length });
    }
  }

  const out = join(root, 'data/batch-enrich-catalog-log.json');
  writeFileSync(out, JSON.stringify(log, null, 2), 'utf8');
  console.log(`\nOK: ${log.updated.length} | Skipped: ${log.skipped.length}`);
  console.log(`Log: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Funnel d'ingestion multi-produits : upsert + enrichissement DeepSeek.
 *
 * Usage:
 *   node scripts/product-ingestion-funnel.mjs --file=data/mfoundi-mall-catalog.json
 *   node scripts/product-ingestion-funnel.mjs --file=imports.json --format=json
 *   node scripts/product-ingestion-funnel.mjs --file=data/mfoundi-mall-catalog.json --no-enrich
 *   node scripts/product-ingestion-funnel.mjs --file=data/mfoundi-mall-catalog.json --dry-run
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isWeakProductDescription } from './productDescription.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const DRY = process.argv.includes('--dry-run');
const NO_ENRICH = process.argv.includes('--no-enrich');
const fileArg = process.argv.find((a) => a.startsWith('--file='));
const formatArg = process.argv.find((a) => a.startsWith('--format='));
const DELAY_MS = Number(process.env.BATCH_ENRICH_DELAY_MS || 2500);
const DEEPSEEK_KEY = process.env.VITE_DEEPSEEK_API_KEY?.trim() || '';
const DEEPSEEK_MODEL = process.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
const DEFAULT_IMAGE = '/icons/icon-192x192.png';

if (!fileArg) {
  console.error('Usage: node scripts/product-ingestion-funnel.mjs --file=<json>');
  process.exit(1);
}

const filePath = join(root, fileArg.split('=')[1]);
if (!existsSync(filePath)) {
  console.error('Fichier introuvable:', filePath);
  process.exit(1);
}

// --- Parser Mfoundi (miroir utils/mfoundiCatalogParser.ts) ---
const BRAND_SLUG_MAP = {
  Google: 'google-pixel',
  Apple: 'apple',
  Samsung: 'samsung',
  Xiaomi: 'xiaomi',
  Infinix: 'infinix',
  Tecno: 'tecno',
};
const BRAND_NAME_MAP = { Google: 'Google Pixel' };
const CAT_MAP = { smartphone: 'phones', smartwatch: 'accessories', earbuds: 'accessories' };

function slugify(text) {
  return text
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function packagingLabel(p) {
  if (p === 'scelle') return 'Scellé';
  if (p === 'non_scelle') return 'Non scellé';
  return null;
}

function buildProductName(row) {
  const [, brand, model, storage, ram] = row;
  const parts = [brand, model];
  if (storage) parts.push(`${storage} Go`);
  if (ram) parts.push(`${ram} GB RAM`);
  return parts.join(' ');
}

function buildSpecs(row) {
  const [, , , storage, ram, packaging, sim, origin, , , accessories, source, notes] = row;
  const specs = [];
  if (storage) specs.push({ label: 'Stockage', value: `${storage} Go` });
  if (ram) specs.push({ label: 'RAM', value: `${ram} GB` });
  const pkg = packagingLabel(packaging);
  if (pkg) specs.push({ label: 'Conditionnement', value: pkg });
  if (sim) specs.push({ label: 'SIM', value: sim });
  if (origin) specs.push({ label: 'Origine', value: origin });
  if (source) specs.push({ label: 'Source', value: source });
  if (notes) specs.push({ label: 'Notes', value: notes });
  if (accessories) specs.push({ label: 'Accessoires', value: 'Oui' });
  return specs;
}

function conditionFromRow(row) {
  if (row[5] === 'scelle') return 'new';
  if (row[5] === 'non_scelle') return 'refurbished';
  if (row[0] === 'smartphone' && row[1] === 'Apple') return 'refurbished';
  return 'new';
}

function parseMfoundiCatalog(catalog) {
  const drafts = [];
  for (const row of catalog.rows) {
    if (!Array.isArray(row) || row.length < 9) continue;
    const [cat, brandName, model] = row;
    const brandSlug = BRAND_SLUG_MAP[brandName] || slugify(brandName);
    const price = Number(row[8]);
    if (!price || price <= 0) continue;
    drafts.push({
      name: buildProductName(row),
      brandSlug,
      brandName: BRAND_NAME_MAP[brandName] || brandName,
      rangeSlug: slugify(model),
      rangeName: model,
      category: CAT_MAP[cat] || 'phones',
      price,
      warrantyMonths: Number(row[9]) || 0,
      condition: conditionFromRow(row),
      stock: 0,
      specs: buildSpecs(row),
      description: '',
      image: DEFAULT_IMAGE,
    });
  }
  return drafts;
}

function parseJsonDraftList(raw) {
  if (!Array.isArray(raw)) throw new Error('JSON invalide : tableau attendu');
  return raw.map((item, idx) => {
    const name = String(item.name || '').trim();
    const price = Number(item.price);
    const category = String(item.category || '').trim();
    if (!name || !category || !price) {
      throw new Error(`Ligne ${idx + 1} : name, category, price requis`);
    }
    const brandSlug = String(item.brandSlug || item.brand || 'generic').trim();
    return {
      name,
      price,
      category,
      brandSlug,
      brandName: String(item.brandName || brandSlug),
      rangeSlug: String(item.rangeSlug || slugify(name)),
      rangeName: String(item.rangeName || item.rangeSlug || slugify(name)),
      condition: item.condition === 'new' ? 'new' : 'refurbished',
      stock: Math.max(0, Number(item.stock) || 0),
      warrantyMonths: Math.max(0, Number(item.warrantyMonths) || 0),
      specs: Array.isArray(item.specs) ? item.specs : [],
      description: String(item.description || ''),
      image: String(item.image || DEFAULT_IMAGE),
    };
  });
}

function detectFormat(raw) {
  if (raw && typeof raw === 'object' && Array.isArray(raw.rows)) return 'mfoundi';
  return 'json';
}

function normName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicate(products, candidate) {
  const n = normName(candidate.name);
  const brand = (candidate.brand || '').trim();
  const range = (candidate.productRange || '').trim();
  return products.find(
    (p) =>
      normName(p.name) === n &&
      (p.brand || '').trim() === brand &&
      (p.product_range || p.productRange || '').trim() === range,
  );
}

function productNeedsEnrichment(p) {
  if (isWeakProductDescription(p.description, p.name)) return true;
  const specs = p.specs || [];
  const hasSpecs = specs.length > 0 && specs.some((s) => s.label && s.value);
  if (!hasSpecs) return true;
  const labels = specs.map((s) => (s.label || '').toLowerCase());
  const rich = ['écran', 'processeur', 'appareil photo', 'batterie', 'réseau', 'os'];
  if (!labels.some((l) => rich.some((r) => l.includes(r)))) return true;
  const hasProsCons =
    Array.isArray(p.pros) && p.pros.length && Array.isArray(p.cons) && p.cons.length;
  return !hasProsCons;
}

function mergeSpecs(existing, generated) {
  const map = new Map();
  for (const s of existing || []) {
    if (s?.label && s?.value) map.set(s.label.toLowerCase().trim(), s);
  }
  for (const s of generated || []) {
    const key = (s.label || '').toLowerCase().trim();
    if (key && s.value) map.set(key, { label: s.label.trim(), value: s.value.trim() });
  }
  return Array.from(map.values()).slice(0, 12);
}

function buildEnrichPrompt(product, weakDesc) {
  const existingSpecs = (product.specs || []).map((s) => `${s.label}: ${s.value}`).join('\n');
  return `
Tu es le persona "Product Enricher" de Xeption (high-tech Cameroun).
Produit: ${product.name}
Catégorie: ${product.category}
${existingSpecs ? `Specs connues:\n${existingSpecs}` : ''}

Génère UNIQUEMENT un JSON:
${weakDesc ? '- description: 2-3 phrases marketing (JAMAIS Import Mfoundi Mall)\n- reviewShort: 1 phrase' : ''}
- specs: 4-8 entrées {label, value}
- pros: 3 max
- cons: 2 max

Ton expert, marché Cameroun, variante exacte du nom.
`.trim();
}

async function enrichDeepSeek(product) {
  const weakDesc = isWeakProductDescription(product.description, product.name);
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: buildEnrichPrompt(product, weakDesc) }],
      response_format: { type: 'json_object' },
      max_tokens: 1400,
      temperature: 0.15,
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`deepseek_http_${res.status}: ${bodyText.slice(0, 150)}`);
  const payload = JSON.parse(bodyText);
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error('deepseek_empty');
  const parsed = JSON.parse(text);
  const out = {};
  if (weakDesc && parsed.description?.trim()) out.description = parsed.description.trim();
  if (parsed.reviewShort?.trim()) out.reviewShort = parsed.reviewShort.trim();
  if (Array.isArray(parsed.pros)) out.pros = parsed.pros.filter(Boolean).slice(0, 3);
  if (Array.isArray(parsed.cons)) out.cons = parsed.cons.filter(Boolean).slice(0, 2);
  if (Array.isArray(parsed.specs)) out.specs = mergeSpecs(product.specs, parsed.specs);
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!NO_ENRICH && !DEEPSEEK_KEY) {
    console.error('VITE_DEEPSEEK_API_KEY requis pour l’enrichissement');
    process.exit(1);
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase credentials missing');

  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const format = formatArg?.split('=')[1] || detectFormat(raw);
  const drafts =
    format === 'mfoundi' ? parseMfoundiCatalog(raw) : parseJsonDraftList(raw);

  console.log(`Fichier: ${filePath}`);
  console.log(`Format: ${format} | Produits: ${drafts.length} | enrich: ${!NO_ENRICH} | dry-run: ${DRY}`);

  const supabase = createClient(url, key);
  const { data: products } = await supabase.from('products').select('*');
  const { data: brands } = await supabase.from('brands').select('id,slug,name');
  const { data: ranges } = await supabase.from('product_ranges').select('id,slug,brand_id');

  const brandCache = new Map((brands || []).map((b) => [b.slug, b.id]));
  const rangeCache = new Map(
    (ranges || []).map((r) => [`${r.brand_id}::${r.slug}`, r.id]),
  );

  const report = { created: 0, updated: 0, enriched: 0, errors: [] };

  for (const draft of drafts) {
    try {
      let brandId = brandCache.get(draft.brandSlug);
      if (!brandId) {
        if (DRY) {
          console.log(`[dry-run] nouvelle marque: ${draft.brandSlug}`);
          brandId = `dry-brand-${draft.brandSlug}`;
        } else {
          const { data, error } = await supabase
            .from('brands')
            .insert({ name: draft.brandName, slug: draft.brandSlug })
            .select('id')
            .single();
          if (error) throw error;
          brandId = data.id;
          brandCache.set(draft.brandSlug, brandId);
        }
      }

      const rangeKey = `${brandId}::${draft.rangeSlug}`;
      let rangeId = rangeCache.get(rangeKey);
      if (!rangeId) {
        if (DRY) {
          rangeId = `dry-range-${draft.rangeSlug}`;
        } else {
          const { data, error } = await supabase
            .from('product_ranges')
            .insert({
              name: draft.rangeName,
              slug: draft.rangeSlug,
              brand_id: brandId,
              category: draft.category,
            })
            .select('id')
            .single();
          if (error) throw error;
          rangeId = data.id;
          rangeCache.set(rangeKey, rangeId);
        }
      }

      const candidate = {
        name: draft.name,
        brand: brandId,
        product_range: rangeId,
        productRange: rangeId,
      };
      const duplicate = findDuplicate(products || [], candidate);
      const id = duplicate?.id || crypto.randomUUID();

      const row = {
        id,
        name: draft.name,
        description: duplicate?.description && !isWeakProductDescription(duplicate.description, draft.name)
          ? duplicate.description
          : '',
        price: draft.price,
        category: draft.category,
        brand: brandId,
        product_range: rangeId,
        condition: draft.condition,
        image: draft.image || DEFAULT_IMAGE,
        stock: duplicate?.stock ?? draft.stock,
        rating: duplicate?.rating ?? 5,
        specs: mergeSpecs(duplicate?.specs, draft.specs),
        warranty_months: draft.warrantyMonths,
        is_featured: duplicate?.is_featured ?? false,
        isPromo: duplicate?.isPromo ?? false,
        pros: duplicate?.pros || [],
        cons: duplicate?.cons || [],
        images: duplicate?.images || [],
      };

      if (DRY) {
        console.log(`[dry-run] ${duplicate ? 'update' : 'create'} ${draft.name}`);
        continue;
      }

      const { error: upErr } = await supabase.from('products').upsert(row);
      if (upErr) throw upErr;

      if (duplicate) report.updated += 1;
      else report.created += 1;

      if (!NO_ENRICH && productNeedsEnrichment(row)) {
        const enriched = await enrichDeepSeek(row);
        if (Object.keys(enriched).length) {
          const { error: enrErr } = await supabase.from('products').update(enriched).eq('id', id);
          if (enrErr) throw enrErr;
          report.enriched += 1;
          console.log(`✓ enrich ${draft.name}`);
        }
        await sleep(DELAY_MS);
      } else {
        console.log(`✓ ${duplicate ? 'update' : 'create'} ${draft.name}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      report.errors.push({ name: draft.name, error: msg });
      console.error(`✗ ${draft.name}: ${msg}`);
    }
  }

  const logPath = join(root, 'data/product-ingestion-log.json');
  writeFileSync(
    logPath,
    JSON.stringify({ at: new Date().toISOString(), file: filePath, report }, null, 2),
    'utf8',
  );
  console.log('\n--- Résumé ---');
  console.log(`Créés: ${report.created} | MAJ: ${report.updated} | Enrichis: ${report.enriched} | Erreurs: ${report.errors.length}`);
  console.log(`Log: ${logPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

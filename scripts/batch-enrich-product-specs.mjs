/**
 * Enrichit specs + pros + cons par lot (marque).
 *
 * Usage:
 *   node scripts/batch-enrich-product-specs.mjs --batch=apple --dry-run
 *   node scripts/batch-enrich-product-specs.mjs --batch=samsung --apply
 *   node scripts/batch-enrich-product-specs.mjs --batch=all --apply
 *   node scripts/batch-enrich-product-specs.mjs --descriptions-only --apply
 *   node scripts/batch-enrich-product-specs.mjs --provider=deepseek --refine-catalog --apply
 *
 * Lots: apple | samsung | google | xiaomi | infinix | tecno | legacy | all
 * Provider par défaut: deepseek (gemini optionnel via --provider=gemini)
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  isWeakProductDescription,
  isFluffyDescription,
  hasRichSpecs,
  descriptionSpecsConsistent,
} from './productDescription.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const APPLY = process.argv.includes('--apply');
// --preview : génère via l'API mais écrit un avant/après dans un fichier, sans toucher la prod.
const PREVIEW = process.argv.includes('--preview');
const DRY = !APPLY && !PREVIEW;
const REFINE_CATALOG = process.argv.includes('--refine-catalog');
const DESCRIPTIONS_ONLY = process.argv.includes('--descriptions-only');
// --include-fluffy : cible aussi les descriptions longues-mais-sans-faits (opt-in).
const INCLUDE_FLUFFY = process.argv.includes('--include-fluffy');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0;
const batchArg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_ID = batchArg?.split('=')[1] || 'all';
const providerArg = process.argv.find((a) => a.startsWith('--provider='));
const PROVIDER = providerArg?.split('=')[1] || 'deepseek';
const DELAY_MS = Number(process.env.BATCH_ENRICH_DELAY_MS || 3000);

const GEMINI_MODEL =
  process.env.BATCH_ENRICH_MODEL?.trim() ||
  process.env.GEMINI_TEXT_MODEL?.trim() ||
  'gemini-2.5-flash';
const GEMINI_KEY =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.VITE_GEMINI_API_KEY?.trim() ||
  process.env.API_KEY?.trim();
const DEEPSEEK_KEY =
  process.env.DEEPSEEK_API_KEY?.trim() || process.env.VITE_DEEPSEEK_API_KEY?.trim() || '';
const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL?.trim() || process.env.VITE_DEEPSEEK_MODEL?.trim() || 'deepseek-chat';

const COMMERCIAL_KEYS = ['stockage', 'origine', 'source', 'sim', 'conditionnement', 'condition', 'ram'];

const BATCHES = {
  apple: {
    label: 'Apple / iPhone',
    match: (p) => /iphone|apple/i.test(p.name) || /apple/i.test(p.brandSlug || ''),
  },
  samsung: {
    label: 'Samsung / Galaxy',
    match: (p) =>
      /samsung|galaxie|galaxy/i.test(p.name) ||
      /samsung/i.test(p.brandSlug || '') ||
      /^(s\d|galaxie|galaxy)/i.test(p.name.trim()),
  },
  google: {
    label: 'Google Pixel',
    match: (p) => /pixel|google/i.test(p.name) || /google|pixel/i.test(p.brandSlug || ''),
  },
  xiaomi: {
    label: 'Xiaomi / Redmi',
    match: (p) => /xiaomi|redmi|poco/i.test(p.name) || /xiaomi/i.test(p.brandSlug || ''),
  },
  infinix: {
    label: 'Infinix',
    match: (p) => /infinix/i.test(p.name) || /infinix/i.test(p.brandSlug || ''),
  },
  tecno: {
    label: 'Tecno',
    match: (p) => /tecno/i.test(p.name) || /tecno/i.test(p.brandSlug || ''),
  },
  legacy: {
    label: 'Autres / accessoires / PC',
    match: () => false, // résolu via resolveBatch()
  },
};

function resolveBatch(p) {
  for (const [key, batch] of Object.entries(BATCHES)) {
    if (key === 'legacy') continue;
    if (batch.match(p)) return key;
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
  const rich = ['écran', 'processeur', 'appareil photo', 'batterie', 'réseau', 'os', 'puissance', 'taille'];
  if (labels.some((l) => rich.some((r) => l.includes(r)))) return false;
  return labels.every((l) =>
    COMMERCIAL_KEYS.some((k) => l.includes(k)) || l === 'notes',
  );
}

function needsEnrichment(p) {
  if (isWeakProductDescription(p.description, p.name)) return true;
  const specs = p.specs || [];
  const hasProsCons =
    Array.isArray(p.pros) && p.pros.length > 0 && Array.isArray(p.cons) && p.cons.length > 0;
  if (!hasValidSpecs(specs) || isMinimalSpecs(specs)) return true;
  if (!hasProsCons) return true;
  return false;
}

function isGenericCatalogSpecs(p) {
  const vals = (p.specs || []).map((s) => `${s.label} ${s.value}`).join(' ').toLowerCase();
  return /selon modèle|selon variante|à 6\.|4 à 8|6\.4 à 6\.7|milieu de gamme|entrée de gamme|selon modèle|\/ exynos|\/ dimensity|snapdragon \//.test(
    vals,
  );
}

function loadCatalogRefineNames() {
  const catalogLog = join(root, 'data/batch-enrich-catalog-log.json');
  if (!existsSync(catalogLog)) return new Set();
  const data = JSON.parse(readFileSync(catalogLog, 'utf8'));
  return new Set((data.updated || []).map((e) => (e.name || '').trim()).filter(Boolean));
}

function parseEnrichmentJson(text, mode = 'full') {
  const parsed = JSON.parse(text || '{}');
  const base = {
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    reviewShort: typeof parsed.reviewShort === 'string' ? parsed.reviewShort.trim() : '',
    specs: Array.isArray(parsed.specs) ? parsed.specs : [],
    pros: Array.isArray(parsed.pros) ? parsed.pros.filter(Boolean).slice(0, 3) : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons.filter(Boolean).slice(0, 2) : [],
  };
  if (mode === 'descriptions') return base;
  return {
    ...base,
    manualChecks: Array.isArray(parsed.manualChecks)
      ? parsed.manualChecks.filter(Boolean).slice(0, 6)
      : [],
  };
}

function mergeSpecs(existing, generated, refine = false) {
  const map = new Map();
  if (!refine) {
    for (const s of existing || []) {
      if (s?.label && s?.value) map.set(s.label.toLowerCase().trim(), s);
    }
  } else {
    for (const s of existing || []) {
      const key = (s.label || '').toLowerCase().trim();
      if (!key || !s.value) continue;
      if (COMMERCIAL_KEYS.some((k) => key.includes(k))) map.set(key, s);
    }
  }
  for (const s of generated || []) {
    const key = (s.label || '').toLowerCase().trim();
    if (!key || !s.value) continue;
    const isCommercial = COMMERCIAL_KEYS.some((k) => key.includes(k));
    if (isCommercial && map.has(key)) continue;
    map.set(key, { label: s.label.trim(), value: s.value.trim() });
  }
  return Array.from(map.values()).slice(0, 12);
}

function buildPrompt(product) {
  const existingSpecs = (product.specs || [])
    .map((s) => `${s.label}: ${s.value}`)
    .join('\n');
  const desc = (product.description || '').trim();
  const weakDesc = isWeakProductDescription(desc, product.name);

  return `
Tu es le persona "Product Enricher" de Xeption (high-tech Cameroun).

Produit: ${product.name}
Catégorie: ${product.category}
${!weakDesc && desc ? `Description existante (à respecter pour specs/pros/cons):\n${desc}` : ''}
${existingSpecs ? `Specs déjà connues (à conserver si correctes):\n${existingSpecs}` : ''}

Génère UNIQUEMENT un JSON avec:
${weakDesc ? '- description: 3 à 4 phrases FAITS D\'ABORD (specs concrètes en premier), ancrées uniquement dans le nom/specs connus (n\'invente aucune spec), au plus 1 accroche de marque — JAMAIS "Import Mfoundi Mall", "Mfoundi" ni stub d\'import\n- reviewShort: 1 phrase vendable' : ''}
- specs: 4 à 8 entrées {label, value} — écran, processeur, RAM, stockage (variante exacte du nom), appareil photo, batterie, réseau/OS si pertinent
- pros: 3 points forts max, en français, concrets
- cons: 2 points faibles max, honnêtes

Règles:
- Variante précise (128 vs 256 Go, scellé vs non scellé) = respecter le nom et les specs existantes
- Ne pas inventer des specs critiques si incertain
- Labels specs en français court (ex: "Écran", "Processeur", "RAM", "Stockage")
- Ton expert, commercial, crédible pour le marché camerounais
${REFINE_CATALOG ? '- Remplace les specs génériques ("selon modèle", fourchettes) par des valeurs précises pour CE produit exact' : ''}
`.trim();
}

function buildDescriptionPrompt(product) {
  const existingSpecs = (product.specs || [])
    .map((s) => `${s.label}: ${s.value}`)
    .join('\n');

  return `
Tu es le persona "Product Enricher" de Xeption (high-tech Cameroun).

Produit: ${product.name}
Catégorie: ${product.category}
${existingSpecs ? `Specs connues:\n${existingSpecs}` : '(aucune spec fournie)'}

Génère UNIQUEMENT un JSON:
{
  "description": "3 à 4 phrases, faits d'abord, en français",
  "reviewShort": "1 phrase vendable"
}

Style Xeption : "Mboa punchy + faits". Ton camerounais vivant et vendeur, MAIS toujours
adossé à des faits concrets. On garde l'énergie de la marque, on supprime le vide.

Règles de rédaction (optimisées pour l'extraction par les IA / GEO):
- FAITS D'ABORD : la 1re phrase donne les caractéristiques concrètes clés (écran, processeur,
  batterie, appareil photo, stockage…) reprises des "Specs connues", pas des adjectifs.
- ANCRAGE STRICT (exactitude) : n'utilise QUE des informations présentes dans le nom ou les
  "Specs connues". N'INVENTE JAMAIS une spec, un chiffre, une techno ou une capacité absente
  de la liste. Si une donnée manque, ne la mentionne pas — ne comble pas avec ta mémoire.
- Ensuite : 1 phrase d'usage concret (à qui / pour quoi ça sert au Cameroun), puis 1 accroche
  punchy façon Mboa (ton Xeption). L'énergie est OK ; les superlatifs SANS fait derrière, non.
- Chaque affirmation "punchy" doit s'appuyer sur une spec réelle (ex : "5000 mAh = 2 jours
  sans chargeur", pas "autonomie de fou" sortie de nulle part).
- JAMAIS "Import Mfoundi Mall", "Mfoundi Mall", "MFOUNDI" comme texte principal.
- Respecte la variante exacte du nom (stockage, scellé/non scellé, origine si dans le nom).
`.trim();
}

async function generateEnrichmentDeepSeek(product, mode = 'full') {
  const prompt =
    mode === 'descriptions' ? buildDescriptionPrompt(product) : buildPrompt(product);
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: mode === 'descriptions' ? 500 : 1400,
          temperature: 0.15,
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
      return parseEnrichmentJson(text, mode);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429') || msg.includes('fetch failed') || msg.includes('503')) {
        const wait = 10000 * (attempt + 1);
        console.log(`  … retry DeepSeek dans ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function generateEnrichmentGemini(ai, product, mode = 'full') {
  // Mode descriptions : schéma + prompt dédiés (facts-first), pas d'enrichissement specs.
  const schema =
    mode === 'descriptions'
      ? {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            reviewShort: { type: Type.STRING },
          },
          required: ['description', 'reviewShort'],
        }
      : {
          type: Type.OBJECT,
          properties: {
            specs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['label', 'value'],
              },
            },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            manualChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['specs', 'pros', 'cons', 'manualChecks'],
        };

  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: mode === 'descriptions' ? buildDescriptionPrompt(product) : buildPrompt(product),
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      return parseEnrichmentJson(response.text || '{}', mode);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('fetch failed')
      ) {
        const wait = 10000 * (attempt + 1);
        console.log(`  … retry dans ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (PROVIDER === 'gemini' && !GEMINI_KEY) throw new Error('Missing GEMINI_API_KEY in .env');
  if (PROVIDER === 'deepseek' && !DEEPSEEK_KEY) {
    throw new Error('Missing DEEPSEEK_API_KEY in .env');
  }
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');

  const supabase = createClient(url, key);
  const ai = PROVIDER === 'gemini' ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

  const { data: brands } = await supabase.from('brands').select('id,slug');
  const brandSlugById = new Map((brands || []).map((b) => [b.id, b.slug]));

  const { data: products, error } = await supabase
    .from('products')
    .select('id,name,category,description,reviewShort,specs,pros,cons,brand');
  if (error) throw error;

  const enriched = products.map((p) => ({
    ...p,
    brandSlug: brandSlugById.get(p.brand) || '',
  }));

  const catalogNames = REFINE_CATALOG ? loadCatalogRefineNames() : new Set();
  let targets = DESCRIPTIONS_ONLY
    ? enriched.filter(
        (p) =>
          // Description vide/stub → toujours à (re)générer.
          isWeakProductDescription(p.description, p.name) ||
          // Fluff → réécriture facts-first UNIQUEMENT si les specs sont assez riches
          // (gate #2 : sinon le modèle comblerait avec sa mémoire).
          (INCLUDE_FLUFFY && isFluffyDescription(p.description, p.specs) && hasRichSpecs(p.specs)),
      )
    : REFINE_CATALOG
      ? enriched.filter(
          (p) => catalogNames.has(p.name.trim()) || isGenericCatalogSpecs(p),
        )
      : enriched.filter(needsEnrichment);

  const batchOrder =
    BATCH_ID === 'all' ? Object.keys(BATCHES) : [BATCH_ID];

  if (BATCH_ID !== 'all' && !BATCHES[BATCH_ID]) {
    throw new Error(`Unknown batch: ${BATCH_ID}`);
  }

  // Ne garder que les cibles appartenant aux lots demandés, PUIS limiter
  // (sinon --limit couperait sur des produits d'autres lots / legacy ignorés).
  targets = targets.filter((p) => batchOrder.includes(resolveBatch(p)));
  if (LIMIT) targets = targets.slice(0, LIMIT);

  const logPath = join(root, 'data/batch-enrich-specs-log.json');
  let log = existsSync(logPath)
    ? JSON.parse(readFileSync(logPath, 'utf8'))
    : { runs: [] };

  const previewRows = [];
  const run = {
    at: new Date().toISOString(),
    mode: PREVIEW ? 'preview' : DRY ? 'dry-run' : 'applied',
    batch: BATCH_ID,
    provider: PROVIDER,
    refineCatalog: REFINE_CATALOG,
    descriptionsOnly: DESCRIPTIONS_ONLY,
    updated: [],
    skipped: [],
    failed: [],
  };

  console.log(
    `Provider: ${PROVIDER}${PROVIDER === 'gemini' ? ` (${GEMINI_MODEL})` : ` (${DEEPSEEK_MODEL})`}`,
  );
  if (REFINE_CATALOG) console.log(`Mode refine-catalog — ${targets.length} produits ciblés`);
  if (DESCRIPTIONS_ONLY) console.log(`Mode descriptions-only — ${targets.length} produits (stubs Mfoundi / vides)`);

  const enrichMode = DESCRIPTIONS_ONLY ? 'descriptions' : 'full';

  for (const batchKey of batchOrder) {
    const batch = BATCHES[batchKey];
    const batchProducts = targets.filter((p) => resolveBatch(p) === batchKey);

    console.log(`\n=== Lot ${batchKey} (${batch.label}) — ${batchProducts.length} produits ===`);

    for (const product of batchProducts) {
      if (DRY) {
        console.log(`[dry-run] ${product.name}`);
        run.updated.push({ batch: batchKey, name: product.name, id: product.id });
        continue;
      }

      try {
        const gen =
          PROVIDER === 'deepseek'
            ? await generateEnrichmentDeepSeek(product, enrichMode)
            : await generateEnrichmentGemini(ai, product, enrichMode);

        const weakDesc = isWeakProductDescription(product.description, product.name);
        const payload = {};

        if (DESCRIPTIONS_ONLY) {
          if (!gen.description || isWeakProductDescription(gen.description, product.name)) {
            throw new Error('description générée invalide ou stub');
          }
          // Garde-fou #1 (exactitude) : rejette toute spec chiffrée absente de la base.
          const cons = descriptionSpecsConsistent(gen.description, product.specs, product.name);
          if (!cons.ok) {
            throw new Error(`spec inventée hors base: ${cons.offending.join(', ')}`);
          }
          payload.description = gen.description;
          if (gen.reviewShort) payload.reviewShort = gen.reviewShort;
          if (PREVIEW) {
            previewRows.push({
              name: product.name,
              old: product.description || '',
              new: gen.description,
              reviewShort: gen.reviewShort || '',
            });
            console.log(`≈ [preview] ${product.name}`);
            await sleep(DELAY_MS);
            continue;
          }
        } else {
          payload.specs = mergeSpecs(product.specs, gen.specs, REFINE_CATALOG);
          if (gen.pros.length) payload.pros = gen.pros;
          else if (product.pros?.length) payload.pros = product.pros;
          if (gen.cons.length) payload.cons = gen.cons;
          else if (product.cons?.length) payload.cons = product.cons;
          if (
            weakDesc &&
            gen.description &&
            !isWeakProductDescription(gen.description, product.name) &&
            descriptionSpecsConsistent(gen.description, product.specs, product.name).ok
          ) {
            payload.description = gen.description;
          }
          if (gen.reviewShort) payload.reviewShort = gen.reviewShort;
        }

        if (PREVIEW) {
          previewRows.push({
            name: product.name,
            old: product.description || '',
            new: payload.description || product.description || '',
            reviewShort: payload.reviewShort || '',
          });
          console.log(`≈ [preview] ${product.name}`);
          await sleep(DELAY_MS);
          continue;
        }

        const { error: upErr } = await supabase.from('products').update(payload).eq('id', product.id);
        if (upErr) throw new Error(upErr.message);

        const detail = DESCRIPTIONS_ONLY
          ? 'description'
          : `${payload.specs?.length ?? product.specs?.length ?? 0} specs`;
        console.log(`✓ ${product.name} (${detail})`);
        run.updated.push({
          batch: batchKey,
          id: product.id,
          name: product.name,
          specCount: payload.specs?.length,
          hasDescription: Boolean(payload.description),
        });
        await sleep(DELAY_MS);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`✗ ${product.name}: ${msg}`);
        run.failed.push({ batch: batchKey, id: product.id, name: product.name, error: msg });
        await sleep(DELAY_MS);
      }
    }
  }

  log.runs.push(run);
  writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');

  if (PREVIEW && previewRows.length) {
    const md =
      `# Aperçu descriptions — ${new Date().toISOString()}\n\n` +
      `Provider: ${PROVIDER} (${GEMINI_MODEL}) · ${previewRows.length} produit(s) · NON appliqué en prod.\n\n` +
      previewRows
        .map(
          (r) =>
            `## ${r.name}\n\n` +
            `**Avant :**\n\n> ${(r.old || '(vide)').replace(/\n+/g, ' ')}\n\n` +
            `**Après :**\n\n> ${r.new.replace(/\n+/g, ' ')}\n\n` +
            (r.reviewShort ? `_reviewShort : ${r.reviewShort}_\n` : ''),
        )
        .join('\n---\n\n');
    const previewPath = join(root, 'data/descriptions-preview.md');
    writeFileSync(previewPath, md, 'utf8');
    console.log(`\nAperçu écrit : ${previewPath} (${previewRows.length} produit(s), prod NON modifiée)`);
  }

  console.log('\n--- Résumé ---');
  console.log(`OK: ${run.updated.length} | Échecs: ${run.failed.length}`);
  console.log(`Log: ${logPath}`);
  if (DRY) console.log('Mode dry-run — relancer avec --preview (aperçu) ou --apply (prod)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

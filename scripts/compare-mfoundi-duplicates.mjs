/**
 * Compare import Mfoundi vs anciens produits (noms non strictement identiques).
 * Usage: node scripts/compare-mfoundi-duplicates.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const catalog = JSON.parse(
  readFileSync(join(root, 'data/mfoundi-mall-catalog.json'), 'utf8'),
);

const BRAND_SLUG = {
  Google: 'google-pixel',
  Apple: 'apple',
  Samsung: 'samsung',
  Xiaomi: 'xiaomi',
  Infinix: 'infinix',
  Tecno: 'tecno',
};

function normalizeKey(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/galaxy/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function modelKey(brand, model) {
  const b = (brand || '').toLowerCase();
  const m = normalizeKey(model || '');
  return `${b}::${m}`;
}

function extractTokens(name) {
  const n = normalizeKey(name);
  const storage = n.match(/\b(\d+)\s*(go|gb|giga)\b/);
  const ram = n.match(/\b(\d+)\s*(gb\s*ram|go\s*ram|gb\s*ram)\b/) ||
    n.match(/\b(\d+)\s*gb\s*ram\b/);
  const models = [];
  const iphone = n.match(/iphone\s*(xr|xs|se)?\s*(\d{1,2})?\s*(pro)?\s*(max)?/);
  if (iphone) {
    models.push(
      `iphone ${iphone[1] || ''} ${iphone[2] || ''} ${iphone[3] || ''} ${iphone[4] || ''}`.replace(/\s+/g, ' ').trim(),
    );
  }
  const galaxy = n.match(
    /(s\d{1,2}\s*\+?|s\d{1,2}\s*ultra|a\d{2,3}|m\d{2,3}|z\s*flip\s*\d+|z\s*fold\s*\d+|note\s*\d+)/,
  );
  if (galaxy) models.push(`galaxy ${galaxy[1]}`.replace(/\s+/g, ' '));
  const pixel = n.match(/pixel\s*(\d+\s*[a-z]*\s*(pro)?\s*(xl|max|fold)?)/);
  if (pixel) models.push(`pixel ${pixel[1]}`.replace(/\s+/g, ' '));
  const redmi = n.match(/redmi\s*([a-z0-9\s]+?)(?:\s+\d|$)/);
  if (redmi) models.push(`redmi ${redmi[1]}`.trim());
  const spark = n.match(/spark\s*(\d+)/);
  if (spark) models.push(`spark ${spark[1]}`);
  const pop = n.match(/pop\s*(\d+)/);
  if (pop) models.push(`pop ${pop[1]}`);
  const hot = n.match(/hot\s*(\d+[a-z]*)/);
  if (hot) models.push(`hot ${hot[1]}`);
  const smart = n.match(/smart\s*(\d+)/);
  if (smart) models.push(`smart ${smart[1]}`);

  return {
    storage: storage ? parseInt(storage[1], 10) : null,
    ram: ram ? parseInt(ram[1], 10) : null,
    tokens: models,
    full: n,
  };
}

function buildImportSignature(row) {
  const [cat, brand, model, storage, ram] = row;
  const sig = {
    brand: brand.toLowerCase(),
    brandSlug: BRAND_SLUG[brand] || normalizeKey(brand).replace(/\s+/g, '-'),
    model: normalizeKey(model),
    storage: storage ?? null,
    ram: ram ?? null,
    importName: buildImportName(row),
    source: row[11],
  };
  sig.key = `${sig.brand}::${sig.model}::${sig.storage || ''}::${sig.ram || ''}`;
  return sig;
}

function buildImportName(row) {
  const [, brand, model, storage, ram, packaging, sim, origin] = row;
  const parts = [brand, model];
  if (storage) parts.push(`${storage} Go`);
  if (ram) parts.push(`${ram} GB RAM`);
  if (packaging === 'scelle') parts.push('Scellé');
  if (packaging === 'non_scelle') parts.push('Non scellé');
  if (sim) parts.push(sim);
  if (origin) parts.push(`(${origin})`);
  return parts.join(' ');
}

function scoreMatch(importSig, product, brandNameById) {
  const name = product.name || '';
  const desc = (product.description || '').toLowerCase();
  const isImport = desc.includes('mfoundi mall') || desc.includes('import mfoundi');
  if (isImport) return 0;

  const brandName = brandNameById[product.brand] || '';
  const t = extractTokens(name);
  const importModel = importSig.model;
  const importBrand = importSig.brand;

  let score = 0;
  const nameNorm = normalizeKey(name);
  const brandInName =
    nameNorm.includes(importBrand) ||
    (importBrand === 'google' && nameNorm.includes('pixel')) ||
    (importBrand === 'apple' && nameNorm.includes('iphone'));

  if (!brandInName && brandName) {
    const bn = brandName.toLowerCase();
    if (!nameNorm.includes(bn.split(' ')[0])) score -= 5;
  }

  if (nameNorm.includes(importModel.replace(/plus/g, '+').split(' ').filter(Boolean).join(' '))) {
    score += 40;
  } else if (importModel.includes('iphone') && nameNorm.includes('iphone')) {
    const im = importModel.match(/iphone\s*(\d{1,2})?\s*(pro)?\s*(max)?/);
    const nm = nameNorm.match(/iphone\s*(\d{1,2})?\s*(pro)?\s*(max)?/);
    if (im && nm && im[1] === nm[1]) {
      score += 30;
      if (im[2] === nm[2]) score += 10;
      if (im[3] === nm[3]) score += 10;
    } else if (importModel.includes('xr') && nameNorm.includes('xr')) score += 35;
  } else if (importModel.includes('galaxy') && nameNorm.includes('galaxy') || nameNorm.includes('s21') || nameNorm.includes('s23')) {
    score += 25;
    const modelPart = importModel.replace('galaxy ', '');
    if (nameNorm.includes(modelPart.replace(/\s+/g, '')) || nameNorm.includes(modelPart.replace(/\s+/g, ' '))) score += 15;
  } else if (importBrand === 'google' && nameNorm.includes('pixel')) {
    score += 25;
    if (nameNorm.includes(importModel.replace('pixel ', ''))) score += 15;
  } else if (nameNorm.includes(importModel.split(' ').slice(-1)[0])) {
    score += 15;
  }

  if (importSig.storage && t.storage) {
    score += importSig.storage === t.storage ? 20 : -10;
  } else if (importSig.storage && nameNorm.includes(String(importSig.storage))) {
    score += 15;
  }

  if (importSig.ram && t.ram && importSig.ram === t.ram) score += 8;

  return score;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: products, error } = await supabase.from('products').select('id,name,price,stock,brand,product_range,description,image');
  if (error) throw error;

  const { data: brands } = await supabase.from('brands').select('id,name');
  const brandNameById = Object.fromEntries((brands || []).map((b) => [b.id, b.name]));

  const importRows = catalog.rows.map(buildImportSignature);
  const legacy = products.filter(
    (p) => !(p.description || '').toLowerCase().includes('mfoundi mall'),
  );

  const matches = [];
  const noMatch = [];

  for (const imp of importRows) {
    const scored = legacy
      .map((p) => ({ product: p, score: scoreMatch(imp, p, brandNameById) }))
      .filter((x) => x.score >= 35)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      matches.push({
        importName: imp.importName,
        importKey: imp.key,
        importPrice: catalog.rows.find((r) => buildImportName(r) === imp.importName)?.[8],
        legacy: scored.map((s) => ({
          score: s.score,
          name: s.product.name,
          price: s.product.price,
          stock: s.product.stock,
          id: s.product.id,
        })),
      });
    } else {
      noMatch.push(imp.importName);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalProductsInDb: products.length,
    legacyCount: legacy.length,
    importCatalogRows: importRows.length,
    importInDb: products.filter((p) =>
      (p.description || '').toLowerCase().includes('mfoundi mall'),
    ).length,
    probableOverlaps: matches.length,
    matches,
    importOnlyNoLegacyMatch: noMatch,
  };

  const outJson = join(root, 'data/mfoundi-legacy-overlap-report.json');
  const outMd = join(root, 'data/MFOUNDI_LEGACY_OVERLAP.md');
  writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

  let md = `# Doublons potentiels — Import Mfoundi vs ancien catalogue\n\n`;
  md += `Généré : ${report.generatedAt}\n\n`;
  md += `| Métrique | Valeur |\n|---------|--------|\n`;
  md += `| Produits en BD | ${report.totalProductsInDb} |\n`;
  md += `| Anciens (hors Mfoundi) | ${report.legacyCount} |\n`;
  md += `| Lignes import JSON | ${report.importCatalogRows} |\n`;
  md += `| En BD avec desc Mfoundi | ${report.importInDb} |\n`;
  md += `| Imports avec ancien équivalent | ${report.probableOverlaps} |\n\n`;

  md += `## Correspondances probable (nom différent)\n\n`;
  for (const m of matches) {
    md += `### Import : ${m.importName}\n`;
    md += `- Prix import : ${m.importPrice?.toLocaleString('fr-FR')} FCFA\n`;
    for (const l of m.legacy) {
      md += `- **Ancien** (score ${l.score}) : ${l.name} — ${l.price?.toLocaleString('fr-FR')} FCFA, stock ${l.stock}\n`;
    }
    md += '\n';
  }

  md += `## Imports sans ancien équivalent détecté (${noMatch.length})\n\n`;
  md += noMatch.map((n) => `- ${n}`).join('\n');

  writeFileSync(outMd, md, 'utf8');
  console.log(`Overlap: ${matches.length}/${importRows.length}`);
  console.log(`Written: ${outMd}`);
  console.log(`Written: ${outJson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

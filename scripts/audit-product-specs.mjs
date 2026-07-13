/**
 * Audit specs/pros/cons — ce qui manque en BD.
 * Usage: node scripts/audit-product-specs.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const RICH_LABELS = [
  'écran', 'processeur', 'ram', 'appareil photo', 'batterie', 'réseau', 'os',
  'puissance', 'taille', 'résolution',
];

function hasValidSpecs(specs) {
  return (
    Array.isArray(specs) &&
    specs.length > 0 &&
    specs.some((s) => (s.label || '').trim() && (s.value || '').trim())
  );
}

function isRichSpecs(specs) {
  if (!hasValidSpecs(specs)) return false;
  const labels = specs.map((s) => (s.label || '').toLowerCase());
  return RICH_LABELS.some((k) => labels.some((l) => l.includes(k)));
}

function isMfoundiMinimal(specs) {
  if (!hasValidSpecs(specs)) return false;
  const labels = specs.map((s) => (s.label || '').toLowerCase());
  const onlyImport =
    labels.length <= 4 &&
    labels.every((l) =>
      ['stockage', 'origine', 'source', 'notes', 'condition'].some((x) => l.includes(x)),
    );
  return onlyImport;
}

function hasProsCons(p) {
  return Array.isArray(p.pros) && p.pros.length > 0 && Array.isArray(p.cons) && p.cons.length > 0;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);
  const { data: products, error } = await supabase
    .from('products')
    .select('id,name,category,description,specs,pros,cons');
  if (error) throw error;

  const empty = [];
  const minimal = [];
  const richNoPros = [];
  const complete = [];

  for (const p of products) {
    const mfoundi = (p.description || '').toLowerCase().includes('mfoundi mall');
    const row = { name: p.name, category: p.category, mfoundi, specCount: (p.specs || []).length };

    if (!hasValidSpecs(p.specs)) {
      empty.push(row);
    } else if (isMfoundiMinimal(p.specs)) {
      minimal.push({ ...row, specs: p.specs });
    } else if (isRichSpecs(p.specs) && !hasProsCons(p)) {
      richNoPros.push(row);
    } else if (hasProsCons(p)) {
      complete.push(row);
    } else {
      minimal.push({ ...row, specs: p.specs, note: 'specs partiels' });
    }
  }

  const report = {
    at: new Date().toISOString(),
    total: products.length,
    summary: {
      empty_specs: empty.length,
      minimal_import_specs: minimal.length,
      rich_specs_no_pros_cons: richNoPros.length,
      complete_with_pros_cons: complete.length,
    },
    empty,
    minimal,
    richNoPros,
  };

  const out = join(root, 'data/product-specs-audit.json');
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Total produits: ${products.length}`);
  console.log(`Sans specs: ${empty.length}`);
  console.log(`Specs import minimal (Stockage/Origine/Source): ${minimal.length}`);
  console.log(`Specs riches sans pros/cons: ${richNoPros.length}`);
  console.log(`Complets (specs + pros + cons): ${complete.length}`);
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

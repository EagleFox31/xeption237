/**
 * Corrige des caractéristiques produit (products.specs) depuis un fichier
 * déclaratif data/spec-corrections/<nom>.json, sourcé fabricant.
 *
 * Idempotent : calcule l'état désiré, n'écrit que les produits dont les specs
 * diffèrent. Dry-run par défaut ; `--apply` pour écrire.
 *
 * Usage :
 *   node scripts/apply-spec-corrections.mjs data/spec-corrections/redmi-a5.json [--apply]
 *
 * Format :
 *   { "match": { "nameIlike": "%redmi a5%" } | { "ids": ["uuid"] },
 *     "set": [{ "label", "value" }],   // remplace ou ajoute (label insensible casse/accents)
 *     "remove": ["label"] }            // labels obsolètes à retirer
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env') });

const fileArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
if (!fileArg) {
  console.error('Usage : node scripts/apply-spec-corrections.mjs <fichier.json> [--apply]');
  process.exit(1);
}

const correction = JSON.parse(readFileSync(resolve(root, fileArg), 'utf8'));
const normLabel = (label = '') =>
  label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const applySpecPatch = (specs, { set = [], remove = [] }) => {
  const removed = new Set(remove.map(normLabel));
  const next = (Array.isArray(specs) ? specs : []).filter((s) => !removed.has(normLabel(s.label)));
  for (const patch of set) {
    const idx = next.findIndex((s) => normLabel(s.label) === normLabel(patch.label));
    if (idx >= 0) next[idx] = { ...next[idx], value: patch.value };
    else next.push({ label: patch.label, value: patch.value });
  }
  return next;
};

const client = new pg.Client({ connectionString: resolveDatabaseUrl(root), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { match = {} } = correction;
  const { rows } = match.ids?.length
    ? await client.query('select id, name, specs from products where id = any($1::uuid[])', [match.ids])
    : await client.query('select id, name, specs from products where name ilike $1', [match.nameIlike]);

  if (!rows.length) console.warn('[spec-corrections] aucun produit ne correspond.');
  let changed = 0;
  for (const row of rows) {
    const next = applySpecPatch(row.specs, correction);
    if (JSON.stringify(next) === JSON.stringify(row.specs)) {
      console.log(`= ${row.name} (${row.id}) déjà conforme`);
      continue;
    }
    changed += 1;
    console.log(`~ ${row.name} (${row.id})`);
    console.log(`  avant : ${JSON.stringify(row.specs)}`);
    console.log(`  après : ${JSON.stringify(next)}`);
    if (apply) {
      await client.query('update products set specs = $1::jsonb, updated_at = now() where id = $2', [
        JSON.stringify(next),
        row.id,
      ]);
    }
  }
  console.log(`[spec-corrections] ${changed} produit(s) à corriger${apply ? ' — appliqué' : ' — dry-run (ajouter --apply)'}`);
} finally {
  await client.end();
}

/**
 * Splits the Osmocom TAC CSV into small SQL files for Supabase SQL Editor.
 * Usage: node scripts/import_tacdb.mjs
 * Output: supabase/tacdb_batches/batch_000.sql ... batch_NNN.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH    = path.join(__dirname, '..', 'tacdb.csv');
const OUTPUT_DIR  = path.join(__dirname, '..', 'supabase', 'tacdb_batches');
const ROWS_PER_FILE = 1500; // ~90KB par fichier, confortable pour le SQL Editor

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const escape = (s) => (s || '').replace(/'/g, "''");

// Parse CSV
const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split('\n').filter(Boolean).slice(2); // skip licence + header

const rows = [];
for (const line of lines) {
  const cols = parseCsvLine(line);
  const tac   = (cols[0] || '').trim();
  const brand = (cols[1] || '').trim();
  const model = (cols[2] || '').trim();
  if (!/^\d{6,8}$/.test(tac) || !brand) continue;
  rows.push({
    tac: tac.padStart(8, '0'),
    brand,
    model: model ? `${brand} ${model}` : brand,
  });
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Batch 000 = contrainte uniquement (à lancer en premier)
const constraintSql = `-- BATCH 000 — Contrainte source (À LANCER EN PREMIER)
-- Osmocom TAC Database import — CC-BY-SA v3.0

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tac_cache_source_check'
      AND conrelid = 'public.tac_cache'::regclass
  ) THEN
    ALTER TABLE tac_cache DROP CONSTRAINT tac_cache_source_check;
  END IF;
END $$;

ALTER TABLE tac_cache
  ADD CONSTRAINT tac_cache_source_check
  CHECK (source IN ('imeidb', 'imeicheck', 'imei_info', 'gemini', 'manual', 'osmocom'));

SELECT 'Contrainte mise à jour ✓' AS status;
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'batch_000_constraint.sql'), constraintSql);

// Data batches
const totalBatches = Math.ceil(rows.length / ROWS_PER_FILE);
for (let b = 0; b < totalBatches; b++) {
  const chunk = rows.slice(b * ROWS_PER_FILE, (b + 1) * ROWS_PER_FILE);
  const num = String(b + 1).padStart(3, '0');
  const from = b * ROWS_PER_FILE + 1;
  const to = Math.min((b + 1) * ROWS_PER_FILE, rows.length);

  const values = chunk.map(r =>
    `('${escape(r.tac)}','${escape(r.brand)}','${escape(r.model)}','osmocom',0.85,NOW())`
  ).join(',\n');

  const sql = `-- BATCH ${num} — Lignes ${from} à ${to} (${chunk.length} entrées)
INSERT INTO tac_cache (tac, brand, model, source, confidence, verified_at)
VALUES
${values}
ON CONFLICT (tac) DO NOTHING;

SELECT '${chunk.length} lignes insérées (batch ${num}/${totalBatches}) ✓' AS status;
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, `batch_${num}.sql`), sql);
}

console.log(`✅ ${totalBatches + 1} fichiers générés dans : supabase/tacdb_batches/`);
console.log(`   batch_000_constraint.sql  → à lancer EN PREMIER`);
console.log(`   batch_001.sql … batch_${String(totalBatches).padStart(3, '0')}.sql → dans l'ordre`);
console.log(`   Taille par fichier : ~${Math.round(rows.length / totalBatches * 60 / 1024)} KB`);

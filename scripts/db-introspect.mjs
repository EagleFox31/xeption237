/**
 * Introspection READ-ONLY du schéma Supabase (base prod liée).
 * À lancer AVANT d'écrire une migration — voir AGENTS.md
 * § "RÈGLE — vérifier la base RÉELLE avant d'écrire une migration".
 *
 * N'exécute QUE des SELECT sur les catalogues système (information_schema,
 * pg_indexes, pg_constraint). Aucune écriture, aucun DDL/DML.
 *
 * Usage :
 *   node scripts/db-introspect.mjs <table> [col1,col2,...]
 *   npm run db:introspect -- <table> [col1,col2,...]
 *
 * Exemples :
 *   npm run db:introspect -- trade_in_requests
 *   npm run db:introspect -- trade_in_requests target_product_id,voucher_expires_at
 *
 * Connexion : DATABASE_URL, ou SUPABASE_DB_PASSWORD (+ project ref) dans .env
 * (même logique que scripts/apply-migration.mjs).
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env') });

// ── Arguments ────────────────────────────────────────────────────────────────
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [tableArg, colsArg] = positional;

if (!tableArg) {
  console.error('Usage : node scripts/db-introspect.mjs <table> [col1,col2,...]');
  console.error('Exemple : npm run db:introspect -- trade_in_requests target_product_id,voucher_expires_at');
  process.exit(1);
}
const table = tableArg.replace(/^public\./, '');
const wantedCols = colsArg
  ? colsArg.split(',').map((s) => s.trim()).filter(Boolean)
  : null;

const databaseUrl = resolveDatabaseUrl(root);
if (!databaseUrl) {
  console.error(
    '✗ Accès DB introuvable. Renseigne dans .env :\n' +
      '    DATABASE_URL=postgresql://postgres.<ref>:<pwd>@<host>:5432/postgres\n' +
      '  ou SUPABASE_DB_PASSWORD=<mot de passe DB> (+ project ref détecté via VITE_SUPABASE_URL).',
  );
  process.exit(1);
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('✗ Module `pg` manquant : npm install pg --save-dev');
  process.exit(1);
}

// ── Introspection (READ-ONLY) ────────────────────────────────────────────────
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  const reg = await client.query('select to_regclass($1) as reg', [`public.${table}`]);
  if (!reg.rows[0].reg) {
    console.log(`Table public.${table} : ABSENTE`);
    process.exit(0);
  }
  console.log(`Table public.${table} : EXISTE\n`);

  // Colonnes (+ types réels) — filtrées si des colonnes sont demandées.
  const colParams = [table];
  let colFilter = '';
  if (wantedCols) {
    colParams.push(wantedCols);
    colFilter = 'and column_name = any($2)';
  }
  const cols = await client.query(
    `select column_name, data_type, udt_name, is_nullable, column_default
       from information_schema.columns
      where table_schema='public' and table_name=$1 ${colFilter}
      order by ordinal_position`,
    colParams,
  );
  console.log(`── Colonnes ${wantedCols ? `(filtre: ${wantedCols.join(', ')})` : `(${cols.rows.length})`} ──`);
  for (const r of cols.rows) {
    const type = r.data_type === 'USER-DEFINED' ? `${r.udt_name} (enum/type)` : r.data_type;
    const nn = r.is_nullable === 'NO' ? '  NOT NULL' : '';
    const def = r.column_default ? `  default ${r.column_default}` : '';
    console.log(`  ${r.column_name.padEnd(28)} ${type}${nn}${def}`);
  }
  if (wantedCols) {
    const found = new Set(cols.rows.map((r) => r.column_name));
    for (const c of wantedCols) {
      if (!found.has(c)) console.log(`  ${c.padEnd(28)} ABSENTE`);
    }
  }

  // Index (noms + définitions) — utile pour éviter les collisions de noms.
  const idx = await client.query(
    `select indexname, indexdef from pg_indexes
      where schemaname='public' and tablename=$1 order by indexname`,
    [table],
  );
  console.log(`\n── Index (${idx.rows.length}) ──`);
  for (const r of idx.rows) console.log(`  ${r.indexname}\n      ${r.indexdef}`);

  // Contraintes / FK — pour valider la liaison des tables (types + ON DELETE).
  const cons = await client.query(
    `select conname, pg_get_constraintdef(oid) as def
       from pg_constraint where conrelid = $1::regclass
      order by contype desc, conname`,
    [`public.${table}`],
  );
  console.log(`\n── Contraintes (${cons.rows.length}) ──`);
  for (const r of cons.rows) console.log(`  ${r.conname} : ${r.def}`);
} catch (err) {
  console.error('✗ Introspection :', err.message);
  process.exit(1);
} finally {
  await client.end();
}

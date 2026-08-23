/**
 * Diff READ-ONLY entre ce que les fichiers de migration DÉCLARENT créer et ce qui
 * existe RÉELLEMENT dans la base Supabase liée.
 *
 * POURQUOI : `supabase/migrations/` n'a jamais eu de suivi, et des migrations ont
 * aussi été passées à la main dans l'éditeur SQL. Avant de faire confiance au
 * baseline (`npm run db:baseline`), il faut vérifier que les fichiers marqués
 * « appliqués » ont bien produit leurs objets en base.
 *
 * N'exécute QUE des SELECT sur les catalogues système. Aucune écriture.
 *
 * Usage :
 *   node scripts/db-verify-migrations.mjs            # résumé
 *   node scripts/db-verify-migrations.mjs --verbose  # + détail des objets trouvés
 *
 * LIMITE ASSUMÉE : seules les migrations DDL sont vérifiables. Une migration qui
 * ne fait que du DML (seed, UPDATE, DELETE, backfill) ne laisse aucun objet de
 * schéma → classée NON VÉRIFIABLE, jamais « manquante ».
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Sans ça, DATABASE_URL est vide et resolveDatabaseUrl fabrique une URL bancale
// → « The server does not support SSL connections ». Même amorçage que db-introspect.
dotenv.config({ path: resolve(root, '.env') });
const MIGRATIONS_DIR = resolve(root, 'supabase/migrations');
const verbose = process.argv.includes('--verbose');

// ── Parsing SQL (approximatif mais volontairement conservateur) ───────────────

/** Retire commentaires ligne et bloc pour ne pas matcher du DDL commenté. */
const stripComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

const matchAll = (sql, re) => [...sql.matchAll(re)].map((m) => m[1].toLowerCase());

function parseMigration(sql) {
  const clean = stripComments(sql);

  const tables = matchAll(
    clean,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi,
  );
  const indexes = matchAll(
    clean,
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi,
  );
  const functions = matchAll(
    clean,
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?/gi,
  );

  // ADD COLUMN : il faut la table portante. Un même ALTER peut en ajouter plusieurs.
  const columns = [];
  for (const stmt of clean.split(';')) {
    const t = stmt.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/i);
    if (!t) continue;
    const table = t[1].toLowerCase();
    for (const c of stmt.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi)) {
      columns.push(`${table}.${c[1].toLowerCase()}`);
    }
  }

  // Objets explicitement supprimés (ici ou par une migration ultérieure) :
  // leur absence en base est NORMALE, il ne faut pas la signaler.
  const dropped = [
    ...matchAll(clean, /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi),
    ...matchAll(clean, /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi),
    ...matchAll(clean, /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi),
  ];
  for (const stmt of clean.split(';')) {
    const t = stmt.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?"?(\w+)"?/i);
    if (!t) continue;
    for (const c of stmt.matchAll(/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/gi)) {
      dropped.push(`${t[1].toLowerCase()}.${c[1].toLowerCase()}`);
    }
  }

  return { tables, indexes, functions, columns, dropped };
}

// ── État réel de la base ─────────────────────────────────────────────────────

async function readLiveSchema(client) {
  const q = async (sql) => (await client.query(sql)).rows;

  const tables = new Set(
    (await q(`select table_name from information_schema.tables where table_schema='public'`))
      .map((r) => r.table_name.toLowerCase()),
  );
  const columns = new Set(
    (await q(`select table_name, column_name from information_schema.columns where table_schema='public'`))
      .map((r) => `${r.table_name.toLowerCase()}.${r.column_name.toLowerCase()}`),
  );
  const indexes = new Set(
    (await q(`select indexname from pg_indexes where schemaname='public'`))
      .map((r) => r.indexname.toLowerCase()),
  );
  const functions = new Set(
    (await q(
      `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'`,
    )).map((r) => r.proname.toLowerCase()),
  );

  return { tables, columns, indexes, functions };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('✗ Dossier supabase/migrations introuvable.');
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const parsed = new Map(
    files.map((f) => [f, parseMigration(readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8'))]),
  );

  // Un objet supprimé par N'IMPORTE QUELLE migration est exclu des attendus :
  // sinon la migration qui l'a créé serait signalée à tort comme non appliquée.
  const droppedAnywhere = new Set();
  for (const p of parsed.values()) p.dropped.forEach((d) => droppedAnywhere.add(d));

  const pg = (await import('pg')).default;
  const client = new pg.Client({
    connectionString: resolveDatabaseUrl(root),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const live = await readLiveSchema(client);

    const verified = [];
    const unverifiable = [];
    const incomplete = [];

    for (const [file, p] of parsed) {
      const expected = [
        ...p.tables.map((t) => ({ kind: 'table', id: t, present: live.tables.has(t) })),
        ...p.columns.map((c) => ({ kind: 'colonne', id: c, present: live.columns.has(c) })),
        ...p.indexes.map((i) => ({ kind: 'index', id: i, present: live.indexes.has(i) })),
        ...p.functions.map((f) => ({ kind: 'fonction', id: f, present: live.functions.has(f) })),
      ].filter((o) => !droppedAnywhere.has(o.id));

      if (expected.length === 0) {
        unverifiable.push(file);
        continue;
      }
      const missing = expected.filter((o) => !o.present);
      if (missing.length === 0) verified.push({ file, count: expected.length });
      else incomplete.push({ file, missing, total: expected.length });
    }

    console.log(`\n══ Diff fichiers de migration ↔ base réelle (${files.length} fichiers) ══\n`);

    console.log(`✓ VÉRIFIÉES — tous les objets déclarés existent : ${verified.length}`);
    if (verbose) verified.forEach((v) => console.log(`    ${v.file} (${v.count} objet(s))`));

    console.log(`\n○ NON VÉRIFIABLES — aucun DDL (seed / backfill / UPDATE) : ${unverifiable.length}`);
    unverifiable.forEach((f) => console.log(`    ${f}`));

    console.log(`\n${incomplete.length ? '✗' : '✓'} INCOMPLÈTES — objets déclarés ABSENTS de la base : ${incomplete.length}`);
    for (const i of incomplete) {
      console.log(`\n    ${i.file}  (${i.missing.length}/${i.total} manquant(s))`);
      i.missing.forEach((m) => console.log(`        ✗ ${m.kind} « ${m.id} »`));
    }

    if (incomplete.length) {
      console.log(
        `\n⚠ Ces migrations ont été baselinées mais n'ont pas produit leurs objets.\n` +
          `  Retire-les du suivi puis rejoue-les :\n` +
          `    DELETE FROM public.schema_migrations WHERE version = '<fichier>';\n` +
          `    npm run db:apply -- supabase/migrations/<fichier>\n`,
      );
      process.exitCode = 1;
    } else {
      console.log('\n✓ Aucun écart : le baseline est fiable pour tout ce qui est vérifiable.\n');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});

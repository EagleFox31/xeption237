/**
 * Inventaire READ-ONLY de ce qui existe RÉELLEMENT dans le schéma `public` Supabase :
 * tables, vues, fonctions/RPC, triggers, policies RLS, extensions, types enum, jobs cron.
 *
 * POURQUOI : `db-verify-migrations.mjs` va dans le sens fichiers → base. Il ne voit donc
 * PAS ce qui existe en base sans fichier de migration — or `AGENTS.md` dit que des
 * migrations ont été passées à la main dans l'éditeur SQL Supabase. Ce script fait le
 * sens inverse (base → fichiers) et signale les objets sans source versionnée.
 *
 * N'exécute QUE des SELECT sur les catalogues système. Aucune écriture.
 *
 * Usage :
 *   npm run db:inventory           # synthèse + points d'attention
 *   npm run db:inventory -- --full # + listing complet de chaque objet
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const MIGRATIONS_DIR = resolve(root, 'supabase/migrations');
const full = process.argv.includes('--full');

/** Texte concaténé de toutes les migrations, pour chercher si un objet y est mentionné. */
function migrationsCorpus() {
  if (!existsSync(MIGRATIONS_DIR)) return '';
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n')
    .toLowerCase();
}

const Q = {
  tables: `
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname`,
  views: `
    select c.relname as name, (c.relkind = 'm') as materialized
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v','m')
    order by c.relname`,
  functions: `
    select p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef as security_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname`,
  triggers: `
    select c.relname as table_name, t.tgname as name, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
    order by c.relname, t.tgname`,
  policies: `
    select tablename, policyname as name, cmd
    from pg_policies where schemaname = 'public'
    order by tablename, policyname`,
  extensions: `select extname as name, extversion as version from pg_extension order by extname`,
  enums: `
    select t.typname as name,
           string_agg(e.enumlabel, ', ' order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname`,
};

async function main() {
  const pg = (await import('pg')).default;
  const client = new pg.Client({
    connectionString: resolveDatabaseUrl(root),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const corpus = migrationsCorpus();
    const inMigrations = (name) => corpus.includes(String(name).toLowerCase());

    const q = async (sql) => (await client.query(sql)).rows;
    const data = {};
    for (const [key, sql] of Object.entries(Q)) data[key] = await q(sql);

    // pg_cron : schéma absent si l'extension n'est pas installée.
    let cronJobs = null;
    try {
      cronJobs = await q(`select jobid, jobname, schedule, active from cron.job order by jobid`);
    } catch {
      cronJobs = null;
    }

    console.log('\n════ INVENTAIRE RÉEL — schéma public ════\n');
    console.log(`  Tables      ${data.tables.length}`);
    console.log(`  Vues        ${data.views.length}`);
    console.log(`  Fonctions   ${data.functions.length}`);
    console.log(`  Triggers    ${data.triggers.length}`);
    console.log(`  Policies    ${data.policies.length}`);
    console.log(`  Types enum  ${data.enums.length}`);
    console.log(`  Extensions  ${data.extensions.length}`);
    console.log(`  Jobs cron   ${cronJobs === null ? 'pg_cron absent' : cronJobs.length}`);

    // ── Point d'attention 1 : tables sans RLS ────────────────────────────────
    const noRls = data.tables.filter((t) => !t.rls);
    console.log(`\n── ⚠ Tables SANS RLS (${noRls.length}) ──`);
    console.log('   En Supabase le navigateur parle à la base : sans RLS, la clé anon peut lire/écrire.');
    noRls.forEach((t) => console.log(`   • ${t.name}`));
    if (noRls.length === 0) console.log('   (aucune)');

    // ── Point d'attention 2 : objets absents des migrations ──────────────────
    const orphans = {
      tables: data.tables.filter((t) => !inMigrations(t.name)),
      functions: data.functions.filter((f) => !inMigrations(f.name)),
      triggers: data.triggers.filter((t) => !inMigrations(t.name)),
      views: data.views.filter((v) => !inMigrations(v.name)),
      enums: data.enums.filter((e) => !inMigrations(e.name)),
    };
    const orphanTotal = Object.values(orphans).reduce((n, a) => n + a.length, 0);

    console.log(`\n── ⚠ Objets ABSENTS des fichiers de migration (${orphanTotal}) ──`);
    console.log('   Créés à la main dans l’éditeur SQL : aucune source versionnée.');
    for (const [kind, list] of Object.entries(orphans)) {
      list.forEach((o) =>
        console.log(`   • ${kind.slice(0, -1)} : ${o.name}${o.table_name ? ` (sur ${o.table_name})` : ''}`),
      );
    }
    if (orphanTotal === 0) console.log('   (aucun)');

    // ── Détail ───────────────────────────────────────────────────────────────
    console.log(`\n── Triggers (${data.triggers.length}) ──`);
    data.triggers.forEach((t) => console.log(`   • ${t.table_name}.${t.name}`));
    if (!data.triggers.length) console.log('   (aucun)');

    console.log(`\n── Fonctions / RPC (${data.functions.length}) ──`);
    data.functions.forEach((f) =>
      console.log(`   • ${f.name}(${f.args})${f.security_definer ? '  [SECURITY DEFINER]' : ''}`),
    );

    console.log(`\n── Extensions ──`);
    data.extensions.forEach((e) => console.log(`   • ${e.name} ${e.version}`));

    if (cronJobs?.length) {
      console.log(`\n── Jobs cron ──`);
      cronJobs.forEach((j) =>
        console.log(`   • [${j.jobid}] ${j.jobname ?? '(sans nom)'} — ${j.schedule}${j.active ? '' : ' (INACTIF)'}`),
      );
    }

    if (full) {
      console.log(`\n── Tables (${data.tables.length}) ──`);
      data.tables.forEach((t) => console.log(`   • ${t.name}${t.rls ? '' : '   ⚠ sans RLS'}`));
      console.log(`\n── Vues (${data.views.length}) ──`);
      data.views.forEach((v) => console.log(`   • ${v.name}${v.materialized ? ' (matérialisée)' : ''}`));
      console.log(`\n── Policies (${data.policies.length}) ──`);
      data.policies.forEach((p) => console.log(`   • ${p.tablename} : ${p.name} [${p.cmd}]`));
      console.log(`\n── Types enum (${data.enums.length}) ──`);
      data.enums.forEach((e) => console.log(`   • ${e.name} = ${e.labels}`));
    }
    console.log('');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // Garder l'objet erreur complet : un message vide masquait la cause réelle.
  console.error('✗', err?.message || '(sans message)');
  if (err?.position || err?.detail || err?.hint) {
    console.error('  detail:', err.detail ?? '—', '| hint:', err.hint ?? '—', '| pos:', err.position ?? '—');
  }
  console.error(err?.stack ?? err);
  process.exit(1);
});

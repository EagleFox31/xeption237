/**
 * Applique un fichier SQL sur le projet Supabase lié (prod).
 *
 * Méthode 1 — CLI (si `supabase login` a été fait) :
 *   npx supabase db query --linked -f <fichier>
 *
 * Méthode 2 — connexion Postgres directe (si mot de passe DB dans .env) :
 *   SUPABASE_DB_PASSWORD=...  (ou DATABASE_URL=postgresql://...)
 *
 * Usage :
 *   node scripts/apply-migration.mjs
 *   node scripts/apply-migration.mjs supabase/migrations/20260611_002_fix_create_order_atomic_date.sql
 *   node scripts/apply-migration.mjs --verify-only
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

dotenv.config({ path: resolve(root, '.env') });

const DEFAULT_MIGRATION = resolve(
  root,
  'supabase/migrations/20260611_002_fix_create_order_atomic_date.sql',
);

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const fileArg = args.find((a) => !a.startsWith('--'));
const migrationFile = fileArg ? resolve(root, fileArg) : DEFAULT_MIGRATION;

function projectRefFromUrl(url) {
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function readProjectRef() {
  const fromEnv = projectRefFromUrl(process.env.VITE_SUPABASE_URL);
  if (fromEnv) return fromEnv;

  const refFile = resolve(root, 'supabase/.temp/project-ref');
  if (existsSync(refFile)) {
    return readFileSync(refFile, 'utf8').trim();
  }

  return null;
}

function poolerHost() {
  const poolerFile = resolve(root, 'supabase/.temp/pooler-url');
  if (existsSync(poolerFile)) {
    const raw = readFileSync(poolerFile, 'utf8').trim();
    const match = raw.match(/@([^:/]+)/);
    if (match) return match[1];
  }
  return process.env.SUPABASE_DB_HOST || 'aws-1-eu-central-1.pooler.supabase.com';
}

function buildDatabaseUrl(projectRef) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !projectRef) return null;

  const host = poolerHost();
  const port = process.env.SUPABASE_DB_PORT || '5432';
  const user = `postgres.${projectRef}`;
  const encodedPassword = encodeURIComponent(password);

  return `postgresql://${user}:${encodedPassword}@${host}:${port}/postgres`;
}

function applyWithSupabaseCli(filePath) {
  console.log('→ Tentative via Supabase CLI (linked)...');
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--linked', '-f', filePath],
    { cwd: root, encoding: 'utf8', shell: true },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) {
    console.log('✓ Migration appliquée via Supabase CLI.');
    return true;
  }

  const errText = `${result.stderr || ''}${result.stdout || ''}`;
  if (errText.includes('Access token not provided')) {
    console.log('  CLI non connectée (supabase login requis).');
    return false;
  }

  console.error('✗ Échec Supabase CLI.');
  return false;
}

async function applyWithPg(databaseUrl, sql) {
  console.log('→ Connexion Postgres directe...');
  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error(
      '✗ Module `pg` manquant. Installe-le : npm install pg --save-dev',
    );
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✓ Migration appliquée via Postgres.');
    return true;
  } finally {
    await client.end();
  }
}

async function verifyOrderRpc() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.log('⚠ Vérification RPC ignorée (VITE_SUPABASE_* manquant).');
    return;
  }

  console.log('→ Vérification RPC create_order_atomic...');
  const sb = createClient(url, anonKey);
  const { error: authErr } = await sb.auth.signInAnonymously();
  if (authErr) {
    console.warn('⚠ Auth anonyme:', authErr.message);
    return;
  }

  const probeId = `PROBE-${Date.now()}`;
  const { data, error } = await sb.rpc('create_order_atomic', {
    p_order_id: probeId,
    p_customer_name: 'Migration Probe',
    p_customer_email: '',
    p_customer_phone: '699000000',
    p_customer_city: 'Probe',
    p_delivery_mode: 'pickup',
    p_payment_method: 'Cash à la livraison',
    p_total: 1,
    p_items: [],
    p_date: new Date().toISOString(),
  });

  if (error) {
    console.error('✗ RPC erreur:', error.message);
    process.exit(1);
  }

  if (!data?.success) {
    const msg = data?.error || 'unknown';
    if (msg.includes('timestamp with time zone') && msg.includes('text')) {
      console.error('✗ La migration date n’est pas encore appliquée.');
      process.exit(1);
    }
    console.log('ℹ RPC répond (probe):', msg);
    return;
  }

  console.log('✓ RPC create_order_atomic OK (date timestamptz fixée).');

  await sb.from('orders').delete().eq('id', probeId);
  console.log('✓ Commande probe supprimée.');
}

async function main() {
  const projectRef = readProjectRef();
  if (!projectRef) {
    console.error('✗ Project ref introuvable (VITE_SUPABASE_URL ou supabase/.temp/project-ref).');
    process.exit(1);
  }

  console.log(`Projet Supabase : ${projectRef}`);

  if (!verifyOnly) {
    if (!existsSync(migrationFile)) {
      console.error(`✗ Fichier introuvable : ${relative(root, migrationFile)}`);
      process.exit(1);
    }

    const sql = readFileSync(migrationFile, 'utf8');
    console.log(`Fichier : ${relative(root, migrationFile)}`);

    const cliOk = applyWithSupabaseCli(migrationFile);
    if (!cliOk) {
      const databaseUrl = buildDatabaseUrl(projectRef);
      if (!databaseUrl) {
        console.error(
          '\nConfigure l’accès DB dans .env :\n' +
            '  SUPABASE_DB_PASSWORD=<mot de passe DB Supabase>\n' +
            '  ou DATABASE_URL=postgresql://postgres.<ref>:<pwd>@<host>:5432/postgres\n' +
            '\nOu connecte le CLI : supabase login',
        );
        process.exit(1);
      }

      try {
        await applyWithPg(databaseUrl, sql);
      } catch (err) {
        console.error('✗ Postgres:', err.message);
        process.exit(1);
      }
    }
  }

  await verifyOrderRpc();
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});

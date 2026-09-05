/**
 * Applique un fichier SQL sur le projet Supabase lié (prod).
 *
 * Méthode 1 — CLI (si `supabase login` a été fait) :
 *   npx supabase db query --linked -f <fichier>
 *
 * Méthode 2 — connexion Postgres directe (si mot de passe DB dans .env) :
 *   SUPABASE_DB_PASSWORD=...  (ou DATABASE_URL=postgresql://...)
 *
 * SUIVI DES MIGRATIONS
 * Chaque application réussie est enregistrée dans `public.schema_migrations`
 * (version = nom du fichier, + checksum SHA-256 du contenu). Une migration déjà
 * enregistrée est SAUTÉE ; si son fichier a changé depuis, le script REFUSE de
 * continuer (le disque et la prod ont divergé) — écrire une nouvelle migration.
 *
 * Premier usage sur une base existante : `npm run db:baseline` marque les fichiers
 * déjà passés (script ou éditeur SQL Supabase) comme appliqués SANS les exécuter.
 *
 * Usage :
 *   npm run db:status                      # appliqué / en attente / fichier modifié
 *   npm run db:baseline                    # photographie l'état actuel (n'exécute rien)
 *   npm run db:apply -- <fichier.sql>      # applique puis enregistre
 *   node scripts/apply-migration.mjs --verify-only
 *
 * Options : --force (rejouer malgré l'enregistrement) · --no-track (ne pas enregistrer)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, basename } from 'node:path';
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

const MIGRATIONS_DIR = resolve(root, 'supabase/migrations');

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const showStatus = args.includes('--status');
const doBaseline = args.includes('--baseline');
const force      = args.includes('--force');
const noTrack    = args.includes('--no-track');
const fileArg = args.find((a) => !a.startsWith('--'));
const migrationFile = fileArg ? resolve(root, fileArg) : DEFAULT_MIGRATION;

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Fichiers .sql du dossier migrations, triés (le nom porte la date → ordre chronologique). */
const listMigrationFiles = () =>
  existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
    : [];

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

async function openPgClient(databaseUrl) {
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
  await client.connect();
  return client;
}

async function applyWithPg(client, sql) {
  console.log('→ Connexion Postgres directe...');
  await client.query(sql);
  console.log('✓ Migration appliquée via Postgres.');
  return true;
}

// ── Suivi des migrations ─────────────────────────────────────────────────────
// Le dossier `supabase/migrations/` n'a jamais décrit l'état réel de la prod
// (aucun suivi + edits manuels dans l'éditeur SQL Supabase). Cette table le fait.

// ⚠ Doit rester STRICTEMENT identique au contenu de
// `supabase/migrations/20260821_001_schema_migrations.sql`. Toute divergence crée
// un objet à moitié construit que le baseline marquerait ensuite « appliqué »
// (c'est exactement ce qui est arrivé la première fois : index oublié ici).
async function ensureTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version     TEXT PRIMARY KEY,
      name        TEXT,
      checksum    TEXT,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_by  TEXT NOT NULL DEFAULT 'apply-migration'
    );
    CREATE INDEX IF NOT EXISTS schema_migrations_applied_at_idx
      ON public.schema_migrations (applied_at DESC);
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
  `);
}

/** Map version → { checksum, applied_at }. */
async function readApplied(client) {
  const { rows } = await client.query(
    'SELECT version, checksum, applied_at FROM public.schema_migrations',
  );
  return new Map(rows.map((r) => [r.version, r]));
}

async function recordMigration(client, version, checksum, appliedBy) {
  await client.query(
    `INSERT INTO public.schema_migrations (version, name, checksum, applied_by)
     VALUES ($1, $1, $2, $3)
     ON CONFLICT (version) DO UPDATE
       SET checksum = EXCLUDED.checksum,
           applied_at = now(),
           applied_by = EXCLUDED.applied_by`,
    [version, checksum, appliedBy],
  );
}

async function printStatus(client) {
  const applied = await readApplied(client);
  const files = listMigrationFiles();
  console.log(`\nMigrations (${files.length} fichier(s), ${applied.size} enregistrée(s)) :\n`);

  for (const file of files) {
    const row = applied.get(file);
    if (!row) {
      console.log(`  ⏳ EN ATTENTE  ${file}`);
      continue;
    }
    const current = sha256(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
    const drift = row.checksum && row.checksum !== current;
    const date = new Date(row.applied_at).toISOString().slice(0, 10);
    console.log(
      drift
        ? `  ⚠ MODIFIÉ    ${file}  (appliquée le ${date}, fichier édité depuis)`
        : `  ✓ APPLIQUÉE  ${file}  (${date})`,
    );
  }

  // Enregistrements sans fichier correspondant (fichier renommé/supprimé).
  for (const version of applied.keys()) {
    if (!files.includes(version)) console.log(`  ? ORPHELINE   ${version} (aucun fichier)`);
  }
  console.log('');
}

/**
 * Marque les fichiers existants comme appliqués SANS les exécuter.
 * Sert une seule fois, pour photographier l'état actuel de la prod : les migrations
 * du dossier ont déjà été passées (script ou éditeur SQL) mais rien ne les traçait.
 */
async function baseline(client) {
  const applied = await readApplied(client);
  const files = listMigrationFiles();
  let marked = 0;

  for (const file of files) {
    if (applied.has(file)) continue;
    const checksum = sha256(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
    await recordMigration(client, file, checksum, 'baseline');
    console.log(`  + ${file}`);
    marked += 1;
  }

  console.log(
    marked === 0
      ? '\n✓ Rien à marquer : toutes les migrations sont déjà enregistrées.'
      : `\n✓ ${marked} migration(s) marquée(s) comme appliquée(s) — aucune n'a été exécutée.`,
  );
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

  const databaseUrl = buildDatabaseUrl(projectRef);
  const needDbMsg =
    '\nConfigure l’accès DB dans .env :\n' +
    '  SUPABASE_DB_PASSWORD=<mot de passe DB Supabase>\n' +
    '  ou DATABASE_URL=postgresql://postgres.<ref>:<pwd>@<host>:5432/postgres';

  // ── Modes de suivi purs : ni application, ni sonde RPC ──────────────────────
  if (showStatus || doBaseline) {
    if (!databaseUrl) {
      console.error(`✗ Accès base requis pour le suivi des migrations.${needDbMsg}`);
      process.exit(1);
    }
    const client = await openPgClient(databaseUrl);
    try {
      await ensureTrackingTable(client);
      if (showStatus) await printStatus(client);
      else await baseline(client);
    } finally {
      await client.end();
    }
    return;
  }

  if (verifyOnly) {
    await verifyOrderRpc();
    return;
  }

  if (!existsSync(migrationFile)) {
    console.error(`✗ Fichier introuvable : ${relative(root, migrationFile)}`);
    process.exit(1);
  }

  const sql = readFileSync(migrationFile, 'utf8');
  const version = basename(migrationFile);
  const checksum = sha256(sql);
  console.log(`Fichier : ${relative(root, migrationFile)}`);

  // ── Contrôle préalable : déjà appliquée ? fichier modifié depuis ? ──────────
  let client = null;
  if (!noTrack) {
    if (!databaseUrl) {
      console.error(
        `✗ Accès base requis pour tracer la migration.${needDbMsg}\n` +
          '\n  (--no-track pour appliquer sans enregistrer — déconseillé.)',
      );
      process.exit(1);
    }
    client = await openPgClient(databaseUrl);
    await ensureTrackingTable(client);

    const previous = (await readApplied(client)).get(version);
    if (previous && !force) {
      const date = new Date(previous.applied_at).toISOString().slice(0, 19).replace('T', ' ');
      if (previous.checksum && previous.checksum !== checksum) {
        console.error(
          `✗ ${version} a été appliquée le ${date}, mais le fichier a CHANGÉ depuis.\n` +
            '  Le disque et la production ont divergé. Écris une nouvelle migration\n' +
            '  plutôt que d’éditer celle-ci, ou force avec --force si tu sais ce que tu fais.',
        );
        await client.end();
        process.exit(1);
      }
      console.log(`✓ Déjà appliquée le ${date} — rien à faire (--force pour rejouer).`);
      await client.end();
      return;
    }
  }

  // ── Application ────────────────────────────────────────────────────────────
  try {
    const cliOk = applyWithSupabaseCli(migrationFile);
    if (!cliOk) {
      if (!client) {
        if (!databaseUrl) {
          console.error(`${needDbMsg}\n\nOu connecte le CLI : supabase login`);
          process.exit(1);
        }
        client = await openPgClient(databaseUrl);
      }
      try {
        await applyWithPg(client, sql);
      } catch (err) {
        console.error('✗ Postgres:', err.message);
        await client.end();
        process.exit(1);
      }
    }

    // Enregistrement APRÈS application : le fichier porte son propre BEGIN/COMMIT
    // (convention AGENTS.md), l'imbriquer casserait son atomicité. Si ça échoue ici,
    // la migration est appliquée mais non tracée → on le dit fort, un re-run répare
    // (migration et enregistrement sont tous deux idempotents).
    if (client) {
      try {
        await recordMigration(client, version, checksum, 'apply-migration');
        console.log(`✓ Enregistrée dans schema_migrations (${version}).`);
      } catch (err) {
        console.error(
          `\n⚠ MIGRATION APPLIQUÉE MAIS NON ENREGISTRÉE : ${err.message}\n` +
            `  Relance la même commande pour réparer le suivi.`,
        );
      }
    }
  } finally {
    if (client) await client.end();
  }

  await verifyOrderRpc();
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});

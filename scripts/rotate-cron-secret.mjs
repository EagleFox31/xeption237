/**
 * Rotation de CRON_SECRET : Vault `cron_secret` (lu par les jobs pg_cron) + secret Edge
 * `CRON_SECRET` (vérifié par notify-staff, snapshot-market-prices). Le secret n'est jamais affiché.
 *
 * Usage : node scripts/rotate-cron-secret.mjs
 * Pré-requis : .env (DATABASE_URL ou SUPABASE_DB_PASSWORD) + `npx supabase login`.
 * Fenêtre de bascule ~quelques secondes : notify-staff réessaie à la minute suivante.
 */

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env') });

const PROJECT_REF = 'tawnusmfyvugqczaydat';
const VAULT_NAME = 'cron_secret';
const SECRET_BYTES = 32;

const secret = randomBytes(SECRET_BYTES).toString('hex');

const client = new pg.Client({ connectionString: resolveDatabaseUrl(), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query('select id from vault.secrets where name = $1', [VAULT_NAME]);
  if (rows.length) await client.query('select vault.update_secret($1, $2)', [rows[0].id, secret]);
  else await client.query('select vault.create_secret($1, $2)', [secret, VAULT_NAME]);
} finally {
  await client.end();
}

// Fichier env temporaire : le secret ne passe ni en argument de commande ni dans les logs.
const dir = mkdtempSync(join(tmpdir(), 'cron-secret-'));
const envFile = join(dir, 'cron.env');
writeFileSync(envFile, `CRON_SECRET=${secret}\n`, { mode: 0o600 });
try {
  execFileSync('npx', ['supabase', 'secrets', 'set', '--env-file', envFile, '--project-ref', PROJECT_REF], {
    cwd: root,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
} finally {
  unlinkSync(envFile);
}

// Comparer avec la colonne digest de `npx supabase secrets list` (SHA-256 de la valeur).
console.log(`CRON_SECRET changé (Vault + Edge). Empreinte : ${createHash('sha256').update(secret).digest('hex').slice(0, 12)}…`);

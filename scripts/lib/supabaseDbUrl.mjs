/**
 * Résolution de l'URL Postgres Supabase (prod liée) pour les scripts DB.
 * Partagé par apply-migration / db-introspect / troc-latest (DRY).
 *
 * Priorité : DATABASE_URL, sinon construite depuis SUPABASE_DB_PASSWORD + project ref.
 * Les scripts appelants n'exécutent que du SELECT (lecture seule).
 */
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

function projectRefFromUrl(url) {
  return url?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

function readProjectRef(root) {
  const fromEnv = projectRefFromUrl(process.env.VITE_SUPABASE_URL);
  if (fromEnv) return fromEnv;
  const refFile = resolve(root, 'supabase/.temp/project-ref');
  return existsSync(refFile) ? readFileSync(refFile, 'utf8').trim() : null;
}

function poolerHost(root) {
  const f = resolve(root, 'supabase/.temp/pooler-url');
  if (existsSync(f)) {
    const m = readFileSync(f, 'utf8').trim().match(/@([^:/]+)/);
    if (m) return m[1];
  }
  return process.env.SUPABASE_DB_HOST || 'aws-1-eu-central-1.pooler.supabase.com';
}

/** URL Postgres, ou null si aucun accès configuré (.env). */
export function resolveDatabaseUrl(root) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = readProjectRef(root);
  if (!password || !ref) return null;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${poolerHost(root)}:${port}/postgres`;
}

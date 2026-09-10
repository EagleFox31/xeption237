/**
 * Exporte les policies RLS live + recherche les références code (amont/aval).
 * Usage : node scripts/export-policies-registry.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';
import { classifyPolicies } from './lib/policyImpact.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const SCAN_DIRS = ['components', 'hooks', 'pages', 'services', 'utils', 'scripts', 'supabase/functions'];
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql']);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(p, files);
    } else if (SCAN_EXT.has(extname(name))) {
      files.push(p);
    }
  }
  return files;
}

function findRefs(table, files) {
  const patterns = [
    new RegExp(`from\\(['"\`]${table}['"\`]`, 'gi'),
    new RegExp(`FROM\\s+${table}\\b`, 'gi'),
    new RegExp(`\\.from\\(['"\`]${table}['"\`]`, 'gi'),
    new RegExp(`/rest/v1/${table}`, 'gi'),
    new RegExp(`DB_TABLES\\.\\w+.*${table}`, 'gi'),
  ];
  const hits = [];
  for (const file of files) {
    const rel = file.replace(root + '\\', '').replace(root + '/', '');
    const content = readFileSync(file, 'utf8');
    for (const re of patterns) {
      if (re.test(content)) {
        hits.push(rel);
        break;
      }
    }
  }
  return [...new Set(hits)].sort();
}

function findPolicyInMigrations(name, corpus) {
  return corpus.filter((f) => f.content.toLowerCase().includes(name.toLowerCase()));
}

const migrationFiles = readdirSync(resolve(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({
    file: f,
    content: readFileSync(resolve(root, 'supabase/migrations', f), 'utf8'),
  }));

const codeFiles = SCAN_DIRS.flatMap((d) => {
  const p = resolve(root, d);
  try {
    return walk(p);
  } catch {
    return [];
  }
});

const pg = (await import('pg')).default;
const client = new pg.Client({
  connectionString: resolveDatabaseUrl(root),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows: policies } = await client.query(`
  select tablename, policyname, cmd, roles::text as roles, qual, with_check
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname
`);

const { rows: noRls } = await client.query(`
  select c.relname as tablename
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  order by c.relname
`);

await client.end();

const tables = [...new Set(policies.map((p) => p.tablename))];
const tableRefs = Object.fromEntries(tables.map((t) => [t, findRefs(t, codeFiles)]));

const registry = policies.map((p) => {
  const migHits = findPolicyInMigrations(p.policyname, migrationFiles);
  return {
    table: p.tablename,
    policy: p.policyname,
    cmd: p.cmd,
    roles: p.roles,
    qual: p.qual,
    with_check: p.with_check,
    migration_sources: migHits.map((m) => m.file),
    code_callers: tableRefs[p.tablename] ?? [],
  };
});

const classified = classifyPolicies(
  registry,
  noRls.map((r) => r.tablename),
  tableRefs,
);

const out = {
  generated_at: new Date().toISOString(),
  policy_count: policies.length,
  tables_without_rls: noRls.map((r) => r.tablename),
  duplicate_groups: classified.duplicate_groups,
  impact_summary: classified.impact_summary,
  impact_labels: classified.impact_labels,
  policies: classified.policies,
  table_index: tables.map((t) => ({
    table: t,
    policy_count: policies.filter((p) => p.tablename === t).length,
    code_callers: tableRefs[t] ?? [],
    impact_by_policy: classified.policies
      .filter((p) => p.table === t)
      .map((p) => ({ policy: p.policy, impact: p.impact })),
  })),
};

const jsonPath = resolve(root, 'docs/engineering/policies-registry.json');
writeFileSync(jsonPath, JSON.stringify(out, null, 2));
console.log(`✓ ${policies.length} policies → ${jsonPath}`);

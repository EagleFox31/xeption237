/**
 * Audit RLS d'UNE table — a jouer AVANT puis APRES correction.
 *
 *   node scripts/qa-audit-table.mjs products
 *
 * Ne se contente pas de lire les catalogues systeme : il ESSAIE, sous deux
 * identites, et distingue les refus de securite des refus referentiels.
 *
 *   anon              visiteur du site, non connecte
 *   chatbot           session signInAnonymously() : role `authenticated`, mais
 *                     AUCUN email. C'est le piege repete dans ce projet — une
 *                     policy « pour les authentifies » la couvre.
 *
 * Toutes les ecritures d'essai sont annulees : la transaction se termine par un
 * ROLLBACK, quoi qu'il arrive.
 *
 * Un « aucune ligne » sur une table VIDE ne prouve rien : le script affiche le
 * nombre de lignes pour que la distinction reste visible.
 */
import 'dotenv/config';
import pg from 'pg';

const table = process.argv[2];
if (!table || !/^[a-z_][a-z0-9_]*$/.test(table)) {
  console.error('Usage : node scripts/qa-audit-table.mjs <table>');
  process.exit(2);
}

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const q = async (sql, params) => (await c.query(sql, params)).rows;

console.log('╔══ AUDIT RLS — public.' + table + ' ══╗\n');

const [meta] = await q(
  `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS force,
          (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS n
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = $1`,
  [table],
);
if (!meta) {
  console.error('Table introuvable.');
  process.exit(2);
}
const [{ n: lignes }] = await q(`SELECT count(*)::int AS n FROM public.${table}`);

console.log('RLS activee : ' + (meta.rls ? 'oui' : '*** NON ***') +
  '   FORCE : ' + (meta.force ? 'oui' : 'non') +
  '   policies : ' + meta.n + '   lignes : ' + lignes);

const droits = await q(
  `SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS p
   FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = $1 AND grantee IN ('anon','authenticated')
   GROUP BY grantee ORDER BY grantee`,
  [table],
);
console.log('\n-- droits de table (sans eux, la RLS n a rien a filtrer) --');
droits.forEach((d) => console.log('  ' + d.grantee.padEnd(16) + d.p));
if (!droits.length) console.log('  (aucun droit pour anon ni authenticated)');

const pols = await q(
  `SELECT p.polname AS nom,
          CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
               WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS cmd,
          COALESCE((SELECT string_agg(r.rolname,'+') FROM pg_roles r
                    WHERE r.oid = ANY(p.polroles)),'public') AS roles,
          COALESCE(pg_get_expr(p.polqual, p.polrelid),'-') AS u,
          COALESCE(pg_get_expr(p.polwithcheck, p.polrelid),'-') AS w
   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = $1
   ORDER BY p.polcmd, p.polname`,
  [table],
);
console.log('\n-- policies (elles se cumulent par OU : la plus permissive gagne) --');
pols.forEach((p) => {
  const large = p.u.trim() === 'true' || p.w.trim() === 'true';
  console.log('  ' + (large ? '!! ' : '   ') + p.cmd.padEnd(7) + p.roles.padEnd(22) + p.nom);
  console.log('        USING ' + p.u.slice(0, 96));
  if (p.w !== '-') console.log('        CHECK ' + p.w.slice(0, 96));
});
if (!pols.length) console.log('  (aucune)');

// ── Essais reels ────────────────────────────────────────────────────────────
const [{ col }] = await q(
  `SELECT column_name AS col FROM information_schema.columns
   WHERE table_schema='public' AND table_name=$1 AND is_generated='NEVER'
     AND is_identity='NO' ORDER BY ordinal_position LIMIT 1`,
  [table],
);

const essai = async (label, role, claims, sql) => {
  await c.query('SAVEPOINT s');
  try {
    await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await c.query('SET LOCAL role ' + role);
    const r = await c.query(sql);
    await c.query('RESET role');
    await c.query('RELEASE SAVEPOINT s');
    const n = r.rowCount ?? 0;
    console.log('  ' + label.padEnd(34) +
      (n > 0 ? 'POSSIBLE (' + n + ' ligne)' : lignes === 0 ? 'aucune ligne — TABLE VIDE, non concluant' : 'aucune ligne'));
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT s');
    await c.query('RESET role');
    const secu = /permission denied|row-level security|policy/i.test(e.message);
    console.log('  ' + label.padEnd(34) + (secu ? 'refuse (securite)' : 'refuse — ' + e.message.split('\n')[0].slice(0, 60)));
  }
};

await c.query('BEGIN');
for (const [nom, role, claims] of [
  ['anon (visiteur)', 'anon', { role: 'anon' }],
  ['chatbot (auth. sans email)', 'authenticated', { role: 'authenticated' }],
]) {
  console.log('\n-- essais reels : ' + nom + ' --');
  await essai('lire', role, claims, `SELECT 1 FROM public.${table} LIMIT 1`);
  await essai('modifier une ligne', role, claims,
    `UPDATE public.${table} SET ${col} = ${col} WHERE ctid IN (SELECT ctid FROM public.${table} LIMIT 1)`);
  await essai('supprimer une ligne', role, claims,
    `DELETE FROM public.${table} WHERE ctid IN (SELECT ctid FROM public.${table} LIMIT 1)`);
}
await c.query('ROLLBACK');
console.log('\n(transaction ANNULEE — aucune donnee reelle modifiee)');
await c.end();

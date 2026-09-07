/**
 * Audit RLS de toutes les tables de `public`.
 *
 *   node scripts/qa-audit-rls.mjs
 *
 * Trois defauts distincts, a ne pas confondre :
 *   RLS DESACTIVEE  la table est ouverte, les policies ne servent a rien
 *   AUCUNE POLICY   RLS active mais rien n'est autorise... sauf au proprietaire
 *                   et au service_role ; via l'API c'est ferme
 *   POLICY `true`   une policy qui n'exige rien — le cas de « Staff Self Edit »
 *
 * Le troisieme est le plus dangereux parce qu'il ressemble a une protection.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const { rows: tables } = await c.query(`
  SELECT c.relname AS table, c.relrowsecurity AS rls,
         (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS nb_policies
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname`);

const { rows: policies } = await c.query(`
  SELECT c.relname AS table, p.polname AS nom,
         CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END AS cmd,
         COALESCE((SELECT string_agg(r.rolname, '+') FROM pg_roles r
                   WHERE r.oid = ANY(p.polroles)), 'public') AS roles,
         COALESCE(pg_get_expr(p.polqual, p.polrelid), '-') AS using_expr,
         COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '-') AS check_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  ORDER BY c.relname, p.polname`);

const permissive = (e) => e.trim() === 'true';
const exposeAnon = (r) => r.includes('anon') || r === 'public';

const sansRls = tables.filter((t) => !t.rls);
const rlsSansPolicy = tables.filter((t) => t.rls && Number(t.nb_policies) === 0);

const ouvertes = policies.filter(
  (p) => (permissive(p.using_expr) || permissive(p.check_expr)) && p.cmd !== 'SELECT',
);
const lectureOuverte = policies.filter(
  (p) => p.cmd === 'SELECT' && permissive(p.using_expr) && exposeAnon(p.roles),
);

console.log('== ' + tables.length + ' tables dans public ==\n');

console.log('🔴 RLS DESACTIVEE — table entierement ouverte via l API (' + sansRls.length + ')');
sansRls.forEach((t) => console.log('   ' + t.table));
if (!sansRls.length) console.log('   (aucune)');

console.log('\n🔴 ECRITURE sans condition — policy `true` sur INSERT/UPDATE/DELETE/ALL (' + ouvertes.length + ')');
ouvertes.forEach((p) =>
  console.log('   ' + p.table.padEnd(26) + p.cmd.padEnd(7) + p.roles.padEnd(24) + p.nom));
if (!ouvertes.length) console.log('   (aucune)');

console.log('\n🟠 LECTURE publique assumee — SELECT `true` ouvert a anon (' + lectureOuverte.length + ')');
lectureOuverte.forEach((p) => console.log('   ' + p.table.padEnd(26) + p.roles.padEnd(24) + p.nom));
if (!lectureOuverte.length) console.log('   (aucune)');

console.log('\n⚪ RLS active mais AUCUNE policy — ferme via l API (' + rlsSansPolicy.length + ')');
console.log('   ' + (rlsSansPolicy.map((t) => t.table).join(', ') || '(aucune)'));

await c.end();

const graves = sansRls.length + ouvertes.length;
console.log('\n=> ' + graves + ' defaut(s) grave(s) : RLS desactivee ou ecriture sans condition.');
process.exit(graves ? 1 : 0);

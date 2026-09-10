/**
 * Audit RLS COMPLET — toutes les tables de `public`, essais reels compris.
 *
 *   node scripts/qa-audit-rls-complet.mjs
 *
 * Ne se fie pas aux catalogues systeme : pour chaque table, il ESSAIE de lire,
 * modifier et supprimer sous deux identites, dans une transaction ANNULEE.
 *
 *   V  visiteur non connecte (role anon)
 *   C  session signInAnonymously() du chatbot : role `authenticated`, sans email
 *
 * Colonnes :
 *   RLS   activee ou non (si non, les policies ne sont jamais evaluees)
 *   TRUNC droit TRUNCATE accorde a anon/authenticated — NON couvert par la RLS
 *   L M S lire / modifier / supprimer.  X = possible, . = refuse,
 *         ? = table vide, donc non concluant
 *
 * Le tableau se termine par un regroupement des fautes communes, pour corriger
 * par motif plutot que table par table.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const q = async (sql, p) => (await c.query(sql, p)).rows;

const tables = await q(`
  SELECT c.relname AS t, c.relrowsecurity AS rls,
         (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)::int AS np
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname`);

const trunc = new Set(
  (await q(`SELECT DISTINCT table_name AS t FROM information_schema.role_table_grants
            WHERE table_schema='public' AND privilege_type='TRUNCATE'
              AND grantee IN ('anon','authenticated')`)).map((r) => r.t),
);

const essai = async (role, claims, sql) => {
  await c.query('SAVEPOINT s');
  try {
    await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await c.query('SET LOCAL role ' + role);
    const r = await c.query(sql);
    await c.query('RESET role');
    await c.query('RELEASE SAVEPOINT s');
    return r.rowCount > 0 ? 'X' : '.';
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT s');
    await c.query('RESET role');
    // Un refus referentiel n'est pas une protection : on le distingue.
    return /foreign key|violates/i.test(e.message) ? 'f' : '.';
  }
};

await c.query('BEGIN');
const resultats = [];

for (const t of tables) {
  const [{ n }] = await q(`SELECT count(*)::int AS n FROM public.${t.t}`);
  const [col] = await q(
    `SELECT column_name AS c FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND is_generated='NEVER' AND is_identity='NO'
     ORDER BY ordinal_position LIMIT 1`, [t.t]);
  if (!col) continue;

  const r = { ...t, n, cells: {} };
  for (const [k, role, claims] of [['V', 'anon', { role: 'anon' }],
                                   ['C', 'authenticated', { role: 'authenticated' }]]) {
    r.cells[k + 'L'] = n === 0 ? '?' : await essai(role, claims, `SELECT 1 FROM public.${t.t} LIMIT 1`);
    r.cells[k + 'M'] = n === 0 ? '?' : await essai(role, claims,
      `UPDATE public.${t.t} SET ${col.c} = ${col.c} WHERE ctid IN (SELECT ctid FROM public.${t.t} LIMIT 1)`);
    r.cells[k + 'S'] = n === 0 ? '?' : await essai(role, claims,
      `DELETE FROM public.${t.t} WHERE ctid IN (SELECT ctid FROM public.${t.t} LIMIT 1)`);
  }
  resultats.push(r);
}
await c.query('ROLLBACK');

console.log('table'.padEnd(26) + 'lignes'.padStart(7) + '  RLS TRUNC   V:L M S   C:L M S');
console.log('-'.repeat(70));
for (const r of resultats) {
  const c2 = r.cells;
  console.log(
    r.t.padEnd(26) + String(r.n).padStart(7) + '  ' +
    (r.rls ? ' on' : 'OFF') + '  ' + (trunc.has(r.t) ? ' OUI ' : '  -  ') + '  ' +
    '  ' + c2.VL + ' ' + c2.VM + ' ' + c2.VS +
    '     ' + c2.CL + ' ' + c2.CM + ' ' + c2.CS,
  );
}

// ── Regroupement par faute, pour corriger par motif ─────────────────────────
const ecritureLibre = resultats.filter((r) => ['VM','VS','CM','CS'].some((k) => r.cells[k] === 'X'));
const rlsOff = resultats.filter((r) => !r.rls);
const truncOuvert = resultats.filter((r) => trunc.has(r.t));
const lectureLibre = resultats.filter((r) => r.cells.VL === 'X');
const vides = resultats.filter((r) => r.n === 0);

const bloc = (titre, liste) => {
  console.log('\n' + titre + ' (' + liste.length + ')');
  console.log('  ' + (liste.map((r) => r.t).join(', ') || '(aucune)'));
};

console.log('\n' + '='.repeat(70));
bloc('🔴 ECRITURE possible par un visiteur ou le chatbot', ecritureLibre);
bloc('🔴 RLS DESACTIVEE (policies jamais evaluees)', rlsOff);
bloc('🔴 TRUNCATE accorde (non couvert par la RLS)', truncOuvert);
bloc('🟠 LECTURE par un visiteur non connecte', lectureLibre);
bloc('⚪ TABLE VIDE — essais non concluants, a re-auditer quand elle se remplira', vides);

console.log('\nLegende : X possible · . refuse · f refuse par cle etrangere (pas une protection) · ? table vide');
await c.end();
process.exit(ecritureLibre.length ? 1 : 0);

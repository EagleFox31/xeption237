/**
 * Verifie la fermeture de la table `staff`, palier par palier.
 *
 *   node scripts/qa-check-rls-staff.mjs
 *
 * Interroge la base comme le ferait un inconnu — via l'API REST avec la SEULE
 * cle publique — puis simule une session `signInAnonymously()` en SQL pour la
 * partie ecriture, dans une transaction ANNULEE.
 *
 * Le script decrit l'etat, il ne le juge pas : chaque palier a ses attentes,
 * rappelees en fin de sortie.
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const h = { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' };

console.log('== 1. Lecture de la table avec la seule cle publique ==');
const lecture = await fetch(url + '/rest/v1/staff?select=name,email,role', { headers: h });
const corps = await lecture.json();
const nbLignes = Array.isArray(corps) ? corps.length : null;
console.log(
  '  GET /staff            HTTP ' + lecture.status + ' — ' +
    (nbLignes === null
      ? 'refusee (' + JSON.stringify(corps).slice(0, 70) + ')'
      : nbLignes + ' ligne(s) exposee(s)'),
);

console.log('\n== 2. La porte etroite repond-elle ? ==');
for (const essai of ['Jennifer', 'lawrynnjennifer@gmail.com', 'Inconnu Personne', '%']) {
  const r = await fetch(url + '/rest/v1/rpc/staff_login_hint', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ p_identifier: essai }),
  });
  const d = await r.json();
  const n = Array.isArray(d) ? d.length : null;
  console.log(
    '  ' + JSON.stringify(essai).padEnd(30) + 'HTTP ' + r.status + ' — ' +
      (n === null ? 'erreur : ' + JSON.stringify(d).slice(0, 60) : n + ' ligne(s)') +
      (n === 1 ? '  (' + d[0].name + ', ' + d[0].role + ')' : ''),
  );
}

console.log('\n== 3. Ecriture depuis une session anonyme (chatbot) ==');
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
try {
  await c.query('BEGIN');
  await c.query(`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true)`);
  await c.query('SET LOCAL role authenticated');

  const lu = await c.query('SELECT count(*)::int AS n FROM public.staff');
  console.log('  lecture               : ' + lu.rows[0].n + ' ligne(s) visibles');

  await c.query('SAVEPOINT e');
  try {
    const up = await c.query(
      `UPDATE public.staff SET role = 'direction' WHERE email = 'vente@xeption.cm' RETURNING name`,
    );
    console.log('  promotion d un vendeur: ' + up.rowCount + ' ligne(s) modifiee(s)');
    await c.query('RELEASE SAVEPOINT e');
  } catch (e) {
    console.log('  promotion d un vendeur: REFUSEE — ' + e.message.slice(0, 60));
    await c.query('ROLLBACK TO SAVEPOINT e');
  }

  await c.query('SAVEPOINT d');
  try {
    const del = await c.query(`DELETE FROM public.staff WHERE email = 'vente@xeption.cm'`);
    console.log('  suppression           : ' + del.rowCount + ' ligne(s) supprimee(s)');
    await c.query('RELEASE SAVEPOINT d');
  } catch (e) {
    console.log('  suppression           : REFUSEE — ' + e.message.slice(0, 60));
    await c.query('ROLLBACK TO SAVEPOINT d');
  }
} finally {
  await c.query('ROLLBACK');
  console.log('  (transaction ANNULEE — aucune donnee reelle modifiee)');
  await c.end();
}

console.log(`
== Attendu selon le palier ==
  palier 1 (RPC posee)     : lecture encore ouverte, porte etroite qui repond,
                             ecriture encore possible — rien n'est retire
  palier 2 (client bascule): identique cote base ; c'est l'application qui
                             cesse d'utiliser la lecture directe
  palier 3 (policies)      : GET /staff -> 0 ligne, porte etroite qui repond
                             toujours, promotion et suppression REFUSEES
`);

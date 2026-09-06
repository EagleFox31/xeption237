/**
 * Verifie la migration « objectifs hebdomadaires » SANS RIEN ECRIRE.
 *
 * Applique 20260906_030 dans une transaction, controle les bornes de semaine,
 * la disparition du repli silencieux, la contrainte de periode et la tranche
 * `weekly` renvoyee par get_sales_targets_progress — puis ANNULE.
 *
 *   node scripts/qa-check-objectifs-hebdo.mjs
 *
 * Sortie non nulle au premier controle faux.
 */

import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const sansTx = (f) =>
  fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '');

const AWA = '00000000-0000-4000-b000-000000000b01';
let echecs = 0;
const dit = (ok, texte) => {
  if (!ok) echecs += 1;
  console.log((ok ? 'OK    ' : 'ECHEC ') + texte);
};

try {
  await c.query('BEGIN');

  await c.query(sansTx('supabase/migrations/20260906_030_objectifs_hebdomadaires.sql'));
  console.log('migration : appliquee sans erreur\n');

  // 1. Bornes de semaine : lundi -> lundi, en heure de Douala
  const { rows: b } = await c.query(`
    SELECT to_char(p_from AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD Dy HH24:MI') AS d,
           to_char(p_to   AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD Dy HH24:MI') AS f,
           EXTRACT(ISODOW FROM (p_from AT TIME ZONE 'Africa/Douala')) AS dow,
           (p_to - p_from) = interval '7 days' AS duree
    FROM public._period_bounds('weekly')`);
  console.log('semaine courante : ' + b[0].d + '  ->  ' + b[0].f);
  dit(Number(b[0].dow) === 1, 'la semaine commence un LUNDI (ISO)');
  dit(b[0].duree, 'la semaine dure exactement 7 jours');

  // 2. Le repli silencieux est mort : une periode inconnue doit lever
  // Une erreur SQL annule toute la transaction : les essais qui DOIVENT echouer
  // sont encadres d'un point de reprise, sinon tout ce qui suit est ignore.
  let leve = false;
  await c.query('SAVEPOINT essai');
  try {
    await c.query(`SELECT * FROM public._period_bounds('hebdo')`);
    await c.query('RELEASE SAVEPOINT essai');
  } catch {
    leve = true;
    await c.query('ROLLBACK TO SAVEPOINT essai');
  }
  dit(leve, "une periode inconnue leve une exception (plus de repli sur le mois)");

  // 3. Les trois periodes sont distinctes
  const { rows: t } = await c.query(`
    SELECT (SELECT p_from FROM public._period_bounds('daily'))   AS j,
           (SELECT p_from FROM public._period_bounds('weekly'))  AS s,
           (SELECT p_from FROM public._period_bounds('monthly')) AS m`);
  dit(
    new Set([String(t[0].j), String(t[0].s), String(t[0].m)]).size >= 2,
    'jour, semaine et mois ne renvoient pas tous les memes bornes',
  );

  // 4. La contrainte accepte weekly, et refuse toujours n'importe quoi
  await c.query(sansTx('supabase/seeds/qa_objectifs_primes.sql'));
  await c.query(
    `INSERT INTO public.sales_targets (scope_type, staff_id, period_kind, target_amount)
     VALUES ('staff', $1, 'weekly', 500000)`,
    [AWA],
  );
  dit(true, "un objectif 'weekly' est accepte par la contrainte");

  let refuse = false;
  await c.query('SAVEPOINT essai2');
  try {
    await c.query(
      `INSERT INTO public.sales_targets (scope_type, staff_id, period_kind, target_amount)
       VALUES ($1, $2, 'trimestriel', 1)`,
      ['staff', AWA],
    );
    await c.query('RELEASE SAVEPOINT essai2');
  } catch {
    refuse = true;
    await c.query('ROLLBACK TO SAVEPOINT essai2');
  }
  dit(refuse, "une periode inventee reste refusee par la contrainte");

  // 5. La fonction renvoie bien la tranche semaine, mesuree sur la SEMAINE
  //
  // La fonction se garde par `auth.jwt() ->> 'email'`. Connecte en proprietaire
  // de base, il n'y a aucun jeton : elle leve « Acces reserve a l'equipe ». On
  // pose donc les revendications d'un compte direction, comme le ferait PostgREST.
  await c.query(
    `SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ email: 'admin@xeption.cm', role: 'authenticated' })],
  );
  const { rows: p } = await c.query(`SELECT public.get_sales_targets_progress() AS j`);
  const awa = p[0].j.staff.find((s) => s.staff_id === AWA);
  dit(awa?.weekly != null, 'la progression contient une tranche « weekly »');
  dit(p[0].j.period.week_from != null, 'period expose week_from / week_to');

  const { rows: attendu } = await c.query(
    `SELECT public._sum_eligible_revenue(p_from, p_to, $1::uuid, NULL) AS v
     FROM public._period_bounds('weekly')`,
    [AWA],
  );
  const veut = Number(attendu[0].v);
  const got = Number(awa.weekly.actual_amount);
  dit(
    got === veut,
    'le realise hebdomadaire vaut le CA de la SEMAINE (' +
      got +
      (got === veut ? '' : ' au lieu de ' + veut) +
      ')',
  );

  const mois = Number(awa.monthly.actual_amount);
  console.log(
    '\n  pour information : semaine ' + got + ' F, mois ' + mois + ' F' +
      (got === mois ? '  (identiques : toutes les commandes du jeu tombent dans la semaine en cours)' : ''),
  );
} catch (e) {
  echecs += 1;
  console.error('\nERREUR : ' + e.message);
} finally {
  await c.query('ROLLBACK');
  console.log('\nTransaction ANNULEE — rien n a ete ecrit en base.');
  await c.end();
}
process.exit(echecs ? 1 : 0);

/**
 * Verifie le jeu d'essai objectifs & primes SANS RIEN ECRIRE.
 *
 * Joue supabase/seeds/qa_objectifs_primes.sql dans une transaction, compare les
 * montants eligibles aux valeurs attendues a la main, liste quelles commandes
 * comptent, puis ANNULE la transaction.
 *
 * A relancer apres toute modification du predicat `orders_reportable` ou de
 * `_sum_eligible_revenue` : c'est ce qui dira si une regle a bouge.
 *
 *   node scripts/qa-check-objectifs-primes.mjs
 *
 * Sortie non nulle si un montant ne correspond pas.
 */

import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const seed = fs
  .readFileSync(new URL('../supabase/seeds/qa_objectifs_primes.sql', import.meta.url), 'utf8')
  .replace(/^BEGIN;$/m, '')
  .replace(/^COMMIT;$/m, '');

const AWA = '00000000-0000-4000-b000-000000000b01';
const BRICE = '00000000-0000-4000-b000-000000000b02';
const AKWA = '00000000-0000-4000-a000-000000000a01';
const BASTOS = '00000000-0000-4000-a000-000000000a02';

const attendu = [
  ['Awa    jour',  AWA,   null,   'daily',    400000,  300000],
  ['Awa    mois',  AWA,   null,   'monthly', 1300000, 1000000],
  ['Brice  jour',  BRICE, null,   'daily',    180000,  300000],
  ['Brice  mois',  BRICE, null,   'monthly',  480000, 1000000],
  ['Akwa   jour',  null,  AKWA,   'daily',    400000,  350000],
  ['Akwa   mois',  null,  AKWA,   'monthly', 1300000, 1200000],
  ['Bastos jour',  null,  BASTOS, 'daily',    180000,  350000],
  ['Bastos mois',  null,  BASTOS, 'monthly',  480000, 1200000],
];

let echecs = 0;
try {
  await c.query('BEGIN');
  await c.query(seed);
  console.log('SQL : execute sans erreur\n');

  console.log('realise                 attendu      mesure   verdict');
  console.log('-'.repeat(60));
  for (const [nom, staff, store, periode, veut] of attendu) {
    const { rows } = await c.query(
      `SELECT public._sum_eligible_revenue(b.p_from, b.p_to, $1::uuid, $2::uuid) AS v
       FROM public._period_bounds($3) b`,
      [staff, store, periode],
    );
    const got = Number(rows[0].v);
    const ok = got === veut;
    if (!ok) echecs += 1;
    console.log(
      nom.padEnd(22) +
        String(veut).padStart(9) +
        String(got).padStart(11) +
        '   ' +
        (ok ? 'OK' : 'ECHEC'),
    );
  }

  console.log('\npourcentages et primes');
  console.log('-'.repeat(60));
  for (const [nom, staff, store, periode, veut, cible] of attendu) {
    const pct = Math.round((veut / cible) * 1000) / 10;
    let primes = '';
    if (periode === 'monthly' && staff) {
      // Paliers EXCLUSIFS : seul le plus haut atteint est verse (pas de cumul).
      const acquis = [
        [100, 15000],
        [120, 30000],
        [150, 60000],
      ].filter(([seuil]) => pct >= seuil);
      const verse = acquis.length ? acquis[acquis.length - 1] : null;
      primes = verse
        ? ' | palier ' +
          verse[0] +
          '% -> ' +
          verse[1] +
          ' F verses' +
          (acquis.length > 1
            ? ' (' + (acquis.length - 1) + ' palier(s) inferieur(s) franchi(s), non cumules)'
            : '')
        : ' | aucune prime';
    }
    console.log(nom.padEnd(22) + String(pct).padStart(6) + ' %' + primes);
  }

  const { rows: exclus } = await c.query(
    `SELECT o.id, o.total, o.status, o.payment_status,
            (r.id IS NOT NULL) AS compte
     FROM public.orders o
     LEFT JOIN public.orders_reportable r ON r.id = o.id
     WHERE o.id LIKE 'QA-OBJ-%' OR o.id LIKE 'TEST-QA-OBJ-%'
     ORDER BY o.id`,
  );
  console.log('\ncommande            montant  statut     paiement   compte ?');
  console.log('-'.repeat(60));
  for (const r of exclus) {
    console.log(
      r.id.padEnd(20) +
        String(Number(r.total)).padStart(7) +
        '  ' +
        r.status.padEnd(10) +
        ' ' +
        r.payment_status.padEnd(10) +
        ' ' +
        (r.compte ? 'oui' : 'NON'),
    );
  }
} catch (e) {
  echecs += 1;
  console.error('ERREUR SQL : ' + e.message);
} finally {
  await c.query('ROLLBACK');
  console.log('\nTransaction ANNULEE — rien n a ete ecrit en base.');
  await c.end();
}
process.exit(echecs ? 1 : 0);

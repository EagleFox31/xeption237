#!/usr/bin/env node
/**
 * Bilan des rapports de caisse (store_cash_reports), lecture seule.
 *
 *   node scripts/cash-reports-summary.mjs [--since=YYYY-MM-DD] [--until=YYYY-MM-DD] [--store=CODE]
 *                                         [--max-day=<XAF>] [--source=bot|whatsapp_backfill]
 *
 * Par boutique puis par mois : jours, entrées, sorties, moyenne par jour, dernier solde.
 * Les jours dont les entrées dépassent `--max-day` (défaut 5 000 000 XAF) sont listés à part
 * et exclus des totaux « fiables » : ce sont presque toujours des lignes mal saisies ou mal lues.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env'), quiet: true });

/** Au-delà de ce montant d'entrées sur une journée, la ligne est suspecte (saisie ou lecture erronée). */
const DEFAULT_MAX_DAY_INFLOW_XAF = 5_000_000;

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const since = flag('since') ?? null;
const until = flag('until') ?? null;
const storeCode = flag('store') ?? null;
const source = flag('source') ?? null;
const maxDay = Number(flag('max-day') ?? DEFAULT_MAX_DAY_INFLOW_XAF);

const fmt = (n) => Math.round(Number(n ?? 0)).toLocaleString('fr-FR');
const pad = (s, n) => String(s).padEnd(n);

const client = new pg.Client({ connectionString: resolveDatabaseUrl(root), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  // Filtres paramétrés : jamais d'interpolation de valeurs dans le SQL.
  const params = [since, until, storeCode, source, maxDay];
  const WHERE = `
    where ($1::date is null or r.report_date >= $1::date)
      and ($2::date is null or r.report_date <= $2::date)
      and ($3::text is null or s.code = $3)
      and ($4::text is null or r.source = $4)`;
  const FROM = `from public.store_cash_reports r join public.stores s on s.id = r.store_id ${WHERE}`;

  const { rows: suspects } = await client.query(
    `select s.code, r.report_date::text as day, r.total_inflow ${FROM} and r.total_inflow > $5 order by r.total_inflow desc`, params);
  const { rows: byStore } = await client.query(`
    select s.code, count(*) as days,
      sum(r.total_inflow) filter (where r.total_inflow <= $5) as inflow,
      sum(r.total_outflow) filter (where r.total_inflow <= $5) as outflow,
      count(*) filter (where r.total_inflow > $5) as suspect_days,
      min(r.report_date)::text as first_day, max(r.report_date)::text as last_day,
      (array_agg(r.closing_cash order by r.report_date desc))[1] as last_closing
    ${FROM} group by s.code order by s.code`, params);
  const { rows: byMonth } = await client.query(`
    select to_char(r.report_date, 'YYYY-MM') as month, s.code, count(*) as days,
      sum(r.total_inflow) filter (where r.total_inflow <= $5) as inflow,
      sum(r.total_outflow) filter (where r.total_inflow <= $5) as outflow
    ${FROM} group by 1, 2 order by 1, 2`, params);
  const { rows: debts } = await client.query(`
    select s.code, count(*) as lines, sum((d->>'remaining')::numeric) as remaining
    from public.store_cash_reports r join public.stores s on s.id = r.store_id
    cross join lateral jsonb_array_elements(coalesce(r.debts_snapshot, '[]'::jsonb)) d
    where r.report_date = (select max(r2.report_date) from public.store_cash_reports r2 where r2.store_id = r.store_id)
      and ($1::text is null or s.code = $1)
    group by s.code order by s.code`, [storeCode]);

  console.log(`Bilan des rapports de caisse${since ? ` depuis ${since}` : ''}${until ? ` jusqu'au ${until}` : ''}`
    + ` — jours > ${fmt(maxDay)} XAF d'entrées exclus des totaux (${suspects.length} jour(s)).\n`);
  console.log('Par boutique');
  for (const s of byStore) {
    const reliable = Number(s.days) - Number(s.suspect_days);
    console.log(`  ${pad(s.code, 8)} ${pad(s.days + ' j', 6)} ${s.first_day} → ${s.last_day}`
      + ` · entrées ${fmt(s.inflow)} · sorties ${fmt(s.outflow)} · moy/j ${fmt(reliable ? s.inflow / reliable : 0)}`
      + ` · dernier solde ${fmt(s.last_closing)}${Number(s.suspect_days) ? ` · ${s.suspect_days} j suspect(s)` : ''}`);
  }
  console.log('\nPar mois');
  for (const m of byMonth) {
    console.log(`  ${m.month} ${pad(m.code, 8)} ${pad(m.days + ' j', 5)} entrées ${pad(fmt(m.inflow), 12)} sorties ${fmt(m.outflow)}`);
  }
  if (debts.length) {
    console.log('\nDettes au dernier rapport');
    for (const d of debts) console.log(`  ${pad(d.code, 8)} ${d.lines} ligne(s) · reste ${fmt(d.remaining)}`);
  }
  if (suspects.length) {
    console.log('\nJours suspects (à corriger dans le rapport d\'origine)');
    for (const x of suspects) console.log(`  ${pad(x.code, 8)} ${x.day} ${fmt(x.total_inflow)}`);
  }
} finally {
  await client.end();
}

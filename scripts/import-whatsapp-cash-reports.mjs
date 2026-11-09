#!/usr/bin/env node
/**
 * Backfill de `store_cash_reports` depuis un export texte du groupe WhatsApp staff.
 *
 *   node scripts/import-whatsapp-cash-reports.mjs <export.txt> [options]
 *
 * Options :
 *   --apply              écrit en base (défaut : simulation, aucune écriture)
 *   --out=<dir>          dossier des fichiers de revue (défaut : dossier temporaire système)
 *   --since=YYYY-MM-DD   ignorer les rapports antérieurs
 *   --author-map=<json>  repli { "<auteur WhatsApp>": "<code boutique>" } si ni la ligne
 *                        « Boutique » ni les opérateurs ne permettent de rattacher le rapport
 *
 * Idempotent : clé (store_id, report_date) ; une ligne existante n'est réécrite que si elle
 * provient d'un backfill (`source = 'whatsapp_backfill'`) ET que son contenu diffère.
 * Les rapports saisis via le bot ne sont jamais écrasés. Aucune donnée nominative en sortie console.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import dotenv from 'dotenv';
import pg from 'pg';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';
import { parseWhatsAppExport } from './lib/whatsappExport.mjs';
import { isCashReportMessage, parseCashReportText } from './lib/cashReportText.mjs';
import { createStoreResolver } from './lib/cashReportStoreResolver.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

/** Marqueur de provenance écrit dans `store_cash_reports.source`. */
export const BACKFILL_SOURCE = 'whatsapp_backfill';
const REVIEW_JSON = 'whatsapp-cash-reports.json';
const REVIEW_CSV = 'whatsapp-cash-reports-review.csv';

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith('--'));
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const apply = args.includes('--apply');
const since = flag('since') ?? null;
const outDir = flag('out') ?? resolve(tmpdir(), 'xeption-whatsapp-cash-import');
const authorMapPath = flag('author-map');

if (!inputPath) {
  console.error('Usage: node scripts/import-whatsapp-cash-reports.mjs <export.txt> [--apply] [--out=dir] [--since=YYYY-MM-DD] [--author-map=file.json]');
  process.exit(2);
}

const databaseUrl = resolveDatabaseUrl(root);
if (!databaseUrl) {
  console.error('✗ Aucun accès base configuré (DATABASE_URL ou SUPABASE_DB_PASSWORD dans .env).');
  process.exit(1);
}
const authorStores = authorMapPath ? JSON.parse(readFileSync(resolve(authorMapPath), 'utf8')) : {};

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows: stores } = await client.query('select id, code, name from public.stores order by code');
  const { rows: staff } = await client.query('select id, name, store_id from public.staff');
  const resolver = createStoreResolver({ stores, staff, authorStores });

  const messages = parseWhatsAppExport(readFileSync(resolve(inputPath), 'utf8'));
  const authors = [...new Set(messages.map((m) => m.author))];
  const candidates = messages.filter((m) => isCashReportMessage(m.lines));

  const rows = [];
  for (const msg of candidates) {
    const parsed = parseCashReportText(msg.lines, { matchSeller: resolver.matchSeller });
    const reportDate = parsed.report_date ?? msg.date;
    if (since && reportDate < since) continue;
    const { store, method } = resolver.resolveStore(parsed, msg.author);
    const flags = [...parsed.warnings];
    if (!parsed.report_date) flags.push('date_from_post');
    else if (parsed.report_date !== msg.date) flags.push('date_differs_from_post');
    if (!store) flags.push('store_unresolved');
    rows.push({
      posted_at: `${msg.date}T${msg.time}`,
      author_index: authors.indexOf(msg.author),
      message_index: msg.index,
      store_id: store?.id ?? null,
      store_code: store?.code ?? null,
      store_method: method,
      report_date: reportDate,
      status: store ? 'ready' : 'skipped',
      flags,
      data: parsed,
    });
  }

  reassignMistitledDates(rows);

  // Doublons (même boutique, même date) : le dernier message posté fait foi,
  // sauf si deux auteurs différents décrivent deux caisses différentes (séries
  // parallèles) : aucun des deux n'est importé, la décision revient au staff.
  const byKey = new Map();
  for (const row of rows) {
    if (!row.store_id) continue;
    const key = `${row.store_id}|${row.report_date}`;
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, row); continue; }
    if (isConflictingSeries(prev, row)) {
      for (const r of [prev, row]) {
        r.status = 'conflict';
        if (!r.flags.includes('conflicting_series')) r.flags.push('conflicting_series');
      }
      continue;
    }
    const loser = prev.posted_at <= row.posted_at ? prev : row;
    loser.status = 'superseded';
    loser.flags.push('duplicate_superseded');
    byKey.set(key, loser === prev ? row : prev);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, REVIEW_JSON), JSON.stringify(rows, null, 2));
  writeFileSync(resolve(outDir, REVIEW_CSV), toReviewCsv(rows));

  const ready = rows.filter((r) => r.status === 'ready');
  printSummary({ messages, candidates, rows, ready, stores });
  console.log(`\nFichiers de revue : ${outDir}`);

  if (!apply) {
    console.log('\nSimulation : aucune écriture. Relancer avec --apply pour importer.');
  } else {
    await ensureSourceColumn(client);
    const counts = await upsertReports(client, ready);
    console.log(`\nImport : ${counts.inserted} créés, ${counts.updated} mis à jour, ${counts.unchanged} inchangés, ${counts.protected} protégés (saisie bot, non écrasés).`);
  }
} finally {
  await client.end();
}

function printSummary({ messages, candidates, rows, ready, stores }) {
  console.log(`Messages : ${messages.length} · rapports détectés : ${candidates.length} · retenus : ${rows.length}`);
  const byStore = new Map();
  for (const r of ready) byStore.set(r.store_code, (byStore.get(r.store_code) ?? 0) + 1);
  for (const s of stores) if (byStore.has(s.code)) console.log(`  ${s.code} : ${byStore.get(s.code)} jours`);
  const statusCounts = countBy(rows, (r) => r.status);
  console.log(`Statuts : ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  const flagCounts = countBy(rows.flatMap((r) => r.flags), (f) => f);
  const flagLine = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', ');
  console.log(`Avertissements : ${flagLine || 'aucun'}`);
  const dates = ready.map((r) => r.report_date).sort();
  if (dates.length) console.log(`Période : ${dates[0]} → ${dates[dates.length - 1]}`);
}

/**
 * Titre « Rapport du J » posté un autre jour alors qu'un rapport existe déjà pour J :
 * si la date de publication est libre et que le solde d'ouverture enchaîne sur la
 * clôture du rapport de J (continuité de caisse), le titre est une coquille →
 * le rapport est daté du jour de publication. Sinon il reste tel quel (dédoublonnage).
 */
/** Deux rapports d'auteurs différents dont le solde d'ouverture ET de clôture divergent = deux caisses. */
function isConflictingSeries(a, b) {
  if (a.author_index === b.author_index) return false;
  return a.data.opening_cash !== b.data.opening_cash && a.data.closing_cash !== b.data.closing_cash;
}

function reassignMistitledDates(rows) {
  const slot = (row, date) => rows.find((r) => r !== row && r.store_id === row.store_id && r.report_date === date);
  for (const row of rows) {
    if (!row.store_id || !row.flags.includes('date_differs_from_post')) continue;
    const postDate = row.posted_at.slice(0, 10);
    const titled = slot(row, row.report_date);
    if (!titled || slot(row, postDate)) continue;
    if (titled.data.closing_cash !== null && titled.data.closing_cash === row.data.opening_cash) {
      row.report_date = postDate;
      row.flags.push('date_reassigned_to_post');
    }
  }
}

function countBy(list, keyFn) {
  const out = {};
  for (const item of list) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** CSV de contrôle sans donnée nominative (ni clients, ni auteurs, ni libellés). */
function toReviewCsv(rows) {
  const header = ['report_date', 'posted_at', 'store_code', 'store_method', 'status', 'author_index', 'opening_cash',
    'inflow_items', 'inflow_sum', 'declared_total_inflow', 'outflow_items', 'outflow_sum', 'declared_total_outflow',
    'closing_cash', 'debts', 'items_with_seller', 'flags'];
  const sum = (items) => items.reduce((s, it) => s + it.amount, 0);
  const lines = rows.map((r) => [
    r.report_date, r.posted_at, r.store_code ?? '', r.store_method ?? '', r.status, r.author_index, r.data.opening_cash ?? '',
    r.data.inflow_items.length, sum(r.data.inflow_items), r.data.declared_total_inflow ?? '',
    r.data.outflow_items.length, sum(r.data.outflow_items), r.data.declared_total_outflow ?? '',
    r.data.closing_cash ?? '', r.data.debts.length, r.data.inflow_items.filter((it) => it.seller_name).length,
    r.flags.join(' '),
  ].join(','));
  return [header.join(','), ...lines].join('\n');
}

async function ensureSourceColumn(client) {
  const { rows } = await client.query(
    "select 1 from information_schema.columns where table_schema='public' and table_name='store_cash_reports' and column_name='source'",
  );
  if (!rows.length) {
    throw new Error('Colonne store_cash_reports.source absente : appliquer d\'abord la migration '
      + '`npm run db:apply -- supabase/migrations/20261109_001_store_cash_reports_source.sql`.');
  }
}

const UPSERT_SQL = `
insert into public.store_cash_reports
  (store_id, report_date, operators, opening_cash, closing_cash, total_inflow, total_outflow,
   inflow_items, outflow_items, debts_snapshot, observations, source, source_ref)
values ($1, $2::date, $3::text[], $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13)
on conflict (store_id, report_date) do update set
  operators = excluded.operators,
  opening_cash = excluded.opening_cash,
  closing_cash = excluded.closing_cash,
  total_inflow = excluded.total_inflow,
  total_outflow = excluded.total_outflow,
  inflow_items = excluded.inflow_items,
  outflow_items = excluded.outflow_items,
  debts_snapshot = excluded.debts_snapshot,
  observations = excluded.observations,
  source_ref = excluded.source_ref,
  updated_at = now()
where store_cash_reports.source = excluded.source
  and (store_cash_reports.operators, store_cash_reports.opening_cash, store_cash_reports.closing_cash,
       store_cash_reports.total_inflow, store_cash_reports.total_outflow, store_cash_reports.inflow_items,
       store_cash_reports.outflow_items, store_cash_reports.debts_snapshot, store_cash_reports.observations)
      is distinct from
      (excluded.operators, excluded.opening_cash, excluded.closing_cash, excluded.total_inflow,
       excluded.total_outflow, excluded.inflow_items, excluded.outflow_items, excluded.debts_snapshot, excluded.observations)
returning (xmax = 0) as inserted`;

async function upsertReports(client, ready) {
  const counts = { inserted: 0, updated: 0, unchanged: 0, protected: 0 };
  await client.query('begin');
  try {
    for (const row of ready) {
      const d = row.data;
      const totalInflow = d.inflow_items.reduce((s, it) => s + it.amount, 0);
      const totalOutflow = d.outflow_items.reduce((s, it) => s + it.amount, 0);
      const res = await client.query(UPSERT_SQL, [
        row.store_id, row.report_date, d.operators, d.opening_cash ?? 0, d.closing_cash ?? 0,
        totalInflow, totalOutflow, JSON.stringify(d.inflow_items), JSON.stringify(d.outflow_items),
        JSON.stringify(d.debts), d.observations || null, BACKFILL_SOURCE, `whatsapp:${row.posted_at}`,
      ]);
      if (res.rowCount === 0) {
        const { rows } = await client.query(
          'select source from public.store_cash_reports where store_id = $1 and report_date = $2::date',
          [row.store_id, row.report_date],
        );
        if (rows[0]?.source === BACKFILL_SOURCE) counts.unchanged++;
        else counts.protected++;
      } else if (res.rows[0].inserted) counts.inserted++;
      else counts.updated++;
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  return counts;
}

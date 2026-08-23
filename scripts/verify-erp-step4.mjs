/**
 * Vérifie les critères d'acceptation ERP étape 4 (bascule stock multi-boutiques).
 * Usage : npm run db:verify:step4
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const pg = (await import('pg')).default;
const client = new pg.Client({
  connectionString: resolveDatabaseUrl(root),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

let failed = 0;

function ok(label) {
  console.log(`✓ ${label}`);
}
function fail(label, detail) {
  failed += 1;
  console.error(`✗ ${label}`);
  if (detail) console.error(`  ${detail}`);
}

const tables = ['stock_reservations'];
for (const t of tables) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [t],
  );
  if (rows.length) ok(`table ${t} existe`);
  else fail(`table ${t} absente`);
}

const { rows: triggerRows } = await client.query(`
  SELECT 1 FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'store_stock' AND t.tgname = 'trg_sync_product_stock_from_stores'
`);
if (triggerRows.length) ok('trigger trg_sync_product_stock_from_stores actif');
else fail('trigger sync products.stock absent');

const rpcs = [
  'create_order_atomic',
  'complete_pos_sale_atomic',
  'complete_troc_with_sale_atomic',
  'set_product_catalog_stock',
  'sync_order_stock_on_status',
  'expire_stock_reservations',
];
for (const fn of rpcs) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = $1`,
    [fn],
  );
  if (rows.length) ok(`RPC ${fn}`);
  else fail(`RPC ${fn} absente`);
}

const { rows: mirrorMismatch } = await client.query(`
  SELECT p.id, p.stock AS catalog_stock, COALESCE(SUM(GREATEST(ss.quantity - ss.reserved, 0)), 0)::int AS computed
  FROM products p
  LEFT JOIN store_stock ss ON ss.product_id = p.id
  GROUP BY p.id, p.stock
  HAVING p.stock <> COALESCE(SUM(GREATEST(ss.quantity - ss.reserved, 0)), 0)::int
  LIMIT 5
`);
if (!mirrorMismatch.length) {
  ok('products.stock = SUM(store_stock dispo)');
} else {
  fail('miroir products.stock incohérent', JSON.stringify(mirrorMismatch));
}

const { rows: activeReservations } = await client.query(`
  SELECT count(*)::int AS n FROM public.stock_reservations WHERE status = 'active'
`).catch(() => ({ rows: [{ n: 0 }] }));
console.log(`\nRéservations actives : ${activeReservations[0]?.n ?? 0}`);

await client.end();
process.exit(failed ? 1 : 0);

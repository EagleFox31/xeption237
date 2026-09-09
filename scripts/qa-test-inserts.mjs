/**
 * Test INSERT pour V (anon) et C (authenticated sans staff email)
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
  SELECT c.relname AS t
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname`);

const [existingStore] = await q(`SELECT id FROM public.stores LIMIT 1`);
const [existingProduct] = await q(`SELECT id FROM public.products LIMIT 1`);
const storeId = existingStore?.id || '00000000-0000-0000-0000-000000000001';
const prodId = existingProduct?.id || 'prod-test-1';

const essaiInsert = async (role, claims, sql) => {
  await c.query('SAVEPOINT s');
  try {
    await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
    await c.query('SET LOCAL role ' + role);
    const r = await c.query(sql);
    await c.query('RESET role');
    await c.query('ROLLBACK TO SAVEPOINT s');
    return 'X';
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT s');
    await c.query('RESET role');
    return '.';
  }
};

await c.query('BEGIN');

const insertTests = {
  ai_usage_quota: `INSERT INTO public.ai_usage_quota (ip, day, count) VALUES ('127.0.0.1', now()::date, 1)`,
  argus: `INSERT INTO public.argus (brand, model, price_clean) VALUES ('Apple', 'iPhone Test', 100000)`,
  bonus_rules: `INSERT INTO public.bonus_rules (id, min_margin_rate, bonus_rate) VALUES (gen_random_uuid(), 10, 5)`,
  brands: `INSERT INTO public.brands (name, slug) VALUES ('Brand Test', 'brand-test')`,
  catalog_health_findings: `INSERT INTO public.catalog_health_findings (product_id, issue_type, severity) VALUES ('p1', 'test', 'low')`,
  categories: `INSERT INTO public.categories (name, slug) VALUES ('Cat Test', 'cat-test')`,
  customer_returns: `INSERT INTO public.customer_returns (customer_name, customer_phone, return_reason) VALUES ('T', '699', 'defect')`,
  customers: `INSERT INTO public.customers (name, phone) VALUES ('Client Test', '699000111')`,
  delivery_zones: `INSERT INTO public.delivery_zones (name, delay, price, type) VALUES ('Zone Test', '24h', 1000, 'standard')`,
  imei_certif_records: `INSERT INTO public.imei_certif_records (imei, model_name) VALUES ('356938035643803', 'T')`,
  imei_premium_calls: `INSERT INTO public.imei_premium_calls (imei, service_provider) VALUES ('356938035643803', 't')`,
  market_demand_signals: `INSERT INTO public.market_demand_signals (category, brand, search_term) VALUES ('phones', 'A', 'T')`,
  market_price_cache: `INSERT INTO public.market_price_cache (model_key, brand, model_name, market_price) VALUES ('k', 'A', 'M', 1000)`,
  market_price_snapshots: `INSERT INTO public.market_price_snapshots (model_key, brand, model_name, market_price) VALUES ('k', 'A', 'M', 1000)`,
  market_reference_prices: `INSERT INTO public.market_reference_prices (brand, model_name, avg_market_price) VALUES ('A', 'M', 1000)`,
  market_trend_cache: `INSERT INTO public.market_trend_cache (model_key, trend) VALUES ('k', 'up')`,
  market_used_offers: `INSERT INTO public.market_used_offers (source, brand, model_name, price) VALUES ('s', 'A', 'M', 1000)`,
  order_feedback: `INSERT INTO public.order_feedback (invite_id, rating) VALUES ('dummy', 5)`,
  order_feedback_invites: `INSERT INTO public.order_feedback_invites (order_id, kind, customer_name, customer_phone) VALUES ('o1', 'kind', 'N', '699')`,
  order_items: `INSERT INTO public.order_items (order_id, product_name, unit_price, quantity, line_total) VALUES ('o1', 'P', 100, 1, 100)`,
  order_payments: `INSERT INTO public.order_payments (order_id, reference, amount, channel, phone) VALUES ('o1', 'R', 100, 'om', '699')`,
  orders: `INSERT INTO public.orders (id, customer_name, customer_phone, total) VALUES ('ord-dummy-1', 'C', '699', 100)`,
  packs: `INSERT INTO public.packs (name, price) VALUES ('Pack Hack', 100)`,
  phone_releases: `INSERT INTO public.phone_releases (brand, model, release_year) VALUES ('A', 'M', 2024)`,
  product_ranges: `INSERT INTO public.product_ranges (name, slug, category) VALUES ('R', 'r', 'phones')`,
  products: `INSERT INTO public.products (id, name, price, category) VALUES ('hack-prod', 'P', 100, 'phones')`,
  qa_test_runs: `INSERT INTO public.qa_test_runs (suite_name, status) VALUES ('s', 'passed')`,
  repair_tickets: `INSERT INTO public.repair_tickets (customer_name, customer_phone, issue_description) VALUES ('C', '699', 'issue')`,
  sales_targets: `INSERT INTO public.sales_targets (scope_type, period_kind, target_amount) VALUES ('g', 'm', 1000)`,
  schema_migrations: `INSERT INTO public.schema_migrations (version, checksum) VALUES ('v', 'c')`,
  security_events: `INSERT INTO public.security_events (event_type, actor_email) VALUES ('hack', 'anon@hacker.com')`,
  staff: `INSERT INTO public.staff (name, email, role) VALUES ('Hacker', 'hack@test.com', 'direction')`,
  stock_inventory_lines: `INSERT INTO public.stock_inventory_lines (session_id, product_id, expected_qty) VALUES (gen_random_uuid(), '${prodId}', 1)`,
  stock_inventory_sessions: `INSERT INTO public.stock_inventory_sessions (store_id) VALUES ('${storeId}')`,
  stock_movements: `INSERT INTO public.stock_movements (store_id, product_id, delta, reason) VALUES ('${storeId}', '${prodId}', 1, 'hack')`,
  stock_reservations: `INSERT INTO public.stock_reservations (order_id, store_id, product_id, qty) VALUES ('o1', '${storeId}', '${prodId}', 1)`,
  stock_transfer_items: `INSERT INTO public.stock_transfer_items (transfer_id, product_id, quantity) VALUES (gen_random_uuid(), '${prodId}', 1)`,
  stock_transfers: `INSERT INTO public.stock_transfers (from_store_id, to_store_id) VALUES ('${storeId}', '${storeId}')`,
  store_stock: `INSERT INTO public.store_stock (store_stock_id, store_id, product_id, quantity) VALUES (gen_random_uuid(), '${storeId}', '${prodId}', 1)`,
  stores: `INSERT INTO public.stores (code, name, city) VALUES ('TEST', 'T', 'Yde')`,
  tac_cache: `INSERT INTO public.tac_cache (tac, brand, model) VALUES ('99999999', 'A', 'M')`,
  trade_in_models: `INSERT INTO public.trade_in_models (category, brand, model_name, base_price) VALUES ('phones', 'A', 'M', 1000)`,
  trade_in_requests: `INSERT INTO public.trade_in_requests (customer_name, customer_phone, device_brand, device_model) VALUES ('C', '699', 'A', 'M')`,
  troc_certificates: `INSERT INTO public.troc_certificates (trade_in_id, reference, qr_token) VALUES ('t1', 'r1', 'tok')`,
  troc_payments: `INSERT INTO public.troc_payments (trade_in_id, reference, amount, channel, phone) VALUES ('t1', 'r1', 1000, 'om', '699')`,
  troc_sessions: `INSERT INTO public.troc_sessions (session_key, last_step) VALUES (gen_random_uuid()::text, 'form')`,
};

console.log('table'.padEnd(28) + 'V_INSERT   C_INSERT');
console.log('-'.repeat(50));

const openInserts = [];

for (const t of tables) {
  const sql = insertTests[t.t];
  if (!sql) {
    console.log(t.t.padEnd(28) + '  (pas de test INSERT)');
    continue;
  }
  const v = await essaiInsert('anon', { role: 'anon' }, sql);
  const cRes = await essaiInsert('authenticated', { role: 'authenticated' }, sql);
  console.log(t.t.padEnd(28) + '   ' + v + '          ' + cRes);
  if (v === 'X' || cRes === 'X') {
    openInserts.push({ t: t.t, v, c: cRes });
  }
}

await c.query('ROLLBACK');

console.log('\n=== TABLES AVEC INSERT OUVERT A ANON (V) OU AUTH NON-STAFF (C) ===');
console.table(openInserts);

await c.end();

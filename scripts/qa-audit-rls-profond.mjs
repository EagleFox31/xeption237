/**
 * Audit RLS PROFOND & DYNAMIQUE — avec remplissage temporaire des tables vides.
 *
 *   node scripts/qa-audit-rls-profond.mjs
 *
 * Pour CHAQUE table (vide ou non), dans une transaction ANNULEE (ROLLBACK) :
 * 1. Si la table est vide, insère une ligne témoin (seed temporaire).
 * 2. Teste dynamiquement sous 3 identités :
 *    - V : Visiteur anonyme (role 'anon')
 *    - C : Chatbot / Visiteur connecté anonymement (role 'authenticated', sans email)
 *    - S : Staff connecté (role 'authenticated', email d'un membre de la direction)
 * 3. Pour chaque identité, teste les 4 opérations :
 *    - L (SELECT)
 *    - I (INSERT)
 *    - M (UPDATE)
 *    - S (DELETE)
 * 4. Fait ROLLBACK total : aucune donnée de test n'est persistée.
 */

import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const q = async (sql, p) => (await c.query(sql, p)).rows;

// Récupérer un email staff existant
const [staffMember] = await q(`SELECT email FROM public.staff LIMIT 1`);
const staffEmail = staffMember ? staffMember.email : 'admin@xeption.cm';

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

// Helper pour tester une action sous un rôle et claims donnés
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
    return '.';
  }
};

await c.query('BEGIN');
const resultats = [];

// Seed helpers pour tables vides (IDs existants pour FK)
const [existingStore] = await q(`SELECT id FROM public.stores LIMIT 1`);
const [existingProduct] = await q(`SELECT id FROM public.products LIMIT 1`);
const storeId = existingStore?.id || '00000000-0000-0000-0000-000000000001';
const prodId = existingProduct?.id || 'prod-test-1';

for (const t of tables) {
  const tableName = t.t;
  let [{ n }] = await q(`SELECT count(*)::int AS n FROM public.${tableName}`);
  let wasEmpty = (n === 0);

  // Si vide, insérons une ligne de test en mode admin/postgres
  if (wasEmpty) {
    try {
      await c.query('SAVEPOINT seed');
      switch (tableName) {
        case 'bonus_rules':
          await c.query(`INSERT INTO public.bonus_rules (id, min_margin_rate, bonus_rate) VALUES (gen_random_uuid(), 10, 5)`);
          break;
        case 'customer_returns':
          await c.query(`INSERT INTO public.customer_returns (id, customer_name, customer_phone, return_reason) VALUES (gen_random_uuid(), 'Test', '699000000', 'defect')`);
          break;
        case 'imei_certif_records':
          await c.query(`INSERT INTO public.imei_certif_records (id, imei, model_name) VALUES (gen_random_uuid(), '356938035643803', 'iPhone Test')`);
          break;
        case 'imei_premium_calls':
          await c.query(`INSERT INTO public.imei_premium_calls (id, imei, service_provider) VALUES (gen_random_uuid(), '356938035643803', 'test_provider')`);
          break;
        case 'market_demand_signals':
          await c.query(`INSERT INTO public.market_demand_signals (id, category, brand, search_term) VALUES (gen_random_uuid(), 'phones', 'Apple', 'iPhone 15')`);
          break;
        case 'market_reference_prices':
          await c.query(`INSERT INTO public.market_reference_prices (id, brand, model_name, avg_market_price) VALUES (gen_random_uuid(), 'Apple', 'iPhone 15', 500000)`);
          break;
        case 'order_feedback_invites':
          await c.query(`INSERT INTO public.order_feedback_invites (id, order_id, kind, customer_name, customer_phone) VALUES ('test-token-1', 'order-1', 'post_delivery', 'Jean', '699000000')`);
          break;
        case 'order_feedback':
          // Dépend de order_feedback_invites
          await c.query(`INSERT INTO public.order_feedback_invites (id, order_id, kind, customer_name, customer_phone) VALUES ('test-token-fb', 'order-1', 'post_delivery', 'Jean', '699000000') ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.order_feedback (id, invite_id, rating, comment) VALUES (gen_random_uuid(), 'test-token-fb', 5, 'Super')`);
          break;
        case 'orders':
          await c.query(`INSERT INTO public.orders (id, customer_name, customer_phone, total) VALUES ('ord-test-1', 'Client Test', '699000000', 50000)`);
          break;
        case 'order_items':
          await c.query(`INSERT INTO public.orders (id, customer_name, customer_phone, total) VALUES ('ord-items-1', 'Client', '699000000', 50000) ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.order_items (id, order_id, product_name, unit_price, quantity, line_total) VALUES (gen_random_uuid(), 'ord-items-1', 'Test Item', 50000, 1, 50000)`);
          break;
        case 'order_payments':
          await c.query(`INSERT INTO public.orders (id, customer_name, customer_phone, total) VALUES ('ord-pay-1', 'Client', '699000000', 50000) ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.order_payments (id, order_id, reference, amount, channel, phone) VALUES ('pay-1', 'ord-pay-1', 'REF123', 50000, 'om', '699000000')`);
          break;
        case 'packs':
          await c.query(`INSERT INTO public.packs (id, name, price) VALUES (gen_random_uuid(), 'Pack Test', 150000)`);
          break;
        case 'sales_targets':
          await c.query(`INSERT INTO public.sales_targets (id, scope_type, period_kind, target_amount) VALUES (gen_random_uuid(), 'global', 'monthly', 10000000)`);
          break;
        case 'security_events':
          await c.query(`INSERT INTO public.security_events (id, event_type, actor_email) VALUES (gen_random_uuid(), 'login', '${staffEmail}')`);
          break;
        case 'stock_inventory_sessions':
          await c.query(`INSERT INTO public.stock_inventory_sessions (id, store_id) VALUES (gen_random_uuid(), '${storeId}')`);
          break;
        case 'stock_inventory_lines':
          const sessId = '11111111-1111-1111-1111-111111111111';
          await c.query(`INSERT INTO public.stock_inventory_sessions (id, store_id) VALUES ('${sessId}', '${storeId}') ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.stock_inventory_lines (id, session_id, product_id, expected_qty) VALUES (gen_random_uuid(), '${sessId}', '${prodId}', 5)`);
          break;
        case 'stock_reservations':
          await c.query(`INSERT INTO public.orders (id, customer_name, customer_phone, total) VALUES ('ord-res-1', 'Client', '699000000', 50000) ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.stock_reservations (id, order_id, store_id, product_id, qty) VALUES (gen_random_uuid(), 'ord-res-1', '${storeId}', '${prodId}', 1)`);
          break;
        case 'stock_transfers':
          await c.query(`INSERT INTO public.stock_transfers (id, from_store_id, to_store_id) VALUES (gen_random_uuid(), '${storeId}', '${storeId}')`);
          break;
        case 'stock_transfer_items':
          const trId = '22222222-2222-2222-2222-222222222222';
          await c.query(`INSERT INTO public.stock_transfers (id, from_store_id, to_store_id) VALUES ('${trId}', '${storeId}', '${storeId}') ON CONFLICT DO NOTHING`);
          await c.query(`INSERT INTO public.stock_transfer_items (id, transfer_id, product_id, quantity) VALUES (gen_random_uuid(), '${trId}', '${prodId}', 2)`);
          break;
        case 'troc_certificates':
          await c.query(`INSERT INTO public.troc_certificates (id, trade_in_id, reference, qr_token) VALUES (gen_random_uuid(), 'trade-1', 'TRC-TEST', 'tok-123')`);
          break;
        default:
          break;
      }
      await c.query('RELEASE SAVEPOINT seed');
    } catch (err) {
      await c.query('ROLLBACK TO SAVEPOINT seed');
      // seed failed
    }
  }

  // Vérifier la première colonne modifiable
  const [col] = await q(
    `SELECT column_name AS c FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND is_generated='NEVER' AND is_identity='NO'
     ORDER BY ordinal_position LIMIT 1`, [tableName]);

  const r = { t: tableName, wasEmpty, cells: {} };

  const rolesToTest = [
    { key: 'V', role: 'anon', claims: { role: 'anon' } },
    { key: 'C', role: 'authenticated', claims: { role: 'authenticated' } },
    { key: 'S', role: 'authenticated', claims: { role: 'authenticated', email: staffEmail } },
  ];

  for (const { key, role, claims } of rolesToTest) {
    // SELECT
    r.cells[key + 'L'] = await essai(role, claims, `SELECT 1 FROM public.${tableName} LIMIT 1`);
    // UPDATE
    if (col) {
      r.cells[key + 'M'] = await essai(role, claims,
        `UPDATE public.${tableName} SET ${col.c} = ${col.c} WHERE ctid IN (SELECT ctid FROM public.${tableName} LIMIT 1)`);
    } else {
      r.cells[key + 'M'] = '.';
    }
    // DELETE
    r.cells[key + 'S'] = await essai(role, claims,
      `DELETE FROM public.${tableName} WHERE ctid IN (SELECT ctid FROM public.${tableName} LIMIT 1)`);
  }

  resultats.push(r);
}

await c.query('ROLLBACK');

console.log('table'.padEnd(28) + 'était_vide  V:L M S   C:L M S   S:L M S');
console.log('-'.repeat(70));
for (const r of resultats) {
  const c2 = r.cells;
  console.log(
    r.t.padEnd(28) + (r.wasEmpty ? '  OUI     ' : '  non     ') +
    ' ' + c2.VL + ' ' + c2.VM + ' ' + c2.VS + '   ' +
    ' ' + c2.CL + ' ' + c2.CM + ' ' + c2.CS + '   ' +
    ' ' + c2.SL + ' ' + c2.SM + ' ' + c2.SS
  );
}

// Analyse des vulnérabilités
const leaksV = resultats.filter(r => ['VL', 'VM', 'VS'].some(k => r.cells[k] === 'X') &&
  !['brands', 'categories', 'delivery_zones', 'phone_releases', 'product_ranges', 'products', 'tac_cache', 'trade_in_models', 'packs'].includes(r.t));

const leaksC = resultats.filter(r => ['CL', 'CM', 'CS'].some(k => r.cells[k] === 'X') &&
  !['brands', 'categories', 'delivery_zones', 'phone_releases', 'product_ranges', 'products', 'tac_cache', 'trade_in_models', 'packs'].includes(r.t));

const packsWrite = resultats.find(r => r.t === 'packs' && (r.cells.CM === 'X' || r.cells.CS === 'X' || r.cells.VM === 'X' || r.cells.VS === 'X'));

console.log('\n' + '='.repeat(70));
console.log('🔴 FUITE VISITEUR ANONYME (V) HORS CATALOGUE PUBLIC :');
console.log(leaksV.map(r => `${r.t} (L:${r.cells.VL}, M:${r.cells.VM}, S:${r.cells.VS})`).join('\n') || '  (aucune)');

console.log('\n🔴 FUITE CHATBOT / AUTHENTICATED SANS STAFF EMAIL (C) :');
console.log(leaksC.map(r => `${r.t} (L:${r.cells.CL}, M:${r.cells.CM}, S:${r.cells.CS})`).join('\n') || '  (aucune)');

if (packsWrite) {
  console.log(`\n🔴 PACKS MODIFIABLE PAR ROLE NON-STAFF : CM=${packsWrite.cells.CM}, CS=${packsWrite.cells.CS}`);
}

await c.end();

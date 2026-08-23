/**
 * Vérifie les critères d'acceptation ERP étape 2 (A2–A4).
 * Usage : npm run db:verify:step2
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

const tables = ['stores', 'store_stock', 'stock_movements', 'order_items'];
for (const t of tables) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [t],
  );
  if (rows.length) ok(`table ${t} existe`);
  else fail(`table ${t} absente`);
}

const { rows: defaultStores } = await client.query(
  `SELECT id, code, name FROM stores WHERE is_default = true`,
);
if (defaultStores.length === 1) {
  ok(`boutique default unique (${defaultStores[0].code})`);
} else {
  fail(`boutique default`, `${defaultStores.length} ligne(s) is_default=true`);
}

const { rows: stockMismatch } = await client.query(`
  SELECT p.id, p.stock, ss.quantity
  FROM products p
  LEFT JOIN store_stock ss ON ss.product_id = p.id
    AND ss.store_id = (SELECT id FROM stores WHERE is_default LIMIT 1)
  WHERE p.stock > 0 AND (ss.quantity IS NULL OR ss.quantity <> p.stock)
  LIMIT 5
`);
if (!stockMismatch.length) {
  ok('store_stock default = products.stock (stock > 0)');
} else {
  fail('store_stock incohérent', JSON.stringify(stockMismatch));
}

const { rows: orderMismatch } = await client.query(`
  SELECT o.id,
         jsonb_array_length(
           CASE WHEN jsonb_typeof(COALESCE(o.items, '[]'::jsonb)) = 'array'
                THEN COALESCE(o.items, '[]'::jsonb) ELSE '[]'::jsonb END
         ) AS json_lines,
         COUNT(oi.id)::int AS rel_lines
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id, o.items
  HAVING jsonb_array_length(
           CASE WHEN jsonb_typeof(COALESCE(o.items, '[]'::jsonb)) = 'array'
                THEN COALESCE(o.items, '[]'::jsonb) ELSE '[]'::jsonb END
         ) <> COUNT(oi.id)::int
  LIMIT 5
`);
if (!orderMismatch.length) {
  ok('order_items backfill aligné sur orders.items');
} else {
  fail('order_items incomplet', JSON.stringify(orderMismatch));
}

// ── Couverture analytique d'order_items ──────────────────────────────────────
// Le backfill ne peut pas inventer des lignes qui n'ont jamais existé : les
// commandes dont `orders.items` est NULL n'en produisent aucune. Ce n'est donc
// PAS un échec du backfill — mais ces commandes seront invisibles du top produits
// et du CA par produit (étape 6), alors qu'elles comptent dans le CA total.
// On l'affiche à chaque exécution pour que l'écart ne devienne jamais silencieux.
const { rows: coverage } = await client.query(`
  SELECT
    (SELECT count(*)::int FROM orders)                       AS commandes,
    (SELECT count(DISTINCT order_id)::int FROM order_items)  AS avec_lignes,
    (SELECT count(*)::int FROM orders o
       WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id))
                                                             AS sans_lignes,
    (SELECT COALESCE(sum(o.total), 0) FROM orders o
       WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id))
                                                             AS ca_hors_analyse
`);
const cov = coverage[0];
if (cov.sans_lignes === 0) {
  ok(`order_items couvre les ${cov.commandes} commandes`);
} else {
  console.warn(
    `⚠ order_items couvre ${cov.avec_lignes}/${cov.commandes} commandes — ` +
      `${cov.sans_lignes} sans items (${Number(cov.ca_hors_analyse).toLocaleString('fr-FR')} FCFA).\n` +
      `  Ces commandes comptent dans le CA total mais seront ABSENTES du détail par ` +
      `produit/catégorie (étape 6). Écart attendu, pas une régression.`,
  );
}

const { rows: counts } = await client.query(`
  SELECT
    (SELECT count(*)::int FROM stores) AS stores,
    (SELECT count(*)::int FROM store_stock) AS store_stock,
    (SELECT count(*)::int FROM stock_movements WHERE reason = 'initial_backfill') AS backfill_moves,
    (SELECT count(*)::int FROM order_items) AS order_items
`);
console.log('\nCompteurs:', counts[0]);

await client.end();
process.exit(failed ? 1 : 0);

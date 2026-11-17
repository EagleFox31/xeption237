#!/usr/bin/env node
// Écarts entre le catalogue de reprise (`trade_in_models`) et le catalogue boutique (`products`).
// READ-ONLY : n'exécute que des SELECT dans une transaction en lecture seule. N'écrit rien.
//
// Usage : npm run troc:catalog-gaps
//
// Affiche :
//   1. le calibrage du ratio prix boutique → base_price (ADR-005) sur les modèles présents des
//      deux côtés, à comparer à SHOP_TO_TRADE_IN_BASE_RATIO ;
//   2. les produits boutique (phones, tablettes) sans entrée de reprise, groupés par modèle,
//      avec le base_price que la reprise utilisera (et que le staff peut figer dans le catalogue).
//
// Réutilise le matching et la conversion du code applicatif (pas de copie) : Node ≥ 22.18 requis
// pour importer les modules .ts sans compilation.

import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env'), quiet: true });

const importTs = (rel) => import(pathToFileURL(resolve(root, rel)).href);
let cap;
let base;
try {
  cap = await importTs('utils/shopPriceCap.ts');
  base = await importTs('utils/basePriceResolution.ts');
} catch (error) {
  console.error(`✗ Import des modules .ts impossible (Node ${process.version}) : Node ≥ 22.18 requis.`, error);
  process.exit(1);
}

const databaseUrl = resolveDatabaseUrl(root);
if (!databaseUrl) {
  console.error('✗ Accès DB introuvable : renseigner DATABASE_URL (ou SUPABASE_DB_PASSWORD) dans .env.');
  process.exit(1);
}
const pg = (await import('pg')).default;
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Regroupement indicatif par modèle : on retire stockage (« 128 Go », « 1To ») et mentions d'état.
const STORAGE_OR_NOISE = /\b\d+\s*(go|gb|to|tb)\b|\(.*?\)|\b(non\s+)?scell\S*|\breconditionn\S*.*$/gi;
const modelKey = (name) => name.replace(STORAGE_OR_NOISE, ' ').replace(/\s+/g, ' ').trim();

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const tradeInModels = (await client.query(
    `select brand, model_name, base_price from trade_in_models where category = 'phone'`,
  )).rows;
  const products = (await client.query(
    `select p.name, p.price::float8 as price, p.category, b.name as brand
       from products p left join brands b on b.id = p.brand
      where p.category = any($1) and p.is_published`,
    [[...cap.SHOP_PRICE_CAP_CATEGORIES]],
  )).rows;
  await client.query('ROLLBACK');

  // 1. Calibrage
  const ratios = [];
  for (const m of tradeInModels) {
    const lowest = cap.findLowestShopPrice(m.brand, m.model_name, products);
    if (lowest) ratios.push(Number(m.base_price) / lowest);
  }
  const med = median(ratios);
  console.log('── Calibrage prix boutique → base_price ──');
  console.log(`  modèles présents des deux côtés : ${ratios.length}`);
  if (med !== null) {
    console.log(`  ratio médian : ${med.toFixed(2)} (min ${Math.min(...ratios).toFixed(2)}, max ${Math.max(...ratios).toFixed(2)})`);
  }
  console.log(`  ratio appliqué (SHOP_TO_TRADE_IN_BASE_RATIO) : ${base.SHOP_TO_TRADE_IN_BASE_RATIO}\n`);

  // 2. Produits boutique sans entrée de reprise
  const isCovered = (p) =>
    tradeInModels.some((m) => cap.isSameShopModel(p.name, cap.shopModelTokens(m.brand, m.model_name)));
  const groups = new Map();
  for (const p of products) {
    if (isCovered(p)) continue;
    const key = modelKey(p.name);
    const g = groups.get(key) ?? { brand: p.brand ?? '?', lowest: Infinity, count: 0 };
    g.lowest = Math.min(g.lowest, Number(p.price));
    g.count += 1;
    groups.set(key, g);
  }
  const uncovered = [...groups.entries()].sort((a, b) => a[1].brand.localeCompare(b[1].brand) || a[0].localeCompare(b[0]));
  console.log(`── Produits boutique sans entrée de reprise : ${uncovered.reduce((n, [, g]) => n + g.count, 0)} / ${products.length} (${uncovered.length} modèles) ──`);
  console.log('  marque | modèle (indicatif) | prix boutique min | base_price utilisé');
  for (const [key, g] of uncovered) {
    console.log(`  ${g.brand} | ${key} | ${g.lowest} | ${base.shopPriceToBasePrice(g.lowest) ?? '-'}`);
  }
} catch (error) {
  console.error('✗ Lecture impossible', error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

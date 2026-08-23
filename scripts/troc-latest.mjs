/**
 * Affiche les derniers dossiers trade_in_requests (READ-ONLY) pour vérifier la
 * liaison Smart Troc : client + appareil de départ + crédit + voucher + appareil
 * CIBLE + échéance, tous sur le MÊME enregistrement (tranche 2).
 *
 * N'exécute qu'un SELECT. Aucune écriture.
 *
 * Usage :
 *   node scripts/troc-latest.mjs [N]        (défaut 5, max 50)
 *   npm run db:troc:latest -- 10
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveDatabaseUrl } from './lib/supabaseDbUrl.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
dotenv.config({ path: resolve(root, '.env') });

const argN = parseInt(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '', 10);
const limit = Math.min(50, Math.max(1, Number.isFinite(argN) ? argN : 5));

const databaseUrl = resolveDatabaseUrl(root);
if (!databaseUrl) {
  console.error('✗ Accès DB introuvable. Renseigne DATABASE_URL ou SUPABASE_DB_PASSWORD dans .env.');
  process.exit(1);
}

let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('✗ Module `pg` manquant : npm install pg --save-dev');
  process.exit(1);
}

const fcfa = (n) => (n == null ? '—' : `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`);
const dt = (v) => (v ? new Date(v).toLocaleString('fr-FR') : '—');

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const { rows } = await client.query(
    `select id, created_at, status, customer_name, customer_phone,
            device_brand, device_model, trade_in_value, trade_in_grade,
            voucher_reference, voucher_expires_at,
            target_product_id, target_product_name
       from public.trade_in_requests
      order by created_at desc
      limit $1`,
    [limit],
  );

  if (!rows.length) {
    console.log('Aucun dossier trade_in_requests.');
    process.exit(0);
  }

  console.log(`${rows.length} dernier(s) dossier(s) trade_in_requests :\n`);
  rows.forEach((r, i) => {
    const linked = r.target_product_id
      ? `${r.target_product_name ?? '(nom manquant)'}  [${r.target_product_id}]`
      : '— (bon générique, aucun appareil cible)';
    console.log(`#${i + 1}  ${r.id}   [${r.status}]   ${dt(r.created_at)}`);
    console.log(`    Client   : ${r.customer_name ?? '—'}   ${r.customer_phone ?? ''}`);
    console.log(`    Départ   : ${r.device_brand ?? '—'} ${r.device_model ?? ''}   · crédit ${fcfa(r.trade_in_value)}   (${r.trade_in_grade ?? '—'})`);
    console.log(`    Voucher  : ${r.voucher_reference ?? '—'}   · expire ${dt(r.voucher_expires_at)}`);
    console.log(`    Cible    : ${linked}`);
    console.log('');
  });

  const withTarget = rows.filter((r) => r.target_product_id).length;
  console.log(`→ ${withTarget}/${rows.length} avec appareil cible lié · ${rows.length - withTarget} bon(s) générique(s).`);
} catch (err) {
  console.error('✗ Lecture trade_in_requests :', err.message);
  process.exit(1);
} finally {
  await client.end();
}

/**
 * Génère la migration SQL pour le catalogue Mfoundi Mall.
 * Usage: node scripts/generate-mfoundi-import.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dir, '../data/mfoundi-mall-catalog.json'), 'utf8'),
);

const BRAND_SLUG_MAP = {
  Google: 'google-pixel',
  Apple: 'apple',
  Samsung: 'samsung',
  Xiaomi: 'xiaomi',
  Infinix: 'infinix',
  Tecno: 'tecno',
};

const BRAND_NAME_MAP = {
  Google: 'Google Pixel',
};

const CAT_MAP = {
  smartphone: 'phones',
  smartwatch: 'accessories',
  earbuds: 'accessories',
};

const DEFAULT_IMAGE = '/icons/icon-192x192.png';

function slugify(text) {
  return text
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

function packagingLabel(p) {
  if (p === 'scelle') return 'Scellé';
  if (p === 'non_scelle') return 'Non scellé';
  return null;
}

function buildProductName(row) {
  const [, brand, model, storage, ram] = row;
  const parts = [brand, model];
  if (storage) parts.push(`${storage} Go`);
  if (ram) parts.push(`${ram} GB RAM`);
  // Conditionnement, SIM et origine → specs + puces UI (pas dans le nom)
  return parts.join(' ');
}

function buildSpecs(row) {
  const [, , , storage, ram, packaging, sim, origin, , warranty, accessories, source, notes] = row;
  const specs = [];
  if (storage) specs.push({ label: 'Stockage', value: `${storage} Go` });
  if (ram) specs.push({ label: 'RAM', value: `${ram} GB` });
  const pkg = packagingLabel(packaging);
  if (pkg) specs.push({ label: 'Conditionnement', value: pkg });
  if (sim) specs.push({ label: 'SIM', value: sim });
  if (origin) specs.push({ label: 'Origine', value: origin });
  if (source) specs.push({ label: 'Source', value: source });
  if (notes) specs.push({ label: 'Notes', value: notes });
  if (accessories) specs.push({ label: 'Accessoires', value: 'Oui' });
  return specs;
}

function conditionFromRow(row) {
  const packaging = row[5];
  if (packaging === 'scelle') return 'new';
  if (packaging === 'non_scelle') return 'refurbished';
  // iPhones US/Canada sans packaging → reconditionné
  if (row[0] === 'smartphone' && row[1] === 'Apple') return 'refurbished';
  return 'new';
}

const brandsNeeded = new Map();
const rangesNeeded = new Map();
const products = [];

for (const row of catalog.rows) {
  const [cat, brandName, model] = row;
  const brandSlug = BRAND_SLUG_MAP[brandName] || slugify(brandName);
  const displayBrand = BRAND_NAME_MAP[brandName] || brandName;
  const category = CAT_MAP[cat] || 'phones';
  const rangeSlug = slugify(model);
  const rangeKey = `${brandSlug}::${rangeSlug}`;

  brandsNeeded.set(brandSlug, displayBrand);
  rangesNeeded.set(rangeKey, { brandSlug, rangeSlug, model, category });

  products.push({
    name: buildProductName(row),
    brandSlug,
    rangeSlug,
    category,
    price: row[8],
    warrantyMonths: row[9] ?? 0,
    condition: conditionFromRow(row),
    specs: buildSpecs(row),
    source: row[11],
  });
}

let sql = `-- Catalogue Mfoundi Mall — import ${new Date().toISOString().slice(0, 10)}
-- Source: ${catalog.location} | ${catalog.rows.length} lignes

`;

sql += `-- === MARQUES ===\n`;
for (const [slug, name] of brandsNeeded) {
  sql += `INSERT INTO brands (name, slug)
SELECT '${sqlEscape(name)}', '${slug}'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = '${slug}' OR lower(name) = lower('${sqlEscape(name)}'));
\n`;
}

sql += `-- === GAMMES ===\n`;
for (const { brandSlug, rangeSlug, model, category } of rangesNeeded.values()) {
  sql += `INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT '${sqlEscape(model)}', '${rangeSlug}', b.id, '${category}'
FROM brands b
WHERE b.slug = '${brandSlug}'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = '${rangeSlug}'
  );
\n`;
}

sql += `-- === PRODUITS (upsert par nom + marque + gamme) ===\n`;

for (const p of products) {
  const specsJson = JSON.stringify(p.specs).replace(/'/g, "''");
  const desc = '';

  sql += `INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  '${sqlEscape(p.name)}',
  '${desc}',
  ${p.price},
  '${p.category}',
  b.id,
  pr.id,
  '${p.condition}',
  '${DEFAULT_IMAGE}',
  0,
  5,
  '${specsJson}'::jsonb,
  ${p.warrantyMonths},
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = '${p.rangeSlug}'
WHERE b.slug = '${p.brandSlug}'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('${sqlEscape(p.name)}'))
  );

UPDATE products p
SET price = ${p.price},
    condition = '${p.condition}',
    warranty_months = ${p.warrantyMonths},
    specs = '${specsJson}'::jsonb
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = '${p.rangeSlug}'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('${sqlEscape(p.name)}'));

`;
}

const outPath = join(__dir, '../supabase/migrations/20260614_007_mfoundi_mall_catalog.sql');
writeFileSync(outPath, sql, 'utf8');

const report = {
  brands: brandsNeeded.size,
  ranges: rangesNeeded.size,
  products: products.length,
  brandsList: [...brandsNeeded.entries()].map(([slug, name]) => ({ slug, name })),
  rangesList: [...rangesNeeded.values()].map((r) => `${r.brandSlug}/${r.rangeSlug}`),
};

writeFileSync(
  join(__dir, '../data/mfoundi-import-report.json'),
  JSON.stringify(report, null, 2),
  'utf8',
);

console.log(`Migration écrite: ${outPath}`);
console.log(`Marques: ${report.brands}, Gammes: ${report.ranges}, Produits: ${report.products}`);
console.log('→ Enrichissement auto: npm run ingest:products  (ou Admin > Import produits)');

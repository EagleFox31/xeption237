/**
 * Remplit la table phone_releases depuis Wikidata (open, gratuit, sans auth).
 * Le seed SQL couvre déjà le catalogue + vieux modèles courants ; ce script étend le long tail.
 *
 * Pré-requis .env :
 *   VITE_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (écriture : RLS n'autorise que le SELECT anon)
 *
 * Usage :
 *   node scripts/import-phone-releases.mjs            # applique
 *   node scripts/import-phone-releases.mjs --dry-run  # affiche sans écrire
 *
 * Best-effort : la modélisation Wikidata des téléphones est inégale. On récupère ce qu'on peut,
 * on normalise la clé comme buildModelKey, et on upsert sans écraser le seed (source='wikidata').
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env') });

const DRY = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Même normalisation que utils/modelKey.ts / _shared/marketKey.ts
const normalizeModelKey = (brand, model) => {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const b = norm(brand);
  const m = norm(model);
  if (!b && !m) return '';
  if (!b) return m;
  if (!m) return b;
  return `${b}_${m}`;
};

// Modèles de smartphone (Q22645) avec date de publication (P577) et fabricant (P176).
const SPARQL = `
SELECT ?itemLabel ?brandLabel ?date WHERE {
  ?item wdt:P31/wdt:P279* wd:Q22645 .
  ?item wdt:P577 ?date .
  OPTIONAL { ?item wdt:P176 ?brand . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
}
`;

const fetchWikidata = async () => {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(SPARQL);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'XeptionTroc/1.0 (release-year import)', Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const json = await res.json();
  return json?.results?.bindings ?? [];
};

const upsertRows = async (rows) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/phone_releases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'resolution=ignore-duplicates', // ne pas écraser le seed curé
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase upsert HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

const main = async () => {
  if (!SUPABASE_URL || (!DRY && !SERVICE_KEY)) {
    console.error('❌ VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env (sauf --dry-run).');
    process.exit(1);
  }

  console.log('Requête Wikidata…');
  const bindings = await fetchWikidata();
  console.log('Lignes brutes Wikidata :', bindings.length);

  const byKey = new Map();
  for (const b of bindings) {
    const label = b.itemLabel?.value ?? '';
    const brand = b.brandLabel?.value ?? '';
    const year = Number(String(b.date?.value ?? '').slice(0, 4));
    if (!label || !Number.isFinite(year) || year < 1995 || year > 2100) continue;
    const key = normalizeModelKey(brand, label);
    if (!key) continue;
    // garde la date la plus ANCIENNE (la sortie initiale, pas une réédition)
    const prev = byKey.get(key);
    if (!prev || year < prev.release_year) {
      byKey.set(key, { model_key: key, release_year: year, source: 'wikidata' });
    }
  }

  const rows = [...byKey.values()];
  console.log('Modèles normalisés uniques :', rows.length);
  console.log('Échantillon :', rows.slice(0, 8));

  if (DRY) {
    console.log('\n(dry-run — rien écrit)');
    return;
  }

  // Upsert par lots de 500
  for (let i = 0; i < rows.length; i += 500) {
    await upsertRows(rows.slice(i, i + 500));
    console.log(`  upsert ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
  console.log('✅ Import terminé.');
};

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

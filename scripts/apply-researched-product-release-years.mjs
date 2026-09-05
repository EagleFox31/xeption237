/**
 * Applique les années de sortie recherchées en ligne au catalogue `products`.
 *
 * Les règles sont explicites et ordonnées du modèle le plus précis au plus large.
 * Les variantes stockage / état / région héritent de l'année du modèle de base.
 *
 * Usage :
 *   node scripts/apply-researched-product-release-years.mjs            # dry-run
 *   node scripts/apply-researched-product-release-years.mjs --apply    # écrit en prod
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('VITE_SUPABASE_URL / clé Supabase manquante');
}

const source = {
  apple: 'https://support.apple.com/en-us/108044',
  apple17:
    'https://www.apple.com/newsroom/2025/09/get-ready-to-discover-the-next-generation-of-iphone-apple-watch-and-airpods/',
  google:
    'https://support.google.com/product-documentation/answer/14773700',
  google10:
    'https://blog.google/products-and-platforms/devices/pixel/google-pixel-10-pro-xl/',
  samsung: 'https://www.samsung.com/us/smartphones/',
  samsungA2025:
    'https://news.samsung.com/sg/enjoy-essential-and-secure-ai-powered-features-with-samsung-galaxy-a17-and-galaxy-a07',
  xiaomi: 'https://www.gsmarena.com/xiaomi-phones-80.php',
  infinix: 'https://www.gsmarena.com/infinix-phones-119.php',
  tecno: 'https://www.gsmarena.com/tecno-phones-120.php',
  oppo: 'https://www.gsmarena.com/oppo_a31-10083.php',
  itel: 'https://www.gsmarena.com/itel_a100c-14212.php',
};

const rule = (model, year, pattern, url) => ({ model, year, pattern, source: url });

// IMPORTANT : règles spécifiques avant les règles génériques.
const RULES = [
  // Apple
  rule('Apple iPhone 17 Pro Max', 2025, /\biphone 17 pro max\b/i, source.apple17),
  rule('Apple iPhone 17', 2025, /\biphone 17\b/i, source.apple17),
  rule('Apple iPhone Air', 2025, /\biphone air\b/i, source.apple17),
  rule('Apple iPhone 16 Pro Max', 2024, /\biphone 16 pro max\b/i, source.apple),
  rule('Apple iPhone 16 Plus', 2024, /\biphone 16 plus\b/i, source.apple),
  rule('Apple iPhone 15 Pro Max', 2023, /\biphone 15 pro max\b/i, source.apple),
  rule('Apple iPhone 14 Pro Max', 2022, /\biphone 14 pro max\b/i, source.apple),
  rule('Apple iPhone 14 Pro', 2022, /\biphone 14 pro\b/i, source.apple),
  rule('Apple iPhone 14', 2022, /\biphone 14\b/i, source.apple),
  rule('Apple iPhone 13 Pro Max', 2021, /\biphone 13 pro max\b/i, source.apple),
  rule('Apple iPhone 13 Pro', 2021, /\biphone 13 pro\b/i, source.apple),
  rule('Apple iPhone 13', 2021, /\biphone 13\b/i, source.apple),
  rule('Apple iPhone 12 Pro Max', 2020, /\biphone 12\s*pro max\b/i, source.apple),
  rule('Apple iPhone 12 Pro', 2020, /\biphone 12\s*pro\b/i, source.apple),
  rule('Apple iPhone 12', 2020, /\biphone 12\b/i, source.apple),
  rule('Apple iPhone 11 Pro Max', 2019, /\biphone 11 pro max\b/i, source.apple),
  rule('Apple iPhone 11 Pro', 2019, /\biphone 11 pro\b/i, source.apple),
  rule('Apple iPhone 11', 2019, /\biphone 11\b/i, source.apple),
  rule('Apple iPhone XR', 2018, /\biphone xr\b/i, source.apple),

  // Google Pixel
  rule('Google Pixel 10 Pro Fold', 2025, /\bpixel 10 pro fold\b/i, 'https://blog.google/products-and-platforms/devices/pixel/google-pixel-10-pro-fold/'),
  rule('Google Pixel 10 Pro', 2025, /\bpixel 10 pro\b/i, source.google10),
  rule('Google Pixel 9 Pro XL', 2024, /\bpixel 9 pro xl\b/i, source.google),
  rule('Google Pixel 9 Pro', 2024, /\bpixel 9 pro\b/i, source.google),
  rule('Google Pixel 9a', 2025, /\bpixel 9a\b/i, source.google),
  rule('Google Pixel 9', 2024, /\bpixel 9\b/i, source.google),
  rule('Google Pixel 8 Pro', 2023, /\bpixel 8 pro\b/i, source.google),
  rule('Google Pixel 8a', 2024, /\bpixel 8a\b/i, source.google),
  rule('Google Pixel 8', 2023, /\bpixel 8\b/i, source.google),
  rule('Google Pixel 7 Pro', 2022, /\bpixel 7 pro\b/i, source.google),
  rule('Google Pixel 7a', 2023, /\bpixel 7a\b/i, source.google),
  rule('Google Pixel 7', 2022, /\bpixel 7\b/i, source.google),
  rule('Google Pixel 6 Pro', 2021, /\bpixel 6 pro\b/i, source.google),
  rule('Google Pixel 6a', 2022, /\bpixel 6a\b/i, source.google),

  // Samsung Galaxy Z
  rule('Samsung Galaxy Z Fold7', 2025, /\b(?:galaxy )?z fold\s*7\b/i, source.samsung),
  rule('Samsung Galaxy Z Fold4', 2022, /\b(?:galaxy )?z fold\s*4\b/i, source.samsung),
  rule('Samsung Galaxy Z Flip6', 2024, /\b(?:galaxy )?z flip\s*6\b/i, source.samsung),
  rule('Samsung Galaxy Z Flip5', 2023, /\b(?:galaxy )?z flip\s*5\b/i, source.samsung),
  rule('Samsung Galaxy Z Flip4', 2022, /\b(?:galaxy )?z flip\s*4\b/i, source.samsung),

  // Samsung Galaxy S / Note
  rule('Samsung Galaxy S26 Ultra', 2026, /\b(?:galaxy )?s\s*26 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S25 Edge', 2025, /\b(?:galaxy )?s\s*25 edge\b/i, source.samsung),
  rule('Samsung Galaxy S25 Ultra', 2025, /\b(?:galaxy )?s\s*25 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S24 Ultra', 2024, /\b(?:galaxy )?s\s*24 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S24+', 2024, /\b(?:galaxy )?s\s*24\+/i, source.samsung),
  rule('Samsung Galaxy S23 FE', 2023, /\b(?:galaxy )?s\s*23 fe\b/i, source.samsung),
  rule('Samsung Galaxy S23 Ultra', 2023, /\b(?:galaxy )?s\s*23 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S23+', 2023, /\b(?:galaxy )?s\s*23\+/i, source.samsung),
  rule('Samsung Galaxy S23', 2023, /\b(?:galaxy )?s\s*23\b/i, source.samsung),
  rule('Samsung Galaxy S22 Ultra', 2022, /\b(?:galaxy )?s\s*22 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S22+', 2022, /\b(?:galaxy )?s\s*22\+/i, source.samsung),
  rule('Samsung Galaxy S22', 2022, /\b(?:galaxy )?s\s*22\b/i, source.samsung),
  rule('Samsung Galaxy S21 Ultra', 2021, /\b(?:galaxy )?s\s*21 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S21+', 2021, /\b(?:galaxy )?s\s*21\+/i, source.samsung),
  rule('Samsung Galaxy S21', 2021, /\b(?:galaxy )?s\s*21\b/i, source.samsung),
  rule('Samsung Galaxy S20 Ultra', 2020, /\b(?:galaxy )?s\s*20 ultra\b/i, source.samsung),
  rule('Samsung Galaxy S10 5G', 2019, /\b(?:galaxy )?s\s*10 5g\b/i, source.samsung),
  rule('Samsung Galaxy Note20', 2020, /\b(?:galaxy )?note\s*20\b/i, source.samsung),
  rule('Samsung Galaxy Note10+', 2019, /\b(?:galaxy )?note\s*10\+/i, source.samsung),

  // Samsung Galaxy A / M
  rule('Samsung Galaxy A07', 2025, /\bgalaxy a0?7\b/i, source.samsungA2025),
  rule('Samsung Galaxy A12', 2020, /\bgalaxy a12\b/i, source.samsung),
  rule('Samsung Galaxy A16', 2024, /\bgalaxy a16\b/i, source.samsung),
  rule('Samsung Galaxy A17', 2025, /\bgalaxy a17\b/i, source.samsungA2025),
  rule('Samsung Galaxy A23', 2022, /\bgalaxy a23\b/i, source.samsung),
  rule('Samsung Galaxy A24', 2023, /\bgalaxy a24\b/i, source.samsung),
  rule('Samsung Galaxy A25', 2023, /\bgalaxy a25\b/i, source.samsung),
  rule('Samsung Galaxy A26', 2025, /\bgalaxy a26\b/i, source.samsung),
  rule('Samsung Galaxy A32', 2021, /\bgalaxy a32\b/i, source.samsung),
  rule('Samsung Galaxy A33', 2022, /\bgalaxy a33\b/i, source.samsung),
  rule('Samsung Galaxy A36', 2025, /\bgalaxy a36\b/i, source.samsung),
  rule('Samsung Galaxy A53', 2022, /\bgalaxy a53\b/i, source.samsung),
  rule('Samsung Galaxy A54', 2023, /\bgalaxy a54\b/i, source.samsung),
  rule('Samsung Galaxy A55', 2024, /\bgalaxy a55\b/i, source.samsung),
  rule('Samsung Galaxy A56', 2025, /\bgalaxy a56\b/i, source.samsung),
  rule('Samsung Galaxy A82', 2021, /\bgalaxy a82\b/i, 'https://www.gsmarena.com/samsung_galaxy_quantum2_is_official_in_korea_with_qrng_chip_and_5g-news-48624.php'),
  rule('Samsung Galaxy M33', 2022, /\bgalaxy m33\b/i, source.samsung),
  rule('Samsung Galaxy M44', 2023, /\bgalaxy m44\b/i, source.samsung),
  rule('Samsung Galaxy M53', 2022, /\bgalaxy m53\b/i, source.samsung),

  // itel (une ligne a une marque Samsung erronée en BD)
  rule('itel A100C', 2025, /\bitel a100c\b/i, source.itel),

  // Xiaomi / Redmi / Poco
  rule('Xiaomi 17 Pro Max', 2025, /\bxiaomi 17 pro max\b/i, 'https://www.mi.com/prod/xiaomi-17-pro-max'),
  rule('Xiaomi 15T Pro', 2025, /\b(?:xiaomi )?(?:mi )?15t pro\b/i, source.xiaomi),
  rule('Xiaomi 11 Lite NE 5G', 2021, /\bxiaomi 11 lite ne 5g\b/i, source.xiaomi),
  rule('Poco X7 Pro', 2025, /\bpoco x7 pro\b/i, source.xiaomi),
  rule('Redmi Note 15 4G', 2026, /\bredmi note 15\b/i, 'https://www.gsmarena.com/xiaomi_redmi_note_15-14323.php'),
  rule('Redmi Note 14 Pro+', 2024, /\bredmi note 14 pro\+/i, source.xiaomi),
  rule('Redmi Note 14', 2024, /\bredmi note 14\b/i, source.xiaomi),
  rule('Redmi Note 13 5G', 2023, /\bredmi note 13 5g\b/i, source.xiaomi),
  rule('Redmi Note 9 Pro', 2020, /\bredmi note 9 pro\b/i, source.xiaomi),
  // Le titre BD est erroné ("Note 8 A"), mais les specs Snapdragon 439 / 5000 mAh
  // et la description identifient sans ambiguïté le Redmi 8A.
  rule('Redmi 8A', 2019, /\bredmi note 8 a\b/i, 'https://www.gsmarena.com/xiaomi_redmi_8a-9897.php'),
  rule('Redmi Note 8', 2019, /\bredmi note 8\b(?!\s*a)/i, source.xiaomi),
  rule('Redmi 15C', 2025, /\bredmi 15c\b/i, 'https://en.wikipedia.org/wiki/Redmi_15C'),
  rule('Redmi 15', 2025, /\bredmi 15\b/i, 'https://en.wikipedia.org/wiki/Redmi_15'),
  rule('Redmi 14C', 2024, /\bredmi 14c\b/i, source.xiaomi),
  rule('Redmi 13', 2024, /\bredmi 13\b/i, source.xiaomi),
  rule('Redmi 9 Activ', 2021, /\bredmi 9 activ\b/i, source.xiaomi),
  rule('Redmi A5', 2025, /\bredmi a5\b/i, source.xiaomi),
  rule('Redmi A3 Pro', 2024, /\bredmi a3 pro\b/i, source.xiaomi),

  // Infinix
  rule('Infinix Hot 50 Pro+', 2024, /\binfinix hot 50 pro\+/i, source.infinix),
  rule('Infinix Hot 60 Pro', 2025, /\binfinix hot 60 pro\b/i, 'https://www.gsmarena.com/infinix_hot_60_pro-14003.php'),
  rule('Infinix Hot 60i', 2025, /\binfinix hot 60i\b/i, 'https://www.gsmarena.com/infinix_hot_60i-13983.php'),
  rule('Infinix Note Edge', 2026, /\binfinix note edge\b/i, 'https://www.gsmarena.com/infinix_note_edge_5g-14421.php'),
  rule('Infinix Smart 10 HD', 2025, /\binfinix smart 10 hd\b/i, source.infinix),
  rule('Infinix Smart 10', 2025, /\binfinix smart 10\b/i, source.infinix),
  rule('Infinix Smart 20', 2026, /\binfinix smart 20\b/i, 'https://www.gsmarena.com/infinix_smart_20-14502.php'),

  // Tecno
  rule('Tecno Camon 50 Pro', 2026, /\btecno camon 50 pro\b/i, 'https://www.prnewswire.com/news-releases/tecno-camon-50-series-redefining-professional-imaging-through-the-power-of-practical-ai-302702823.html'),
  rule('Tecno Camon 50', 2026, /\btecno camon 50\b/i, 'https://www.prnewswire.com/news-releases/tecno-camon-50-series-redefining-professional-imaging-through-the-power-of-practical-ai-302702823.html'),
  rule('Tecno Pop 10', 2025, /\btecno pop 10\b/i, source.tecno),
  rule('Tecno Pop 20', 2026, /\btecno pop 20\b/i, 'https://www.thetechoutlook.com/tech-whispers/techo-spark-50-50cs-google-play-console-listing-reveals-it-to-be-a-reranded-version-of-tecno-pop-20-aka-tecno-spark-go-3-aka-tecno-pop-x/'),
  rule('Tecno Pop 3', 2020, /\btecno pop 3\b/i, 'https://mobility.com.ng/tecno-pop3-goes-on-sale/'),
  rule('Tecno Spark 40', 2025, /\btecno spark 40\b/i, 'https://www.tecno-mobile.com/phones/tech-specs/techspecs/spark-40/'),
  rule('Tecno Spark 50', 2026, /\btecno spark 50\b/i, 'https://www.gsmarena.com/tecno_spark_50_5g-14566.php'),

  // Oppo
  rule('Oppo A31 (2020)', 2020, /\boppo a31\b/i, source.oppo),
];

const normalize = (value) =>
  String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { data: products, error } = await supabase
  .from('products')
  .select('id,name,release_year')
  .eq('category', 'phones')
  .order('name');

if (error) throw error;

const matched = [];
const unmatched = [];

for (const product of products || []) {
  const name = normalize(product.name);
  const matches = RULES.filter((candidate) => candidate.pattern.test(name));
  if (matches.length === 0) {
    unmatched.push({ id: product.id, name, reason: 'aucune règle confirmée' });
    continue;
  }

  const selected = matches[0];
  matched.push({
    id: product.id,
    name,
    previous_release_year: product.release_year,
    release_year: selected.year,
    canonical_model: selected.model,
    source: selected.source,
  });
}

console.log(`Produits phones : ${products?.length || 0}`);
console.log(`Confirmés        : ${matched.length}`);
console.log(`Non confirmés    : ${unmatched.length}`);

if (unmatched.length > 0) {
  console.log('\nNon confirmés (laissés NULL) :');
  for (const row of unmatched) console.log(`- ${row.name}`);
}

if (APPLY) {
  let updated = 0;
  for (const row of matched) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ release_year: row.release_year })
      .eq('id', row.id);
    if (updateError) throw updateError;
    updated += 1;
  }
  console.log(`\n✓ ${updated} produits mis à jour.`);
} else {
  console.log('\nDry-run uniquement. Ajoute --apply pour écrire.');
}

console.log('\nAudit JSON :');
console.log(JSON.stringify({ matched, unmatched }, null, 2));

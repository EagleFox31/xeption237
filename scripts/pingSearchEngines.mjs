/**
 * Notifie les moteurs de recherche après un build via IndexNow.
 * IndexNow couvre Bing, Yandex, Seznam, Naver, DuckDuckGo en un seul appel.
 *
 * Note : Google a déprécié son endpoint /ping?sitemap= en juin 2023, et Bing
 * a fait pareil début 2024. Le bon canal moderne est :
 *  - IndexNow pour la fraîcheur (Microsoft, Yandex, etc.)
 *  - robots.txt qui référence sitemap.xml + Search Console pour Google
 *
 * Lancé automatiquement par `npm run build` après prerender.
 * Ne fait pas échouer le build en cas d'erreur réseau.
 *
 * Pour activer IndexNow : créer un fichier
 *     public/<INDEXNOW_KEY>.txt  contenant <INDEXNOW_KEY>
 * et exporter INDEXNOW_KEY=<key> dans .env.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://www.xeptionetwork.shop';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

const log = (msg) => console.log(`[ping-search] ${msg}`);
const warn = (msg) => console.warn(`[ping-search] ${msg}`);

const safeFetch = async (label, url, init) => {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      warn(`${label} → HTTP ${res.status}`);
      return false;
    }
    log(`${label} ✓`);
    return true;
  } catch (err) {
    warn(`${label} → ${err?.message || err}`);
    return false;
  }
};

const extractUrlsFromSitemap = () => {
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return [];
  const xml = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, '').trim()).filter(Boolean);
};

const pingIndexNow = async () => {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    log('IndexNow key not set (INDEXNOW_KEY env) — skipped');
    return;
  }
  const urlList = extractUrlsFromSitemap();
  if (urlList.length === 0) {
    warn('IndexNow → sitemap empty, nothing to push');
    return;
  }

  // Cap à 10 000 URLs par batch (limite IndexNow)
  const batch = urlList.slice(0, 10_000);

  return safeFetch('IndexNow batch', 'https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList: batch,
    }),
  });
};

const main = async () => {
  log(`Notifying search engines for ${SITE_URL}…`);
  await pingIndexNow();
  log('Google : pas de ping (endpoint déprécié) — référencé via robots.txt + Search Console');
  log('done');
};

main().catch((err) => {
  warn(`fatal: ${err?.message || err}`);
  process.exit(0); // ne fait jamais échouer le build
});

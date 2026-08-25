/**
 * Rendu des sources de prix qui n'existent qu'après exécution du JavaScript.
 *
 * Pourquoi un script Node et pas une Edge Function : Deno ne rend pas une page.
 * Mesuré le 2026-08-25 — Glotelho renvoie 409 Ko de HTML pour **un seul** prix,
 * et son `window.__NUXT__` ne fait que 2 Ko, sans aucun produit. Les fiches
 * n'apparaissent qu'après hydratation. CoinAfrique est dans le même cas.
 *
 * Ce que le navigateur apporte, au-delà du rendu : un **vrai DOM**. On part de
 * l'élément qui porte le prix et on remonte jusqu'à l'ancêtre qui porte aussi un
 * titre. L'association prix ↔ produit devient structurelle, là où une regex sur
 * du texte aplati attrapait le produit voisin (défaut constaté sur le scraper).
 *
 * Usage :
 *   npm run market:render                     -- tous les modèles de trade_in_models
 *   npm run market:render -- --query="iPhone 13"
 *   npm run market:render -- --dry-run        -- n'écrit rien en base
 *
 * L'automatisation dépend de l'activation du workflow CI ; sans elle, ce script
 * reste un geste manuel périodique. Dit ici pour ne pas laisser croire à un
 * automatisme qui n'existe pas.
 */

import fs from 'node:fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env'), quiet: true });

const MIN_PRICE_XAF = 20_000;
const MAX_PRICE_XAF = 3_000_000;
const PAGE_TIMEOUT_MS = 45_000;
const SETTLE_MS = 3_500;

/** Sources qui n'existent qu'après rendu. Les boutiques Shopify n'ont rien à faire ici. */
const RENDERED_SOURCES = [
  {
    name: 'glotelho.cm/recherche',
    // `?s=...&post_type=product` etait une URL WORDPRESS, alors que Glotelho
    // tourne sous Nuxt. Elle n'a jamais rien pu rendre : c'est pourquoi cette
    // source ne remontait qu'un prix depuis le debut.
    url: (q) => `https://glotelho.cm/search?q=${encodeURIComponent(q)}&limit=24`,
  },
  {
    name: 'glotelho.cm/seconde-main',
    // Categorie « Glotelho Seconde Main » — donnee d'OCCASION locale, rare sur
    // ce marche. Ne depend pas de la requete : on la parcourt entierement.
    url: () => 'https://glotelho.cm/category/glotelho-seconde-main-1581',
  },
  // ── Ecartes apres mesure, a ne pas retenter a l'aveugle ────────────────
  //
  // ongolaphone.com  /catalogue?q=... rend l'ossature du site (en-tete, menu,
  //                  telephone de la boutique) mais AUCUN produit, meme apres
  //                  15 s d'attente. Rien a extraire.
  // yamba.cm         /products?search=... rend des prix, mais c'est une place
  //                  de marche generaliste : la seule offre captee sur
  //                  « iPhone 13 » etait un faux positif capte sur un menu.
  //
  // Les deux sont des SPA sans API publique (accueil de 3 a 4 Ko, aucun prix
  // cote serveur). Leurs routes reelles sont /catalogue?q= et /products?search=
  // — relevees dans le DOM rendu, pas devinees.
];

const args = process.argv.slice(2);
const argValue = (flag) => {
  const hit = args.find((a) => a.startsWith(`--${flag}=`));
  return hit ? hit.slice(flag.length + 3) : null;
};
const dryRun = args.includes('--dry-run');

const findChromeExecutable = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
};

/**
 * Extraction exécutée DANS la page.
 *
 * On remonte depuis le nœud qui porte le prix jusqu'au premier ancêtre qui
 * contient aussi un texte de titre plausible — c'est la fiche produit. Aucune
 * dépendance à un nom de classe : le scraper échouait précisément parce qu'il
 * cherchait `class="*product*"` alors que la boutique nomme ses fiches
 * autrement.
 */
const extractInPage = (minPrice, maxPrice) => {
  const PRICE_RE = /(\d{1,3}(?:[ .,\u00a0]\d{3}){1,3})\s*(?:FCFA|F\s*CFA|XAF)/i;

  const parsePrice = (raw) => Number(String(raw).replace(/[^\d]/g, ''));

  const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  // Deux mots minimum : « Categories », « Menu », « Panier » et consorts sont
  // des libelles de navigation qu'un titre de produit n'a jamais la forme.
  const looksLikeTitle = (text) =>
    text.length >= 8 &&
    text.length <= 140 &&
    text.trim().split(/\s+/).length >= 2 &&
    /[a-zA-Z]{3}/.test(text) &&
    !PRICE_RE.test(text);

  const results = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const match = PRICE_RE.exec(node.textContent ?? '');
    if (!match) continue;

    const price = parsePrice(match[1]);
    if (!Number.isFinite(price) || price < minPrice || price > maxPrice) continue;

    // Remontée : le premier ancêtre qui porte un titre distinct du prix.
    let el = node.parentElement;
    let title = '';
    for (let depth = 0; el && depth < 6; depth += 1, el = el.parentElement) {
      const heading = el.querySelector('h1,h2,h3,h4,a[title],img[alt]');
      const candidate =
        heading?.getAttribute?.('title') ||
        heading?.getAttribute?.('alt') ||
        textOf(heading);
      if (candidate && looksLikeTitle(candidate)) {
        title = candidate;
        break;
      }
    }
    if (!title) continue;

    const key = `${title}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const link = el?.querySelector?.('a[href]')?.getAttribute('href') ?? '';
    results.push({ price, title, href: link });
  }
  return results;
};

/**
 * Cle de modele derivee du titre.
 *
 * Les titres de categorie sont libres (« Iphone 13 seconde main - 6.1'' - ... »),
 * il n'y a pas de champ marque/modele a la source. On normalise donc les
 * premiers mots significatifs, en retirant le bruit commercial recurrent.
 */
// Les delimiteurs de mot sont indispensables : sans eux « de » serait retire
// a l interieur de « Delta », et « ram » a l interieur de « Bramble ».
const NOISE = /\b(seconde|main|occasion|reconditionne|reconditionnee|neuf|go|gb|ram|rom)\b/gi;

const modelKeyFromTitle = (title) => {
  const clean = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `cm|${clean.split(' ').slice(0, 4).join(' ')}`.slice(0, 120);
};

/** Ecriture directe, pour l'usage local ou seule DATABASE_URL est disponible. */
const persistViaPostgres = async (dbUrl, offers) => {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const capturedAt = new Date().toISOString();
  let written = 0;

  try {
    for (const o of offers) {
      const res = await client.query(
        `INSERT INTO public.market_used_offers
           (model_key, country_code, source, source_url, title, price_xaf, compare_price_xaf, captured_at)
         VALUES ($1,'CM',$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [
          modelKeyFromTitle(o.title),
          o.source,
          o.href || null,
          o.title,
          o.price,
          o.comparePrice ?? null,
          capturedAt,
        ],
      );
      written += res.rowCount ?? 0;
    }
  } finally {
    await client.end();
  }
  return written;
};

const persistOffers = async (offers) => {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (!url || !key) {
    if (!dbUrl) {
      console.warn('[render] ni SUPABASE_SERVICE_ROLE_KEY ni DATABASE_URL : rien ecrit.');
      return 0;
    }
    // En CI on aura la cle service ; en local, DATABASE_URL suffit et evite
    // d'exiger un secret de plus pour un outil de developpement.
    return persistViaPostgres(dbUrl, offers);
  }

  const capturedAt = new Date().toISOString();
  const rows = offers.map((o) => ({
    model_key: modelKeyFromTitle(o.title),
    country_code: 'CM',
    source: o.source,
    source_url: o.href || null,
    title: o.title,
    price_xaf: o.price,
    // Le prix barre est conserve a titre indicatif seulement : glotelho annonce
    // 775 000 pour un iPhone 13 que kmerphone vend NEUF a 245 000. C'est du
    // marketing, pas du marche — jamais utilise comme plafond.
    compare_price_xaf: o.comparePrice ?? null,
    captured_at: capturedAt,
  }));

  const res = await fetch(`${url}/rest/v1/market_used_offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    console.error(`[render] ecriture refusee : HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
    return 0;
  }
  return rows.length;
};

const renderSource = async (browser, source, query) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });
    await page.goto(source.url(query), { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT_MS });
    // L'hydratation Nuxt peut peindre les prix après `networkidle2`.
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    const raw = await page.evaluate(extractInPage, MIN_PRICE_XAF, MAX_PRICE_XAF);
    // Les fiches affichent souvent DEUX montants : le prix de vente et le prix
    // barre. Ils sortent ici comme deux offres du meme titre. Le plus bas est
    // le prix reel, le plus haut la reference neuf — c'est le plafond du point 1.
    const parTitre = new Map();
    for (const o of raw) {
      const prev = parTitre.get(o.title);
      if (!prev) { parTitre.set(o.title, { ...o, comparePrice: null }); continue; }
      const bas = Math.min(prev.price, o.price);
      const haut = Math.max(prev.price, o.price);
      parTitre.set(o.title, { ...prev, price: bas, comparePrice: haut > bas ? haut : null });
    }

    return [...parTitre.values()].map((o) => ({ ...o, source: source.name }));
  } catch (error) {
    console.warn(`[render] ${source.name} : ${error?.message ?? error}`);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
};

const main = async () => {
  const query = argValue('query') ?? 'iPhone 13';

  let executablePath = findChromeExecutable();
  if (!executablePath) {
    try {
      executablePath = await chromium.executablePath();
    } catch {
      /* pas de Chromium embarqué disponible */
    }
  }
  if (!executablePath) {
    console.error('[render] Chrome/Edge introuvable. Définis CHROME_PATH ou installe Chrome.');
    process.exit(1);
  }

  console.log(`[render] navigateur : ${executablePath}`);
  console.log(`[render] requête    : « ${query} »${dryRun ? '  (dry-run)' : ''}`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1366, height: 900 },
    executablePath,
    headless: true,
  });

  try {
    for (const source of RENDERED_SOURCES) {
      const offers = await renderSource(browser, source, query);
      console.log(`\n[${source.name}] ${offers.length} offre(s)`);
      for (const o of offers.slice(0, 12)) {
        const plafond = o.comparePrice ? ` (neuf ${o.comparePrice})` : '';
        console.log(`   ${String(o.price).padStart(9)}${plafond.padEnd(14)}  ${o.title.slice(0, 56)}`);
      }
      if (!offers.length) {
        console.log('   (aucune — la page ne rend peut-être rien pour cette requête)');
        continue;
      }

      if (dryRun) {
        console.log('   (dry-run : rien écrit en base)');
      } else {
        const written = await persistOffers(offers);
        console.log(`   ${written} ligne(s) écrite(s) dans market_used_offers`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
};

main().catch((error) => {
  console.error('[render] échec :', error?.message ?? error);
  process.exit(1);
});

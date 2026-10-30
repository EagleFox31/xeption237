import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {
  CACHE_SCHEMA,
  classifyDataRequests,
  codeFingerprint,
  createDataContext,
  extractAssetRefs,
  extractLinkedRoutes,
  hashOf,
  openPrerenderCache,
  planRoutes,
  readModuleManifest,
  rebaseHtmlAssets,
  stripAssetTags,
  summarizeReasons,
} from './lib/prerenderCache.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(__dirname, '../dist');

const PRERENDER_CONFIG_PATH = path.join(__dirname, 'prerender.config.json');
const PRERENDER_CONFIG = JSON.parse(fs.readFileSync(PRERENDER_CONFIG_PATH, 'utf8'));
const CACHE_DIR = path.resolve(rootDir, process.env.PRERENDER_CACHE_DIR || PRERENDER_CONFIG.cacheDir);
const isTruthy = (value) => value === '1' || value === 'true';

const SITE_URL = 'https://www.xeptionetwork.shop';
const STATIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/shop',
  '/troc',
  '/tracking',
  '/sav',
  '/mentions-legales',
  '/cgv',
  '/cgv-smart-troc',
  '/politique-confidentialite',
  '/politique-cookies',
];

/** Routes de contenu SEO (landings, guides, aide) émises par le plugin Vite seo-routes-manifest. */
const getContentRoutes = () => {
  const manifestPath = path.join(distDir, 'seo-routes.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn('[prerender] dist/seo-routes.json absent — routes de contenu ignorées');
    return [];
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).map((entry) => entry.path);
};

const CONTENT_ROUTE_RE = /^\/(categorie|guides|aide)(\/|$)/;
const isContentRoute = (route) => CONTENT_ROUTE_RE.test(route);

/** Routes de contenu dont la page doit publier un FAQPage (FAQ visible). */

const routeRequiresFaq = (route) => route.startsWith('/categorie/');

/** Routes SPA sans prerender (auth admin, tokens dynamiques) — copie index.html pour refresh direct */
const SPA_CLIENT_ONLY_ROUTES = ['/admin'];

const PRERENDER_READY_TIMEOUT_MS = Number(process.env.PRERENDER_READY_TIMEOUT_MS || 20_000);
const PRODUCT_SEO_TIMEOUT_MS = Number(process.env.PRODUCT_SEO_TIMEOUT_MS || 20_000);
const PRODUCT_SEO_POLL_MS = 250;
const MAX_RENDER_ATTEMPTS = 3;

const slugify = (input = '') =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

const isPrerenderRequired = () =>
  isTruthy(process.env.PRERENDER_REQUIRED) ||
  process.env.CI === 'true' ||
  process.env.VERCEL === '1' ||
  !!process.env.VERCEL_ENV;

const productRouteOf = (product) => `/product/${slugify(product.name || 'product')}-${product.id}`;

const createSupabase = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  return supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
};

/** Lit toutes les lignes d'une table (paginé). `ok=false` si une page échoue : le cache est alors désactivé. */
const fetchAllRows = async (supabase, table, select = '*') => {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) return { rows, ok: false, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { rows, ok: true };
  }
};

/** Catalogue complet : routes produit + lignes utilisées pour les empreintes de données. */
const getCatalog = async (supabase) => {
  if (!supabase) return { rows: [], ok: false };
  try {
    const result = await fetchAllRows(supabase, PRERENDER_CONFIG.catalog.table);
    if (!result.ok) console.error('[prerender] failed to fetch products:', result.error);
    console.log(`[prerender] products fetched: ${result.rows.length}`);
    return result;
  } catch (err) {
    console.error('[prerender] failed to fetch products:', err);
    return { rows: [], ok: false };
  }
};

/** Sources partagées par toutes les pages (marques, catégories, packs). */
const getGlobalSources = async (supabase) => {
  if (!supabase) return { globals: {}, ok: false };
  const globals = {};
  for (const { table, select } of PRERENDER_CONFIG.globalSources) {
    try {
      const result = await fetchAllRows(supabase, table, select);
      if (!result.ok) {
        console.warn(`[prerender] source ${table} indisponible : cache désactivé`, result.error?.message || '');
        return { globals, ok: false };
      }
      globals[table] = result.rows;
    } catch (err) {
      console.warn(`[prerender] source ${table} indisponible : cache désactivé`, err?.message || err);
      return { globals, ok: false };
    }
  }
  return { globals, ok: true };
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const serveFile = (res, filePath) => {
  if (!fs.existsSync(filePath)) return false;

  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
  };

  res.writeHead(200, { 'Content-Type': typeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
};

/**
 * Sert toujours le shell Vite ORIGINAL pour les routes SPA.
 *
 * Important : "/" est prerendue en parallèle et réécrit dist/index.html.
 * Relire dist/index.html à chaque requête crée une race condition : les fiches
 * produit peuvent alors démarrer depuis le HTML déjà prerendu de l'accueil et
 * croire à tort que Helmet a appliqué leur SEO.
 */
const startServer = (port, spaShellHtml) => {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const filePath = path.join(distDir, urlPath);
    const isFile = path.extname(filePath).length > 0;

    if (isFile && serveFile(res, filePath)) return;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(spaShellHtml);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
};

const writeRouteHtml = async (route, html) => {
  const cleanRoute = route.replace(/\/+$/, '') || '/';

  if (cleanRoute === '/') {
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
    return;
  }

  const outDir = path.join(distDir, cleanRoute);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
};

const waitForPrerender = async (page, route) => {
  const result = await page.evaluate(
    (timeoutMs) =>
      new Promise((resolve) => {
        if (window.__PRERENDER_READY__) {
          resolve({ ok: true, reason: 'already-ready' });
          return;
        }

        const timer = setTimeout(() => {
          document.removeEventListener('prerender-ready', onReady);
          resolve({ ok: false, reason: 'timeout' });
        }, timeoutMs);

        const onReady = () => {
          clearTimeout(timer);
          resolve({ ok: true, reason: 'event' });
        };

        document.addEventListener('prerender-ready', onReady, { once: true });
      }),
    PRERENDER_READY_TIMEOUT_MS,
  );

  if (!result.ok) {
    const msg = `[prerender] prerender-ready timeout (${PRERENDER_READY_TIMEOUT_MS}ms) on ${route}`;
    if (isPrerenderRequired()) throw new Error(msg);
    console.warn(msg);
  }
};

const expectedCanonicalForRoute = (route) => `${SITE_URL}${route}`;

/**
 * Attend l'état SEO/GEO réellement attendu d'une fiche produit.
 *
 * On ne teste plus "le titre a changé", car un autre HTML prerendu peut déjà
 * porter un titre différent. La page n'est prête que lorsque ses métadonnées
 * produit sont cohérentes avec la route courante.
 */
const waitForProductSeo = async (page, route) => {
  const expectedCanonical = expectedCanonicalForRoute(route);

  const result = await page.evaluate(
    async ({ expectedCanonical, timeoutMs, pollMs }) => {
      const hasProductJsonLd = () => {
        const containsProduct = (value) => {
          if (!value) return false;
          if (Array.isArray(value)) return value.some(containsProduct);
          if (typeof value !== 'object') return false;
          if (value['@type'] === 'Product') return true;
          if (Array.isArray(value['@graph']) && value['@graph'].some(containsProduct)) return true;
          return Object.values(value).some(containsProduct);
        };

        return Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some((script) => {
          try {
            return containsProduct(JSON.parse(script.textContent || ''));
          } catch {
            return false;
          }
        });
      };

      const readState = () => {
        const title = document.title?.trim() || '';
        const description =
          document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
        const canonical =
          document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || '';
        const ogTitle =
          document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';

        return {
          title,
          description,
          canonical,
          ogTitle,
          hasProductJsonLd: hasProductJsonLd(),
        };
      };

      const startedAt = Date.now();
      let state = readState();

      while (Date.now() - startedAt < timeoutMs) {
        const ready =
          state.title.includes('Acheter au Cameroun') &&
          state.description.length >= 20 &&
          state.canonical === expectedCanonical &&
          state.ogTitle === state.title &&
          state.hasProductJsonLd;

        if (ready) return { ok: true, state };

        await new Promise((resolve) => setTimeout(resolve, pollMs));
        state = readState();
      }

      return { ok: false, state };
    },
    {
      expectedCanonical,
      timeoutMs: PRODUCT_SEO_TIMEOUT_MS,
      pollMs: PRODUCT_SEO_POLL_MS,
    },
  );

  if (!result.ok) {
    const { title, description, canonical, ogTitle, hasProductJsonLd } = result.state;
    throw new Error(
      [
        `SEO produit non prêt après ${PRODUCT_SEO_TIMEOUT_MS}ms`,
        `title="${title}"`,
        `description=${description.length} chars`,
        `canonical="${canonical}"`,
        `expectedCanonical="${expectedCanonical}"`,
        `ogTitle="${ogTitle}"`,
        `productJsonLd=${hasProductJsonLd}`,
      ].join(' | '),
    );
  }
};

/** Attend que Helmet ait appliqué le canonical de la route (et, pour une landing, FAQPage + liens produit). */
const waitForContentSeo = async (page, route) => {
  const expectedCanonical = expectedCanonicalForRoute(route);
  const requireFaq = routeRequiresFaq(route);
  const result = await page.evaluate(
    async ({ expectedCanonical, requireFaq, timeoutMs, pollMs }) => {
      const read = () => ({
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || '',
        hasFaq: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).some((el) =>
          (el.textContent || '').includes('"FAQPage"'),
        ),
        // Sélection vide légitime (catalogue sans modèle correspondant) : marquée par data-empty-selection.
        hasProductLinks: Boolean(document.querySelector('a[href^="/product/"], [data-empty-selection]')),
      });
      const startedAt = Date.now();
      let state = read();
      while (Date.now() - startedAt < timeoutMs) {
        if (state.canonical === expectedCanonical && (!requireFaq || (state.hasFaq && state.hasProductLinks))) {
          return { ok: true, state };
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
        state = read();
      }
      return { ok: false, state };
    },
    { expectedCanonical, requireFaq, timeoutMs: PRODUCT_SEO_TIMEOUT_MS, pollMs: PRODUCT_SEO_POLL_MS },
  );
  if (!result.ok) {
    throw new Error(
      `SEO contenu non prêt après ${PRODUCT_SEO_TIMEOUT_MS}ms | canonical="${result.state.canonical}" | expected="${expectedCanonical}" | faq=${result.state.hasFaq} | productLinks=${result.state.hasProductLinks}`,
    );
  }
};

/** Contrôles de maillage interne et des pages de contenu dans le HTML servi. */
const inspectLinkingAndContent = (contentRoutes) => {
  const errors = [];
  const read = (route) => {
    const file = route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route, 'index.html');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  };
  const home = read('/');
  if (home && !home.includes('href="/product/')) errors.push('home: aucun lien <a href="/product/…">');
  if (home && !home.includes('href="/categorie/')) errors.push('home: aucun lien <a href="/categorie/…">');
  const shop = read('/shop');
  if (shop && !shop.includes('href="/product/')) errors.push('shop: aucun lien <a href="/product/…">');
  for (const route of contentRoutes) {
    const html = read(route);
    if (!html) {
      errors.push(`${route}: HTML manquant`);
      continue;
    }
    if (extractCanonical(html) !== expectedCanonicalForRoute(route)) errors.push(`${route}: canonical incorrect`);
    if (routeRequiresFaq(route) && !html.includes('"FAQPage"')) errors.push(`${route}: FAQPage absent`);
    if (route.startsWith('/categorie/') && !html.includes('href="/product/')) {
      if (html.includes('data-empty-selection')) console.warn(`[prerender] ${route} : sélection vide (aucun produit ne correspond)`);
      else errors.push(`${route}: aucun lien produit`);
    }
  }
  return errors;
};

const findChromeExecutable = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const decodeHtmlEntities = (value = '') =>
  value.replace(/&(#(?:x[0-9a-f]+|\d+)|quot|amp|apos|lt|gt|nbsp);/gi, (full, entity) => {
    const normalized = entity.toLowerCase();
    const named = {
      quot: '"',
      amp: '&',
      apos: "'",
      lt: '<',
      gt: '>',
      nbsp: ' ',
    };

    if (named[normalized] !== undefined) return named[normalized];

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : full;
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : full;
    }

    return full;
  });

/**
 * Extrait un attribut HTML en respectant le guillemet qui l'a ouvert.
 * Une apostrophe dans content="L'iPhone..." ne doit jamais fermer la valeur.
 */
const extractAttribute = (tag, attributeName) => {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const match = tag.match(pattern);
  return match ? decodeHtmlEntities(match[2].trim()) : '';
};

const extractTitle = (html) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : '';
};

const extractCanonical = (html) => {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const canonicalTag = tags.find((tag) =>
    extractAttribute(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical'),
  );
  return canonicalTag ? extractAttribute(canonicalTag, 'href') : '';
};

const extractMetaContent = (html, selectorAttr, selectorValue) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find(
    (candidate) => extractAttribute(candidate, selectorAttr).toLowerCase() === selectorValue.toLowerCase(),
  );
  return tag ? extractAttribute(tag, 'content') : '';
};

const inspectProductHtml = (route, html) => {
  const errors = [];
  const title = extractTitle(html);
  const description = extractMetaContent(html, 'name', 'description');
  const canonical = extractCanonical(html);
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  const hasProductJsonLd =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i.test(html) &&
    /"@type"\s*:\s*"Product"/i.test(html);

  if (!title.includes('Acheter au Cameroun')) {
    errors.push(`title invalide: "${title || '(aucun)'}"`);
  }
  if (description.length < 20) {
    errors.push(`meta description absente/trop courte (${description.length} caractères)`);
  }

  const expectedCanonical = expectedCanonicalForRoute(route);
  if (canonical !== expectedCanonical) {
    errors.push(`canonical invalide: "${canonical || '(aucun)'}" attendu "${expectedCanonical}"`);
  }
  if (!ogTitle || ogTitle !== title) {
    errors.push(`og:title incohérent: "${ogTitle || '(aucun)'}"`);
  }
  if (!hasProductJsonLd) {
    errors.push('JSON-LD Product absent');
  }

  return errors;
};

/** Toute page (rendue ou reprise du cache) ne doit référencer que des assets du build courant. */
const inspectAssetRefs = (routes) => {
  const missing = [];
  for (const route of routes) {
    const file = route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route, 'index.html');
    if (!fs.existsSync(file)) continue;
    for (const ref of extractAssetRefs(fs.readFileSync(file, 'utf8'))) {
      if (!fs.existsSync(path.join(distDir, ref))) missing.push(`${route}: asset absent du build ${ref}`);
    }
  }
  return missing.length ? [`${missing.length} référence(s) d'asset invalide(s)\n  ${missing.slice(0, 10).join('\n  ')}`] : [];
};

const verifyPrerenderOutput = (routes) => {
  const errors = [];
  errors.push(...inspectAssetRefs(routes));
  errors.push(...inspectLinkingAndContent(routes.filter(isContentRoute)));

  const sitemapPath = path.join(distDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    errors.push('dist/sitemap.xml missing');
  } else {
    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    if (!/<loc>https:\/\/www\.xeptionetwork\.shop\/<\/loc>/.test(sitemap)) {
      errors.push('dist/sitemap.xml has no homepage URL');
    }
  }

  const homeHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  if (extractMetaContent(homeHtml, 'name', 'description').length < 20) {
    errors.push('dist/index.html missing meta description (prerender may have failed)');
  }
  if (homeHtml.includes('Leader High-Tech & Troc au Cameroun') && !homeHtml.includes('Ndamba du Digital')) {
    errors.push('dist/index.html still has fallback title — Helmet SEO not applied');
  }

  const productRoutes = routes.filter((route) => route.startsWith('/product/'));
  if (productRoutes.length === 0) {
    errors.push('no product routes prerendered');
  } else {
    let invalidProductPages = 0;
    const samples = [];

    for (const route of productRoutes) {
      const productPath = path.join(distDir, route, 'index.html');
      if (!fs.existsSync(productPath)) {
        invalidProductPages += 1;
        if (samples.length < 10) samples.push(`${route}: HTML manquant`);
        continue;
      }

      const html = fs.readFileSync(productPath, 'utf8');
      const routeErrors = inspectProductHtml(route, html);
      if (routeErrors.length) {
        invalidProductPages += 1;
        if (samples.length < 10) samples.push(`${route}: ${routeErrors.join('; ')}`);
      }
    }

    if (invalidProductPages > 0) {
      errors.push(
        `${invalidProductPages}/${productRoutes.length} product page(s) have invalid SEO/GEO output` +
          (samples.length ? `\n  ${samples.join('\n  ')}` : ''),
      );
    }
  }

  if (errors.length) {
    const msg = `[prerender] verification failed:\n- ${errors.join('\n- ')}`;
    if (isPrerenderRequired()) throw new Error(msg);
    console.warn(msg);
    return false;
  }

  console.log(`[prerender] verification passed (${productRoutes.length} product pages, internal links and content routes checked)`);
  return true;
};

/**
 * Prérendu incrémental : décide quelles pages rendre, reprendre du cache ou retirer.
 * Le cache n'est utilisé que si le manifeste de modules du build et toutes les données sont
 * disponibles ; sinon rendu complet, comme sans cache.
 */
const prepareIncremental = ({ routes, spaShellHtml, catalog, sources }) => {
  const manifest = readModuleManifest(CACHE_DIR);
  const disabledReason = !manifest
    ? 'manifeste de modules absent'
    : !manifest.entry || !spaShellHtml.includes(`/${manifest.entry}`)
      ? 'manifeste de modules périmé'
      : !catalog.ok
        ? 'catalogue indisponible'
        : !sources.ok
          ? 'sources globales indisponibles'
          : null;

  if (disabledReason) {
    console.warn(`[prerender] cache désactivé (${disabledReason}) : rendu complet`);
    return { enabled: false, plan: { render: routes.map((route) => ({ route, reason: 'sans-cache' })), reuse: [], removed: [] } };
  }

  const cache = openPrerenderCache(CACHE_DIR);
  const data = createDataContext({
    productRows: catalog.rows,
    routeOf: productRouteOf,
    globals: sources.globals,
    catalog: PRERENDER_CONFIG.catalog,
  });
  const renderVersion = hashOf({
    schema: CACHE_SCHEMA,
    script: fs.readFileSync(__filename, 'utf8'),
    lib: fs.readFileSync(path.join(__dirname, 'lib/prerenderCache.mjs'), 'utf8'),
    config: PRERENDER_CONFIG,
    shell: stripAssetTags(spaShellHtml),
    site: SITE_URL,
    supabase: process.env.VITE_SUPABASE_URL || '',
  });

  const meta = cache.readMeta();
  const fullReason = isTruthy(process.env.PRERENDER_FULL)
    ? 'PRERENDER_FULL'
    : !meta
      ? 'cache absent'
      : meta.renderVersion !== renderVersion
        ? 'version de rendu modifiée'
        : null;
  if (fullReason) {
    console.log(`[prerender] rendu complet : ${fullReason}`);
    cache.reset({ renderVersion });
  }

  const codeFps = new Map();
  const codeFp = (setId) => {
    if (!codeFps.has(setId)) {
      const moduleIds = setId ? cache.readModuleSet(setId) : null;
      codeFps.set(setId, moduleIds ? codeFingerprint(moduleIds, manifest.modules) : null);
    }
    return codeFps.get(setId);
  };

  const entries = fullReason ? new Map() : cache.readEntries();
  const plan = planRoutes({
    routes,
    entries,
    full: Boolean(fullReason),
    now: Date.now(),
    ttl: PRERENDER_CONFIG,
    codeFp,
    dataFp: data.fingerprint,
    htmlExists: cache.htmlExists,
  });

  return { enabled: true, cache, data, manifest, entries, plan };
};

/** Enregistre une page rendue dans le cache dès sa réussite (reprise après interruption). */
const recordRender = (incremental, route, html, resourceUrls) => {
  if (!incremental.enabled) return;
  const { cache, data, manifest } = incremental;

  const scripts = new Set(extractAssetRefs(html).filter((ref) => /\.m?js$/.test(ref)));
  for (const raw of resourceUrls) {
    try {
      const url = new URL(raw);
      if (url.hostname === 'localhost' && url.pathname.startsWith('/assets/') && /\.m?js$/.test(url.pathname)) {
        scripts.add(url.pathname);
      }
    } catch {
      // URL non analysable (data:, blob:) : sans effet sur le code exécuté.
    }
  }

  const moduleIds = new Set();
  const volatileReasons = [];
  for (const script of scripts) {
    const ids = manifest.chunks[script.slice(1)];
    if (ids) ids.forEach((id) => moduleIds.add(id));
    else volatileReasons.push(`script ${script}`);
  }

  const { unknown } = classifyDataRequests(resourceUrls, {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    knownTables: [PRERENDER_CONFIG.catalog.table, ...PRERENDER_CONFIG.globalSources.map((source) => source.table)],
    ignoredPaths: PRERENDER_CONFIG.ignoredRequestPaths,
  });
  volatileReasons.push(...unknown.map((source) => `source ${source}`));
  if (volatileReasons.length) {
    console.warn(`[prerender] ${route} volatile (toujours re-rendue) : ${volatileReasons.join(', ')}`);
  }

  const deps = data.isProductRoute(route)
    ? extractLinkedRoutes(html, PRERENDER_CONFIG.catalog.routePrefix).filter((dep) => dep !== route)
    : [];

  cache.store(route, html, {
    setId: cache.writeModuleSet(moduleIds),
    codeFp: codeFingerprint(moduleIds, manifest.modules),
    dataFp: data.fingerprint(route, deps),
    deps,
    volatile: volatileReasons.length > 0,
    volatileReasons,
    renderedAt: new Date().toISOString(),
  });
};

const main = async () => {
  const supabase = createSupabase();
  const [catalog, sources] = await Promise.all([getCatalog(supabase), getGlobalSources(supabase)]);
  const routes = [...STATIC_ROUTES, ...getContentRoutes(), ...catalog.rows.map(productRouteOf)];

  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Run vite build first.');
    process.exit(1);
  }

  // Snapshot immuable du shell généré par Vite AVANT que "/" ne réécrive dist/index.html.
  const spaShellHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  const incremental = prepareIncremental({ routes, spaShellHtml, catalog, sources });
  const { plan } = incremental;

  for (const route of plan.reuse) {
    try {
      await writeRouteHtml(route, rebaseHtmlAssets(incremental.cache.readHtml(incremental.entries.get(route)), spaShellHtml));
    } catch (err) {
      plan.render.push({ route, reason: 'cache-illisible' });
      console.warn(`[prerender] ${route} : cache illisible, re-rendu (${err?.message || err})`);
    }
  }
  plan.removed.forEach((route) => incremental.cache.remove(route));
  const reused = plan.reuse.length - plan.render.filter(({ reason }) => reason === 'cache-illisible').length;

  console.log(`[prerender] routes: ${routes.length}`);
  console.log(
    `[prerender] plan : ${plan.render.length} à rendre${plan.render.length ? ` (${summarizeReasons(plan.render)})` : ''}, ` +
      `${reused} reprise(s) du cache, ${plan.removed.length} retirée(s) du cache`,
  );

  const queue = plan.render.map(({ route }) => route);
  const total = queue.length;
  const failures = [];
  const port = 4173;
  let server = null;
  let browser = null;

  try {
    if (total > 0) {
      server = await startServer(port, spaShellHtml);
      let executablePath = findChromeExecutable();

      if (!executablePath) {
        try {
          executablePath = await chromium.executablePath();
        } catch (err) {
          console.warn('[prerender] @sparticuz/chromium unavailable:', err);
        }
      }

      if (!executablePath) {
        const msg = '[prerender] Chrome/Edge not found. Prerender skipped.';
        if (isPrerenderRequired()) {
          console.error(`${msg} Build aborted (CI/Vercel requires prerender).`);
          process.exit(1);
        }
        console.warn(`${msg} Continuing without prerender (local dev).`);
        process.exit(0);
      }

      console.log(`[prerender] using browser: ${executablePath}`);
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });

      const concurrence = Math.max(1, Math.min(12, Number(process.env.PRERENDER_CONCURRENCY) || 5));
      console.log(`[prerender] concurrence: ${concurrence}`);

      let processed = 0;
      const attempts = new Map();
      const requestedUrls = new WeakMap();

      const newPage = async () => {
        const page = await browser.newPage();
        requestedUrls.set(page, []);
        page.on('request', (request) => requestedUrls.get(page)?.push(request.url()));
        await page.evaluateOnNewDocument(() => {
          window.__PRERENDER__ = true;
          window.__PRERENDER_READY__ = false;
          performance.setResourceTimingBufferSize?.(20_000);
        });
        return page;
      };

      const renderRoute = async (page, route) => {
        requestedUrls.set(page, []);
        const url = `http://localhost:${port}${route}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await waitForPrerender(page, route);

        if (route.startsWith('/product/')) {
          await waitForProductSeo(page, route);
        } else if (isContentRoute(route) || route === '/') {
          // L'accueil est vérifié (meta description, titre) : attendre que Helmet ait appliqué son SEO.
          await waitForContentSeo(page, route);
        }

        const timedUrls = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
        const html = await page.content();
        await writeRouteHtml(route, html);
        recordRender(incremental, route, html, [...new Set([...(requestedUrls.get(page) || []), ...timedUrls])]);
      };

      const worker = async () => {
        let page = await newPage();

        try {
          for (;;) {
            const route = queue.shift();
            if (route === undefined) break;

            try {
              await renderRoute(page, route);
              processed += 1;
              console.log(`[prerender] ${processed}/${total} ${route}`);
            } catch (err) {
              const message = err?.message || String(err);

              // Un onglet ayant perdu sa frame peut rester inutilisable : repartir proprement.
              await page.close().catch(() => {});
              page = await newPage();

              const attempt = (attempts.get(route) || 0) + 1;
              attempts.set(route, attempt);

              if (attempt < MAX_RENDER_ATTEMPTS) {
                queue.unshift(route);
                console.warn(
                  `[prerender] reprise ${route} (essai ${attempt + 1}/${MAX_RENDER_ATTEMPTS}) — ${message}`,
                );
              } else {
                failures.push({ route, message });
                processed += 1;
                console.error(`[prerender] echec definitif ${route}: ${message}`);
              }
            }
          }
        } finally {
          await page.close().catch(() => {});
        }
      };

      await Promise.all(Array.from({ length: concurrence }, worker));

      // Dernière passe séquentielle : réduit la contention pour les rares retardataires.
      if (failures.length) {
        const retrySequentially = failures.splice(0, failures.length);
        console.log(`[prerender] passe sequentielle pour ${retrySequentially.length} route(s)`);
        let page = await newPage();

        try {
          for (const { route } of retrySequentially) {
            try {
              await renderRoute(page, route);
              console.log(`[prerender] rattrape ${route}`);
            } catch (err) {
              failures.push({ route, message: err?.message || String(err) });
              console.error(`[prerender] echec apres passe sequentielle ${route}`);

              await page.close().catch(() => {});
              page = await newPage();
            }
          }
        } finally {
          await page.close().catch(() => {});
        }
      }
    }

    if (failures.length) {
      console.warn(`[prerender] ${failures.length} route(s) en echec :`);
      failures.forEach((failure) =>
        console.warn(`  ${failure.route} — ${failure.message}`),
      );
    }

    const rootHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    for (const route of SPA_CLIENT_ONLY_ROUTES) {
      const cleanRoute = route.replace(/\/+$/, '') || '/';
      const outDir = path.join(distDir, cleanRoute.slice(1));
      ensureDir(outDir);
      fs.writeFileSync(path.join(outDir, 'index.html'), rootHtml);
      console.log(`[prerender] spa-fallback ${route}`);
    }

    verifyPrerenderOutput(routes);
    console.log('[prerender] done');
  } finally {
    await browser?.close();
    server?.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

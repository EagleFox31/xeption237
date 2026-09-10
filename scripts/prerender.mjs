import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

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
  process.env.PRERENDER_REQUIRED === 'true' ||
  process.env.CI === 'true' ||
  process.env.VERCEL === '1' ||
  !!process.env.VERCEL_ENV;

const getProductRoutes = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const pageSize = 1000;
    let from = 0;
    const all = [];

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id,name')
        .range(from, from + pageSize - 1);

      if (error || !data?.length) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    console.log(`[prerender] products fetched: ${all.length}`);
    return all.map((product) => `/product/${slugify(product.name || 'product')}-${product.id}`);
  } catch (err) {
    console.error('[prerender] failed to fetch products:', err);
    return [];
  }
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

const extractTitle = (html) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
};

const extractCanonical = (html) => {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const canonicalTag = tags.find((tag) => /\brel=["']canonical["']/i.test(tag));
  if (!canonicalTag) return '';

  const href = canonicalTag.match(/\bhref=["']([^"']+)["']/i);
  return href ? href[1].trim() : '';
};

const extractMetaContent = (html, selectorAttr, selectorValue) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const selector = new RegExp(`\\b${selectorAttr}=["']${selectorValue}["']`, 'i');
  const tag = tags.find((candidate) => selector.test(candidate));
  if (!tag) return '';

  const content = tag.match(/\bcontent=["']([^"']*)["']/i);
  return content ? content[1].trim() : '';
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

const verifyPrerenderOutput = (routes) => {
  const errors = [];

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
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(homeHtml)) {
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

  console.log(`[prerender] verification passed (${productRoutes.length} product pages checked)`);
  return true;
};

const main = async () => {
  const routes = [...STATIC_ROUTES, ...(await getProductRoutes())];

  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Run vite build first.');
    process.exit(1);
  }

  // Snapshot immuable du shell généré par Vite AVANT que "/" ne réécrive dist/index.html.
  const spaShellHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  const port = 4173;
  const server = await startServer(port, spaShellHtml);
  const localExecutable = findChromeExecutable();
  let executablePath = localExecutable;

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
      server.close();
      process.exit(1);
    }
    console.warn(`${msg} Continuing without prerender (local dev).`);
    server.close();
    process.exit(0);
  }

  console.log(`[prerender] routes: ${routes.length}`);
  console.log(`[prerender] using browser: ${executablePath}`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const concurrence = Math.max(
      1,
      Math.min(12, Number(process.env.PRERENDER_CONCURRENCY) || 5),
    );
    console.log(`[prerender] concurrence: ${concurrence}`);

    const queue = [...routes];
    let processed = 0;
    const failures = [];
    const attempts = new Map();

    const newPage = async () => {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        window.__PRERENDER__ = true;
        window.__PRERENDER_READY__ = false;
      });
      return page;
    };

    const renderRoute = async (page, route) => {
      const url = `http://localhost:${port}${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await waitForPrerender(page, route);

      if (route.startsWith('/product/')) {
        await waitForProductSeo(page, route);
      }

      await writeRouteHtml(route, await page.content());
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
            console.log(`[prerender] ${processed}/${routes.length} ${route}`);
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
    await browser.close();
    server.close();
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

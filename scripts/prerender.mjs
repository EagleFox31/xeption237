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

const STATIC_ROUTES = ['/', '/about', '/contact', '/shop', '/troc', '/tracking', '/sav', '/mentions-legales', '/cgv', '/cgv-smart-troc', '/politique-confidentialite', '/politique-cookies'];

/** Routes SPA sans prerender (auth admin, tokens dynamiques) — copie index.html pour refresh direct */
const SPA_CLIENT_ONLY_ROUTES = ['/admin'];

const PRERENDER_READY_TIMEOUT_MS = Number(process.env.PRERENDER_READY_TIMEOUT_MS || 20_000);

const slugify = (input = '') => {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
};

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
    return all.map((p) => `/product/${slugify(p.name || 'product')}-${p.id}`);
  } catch (err) {
    console.error('[prerender] failed to fetch products:', err?.message || err);
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
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
  };
  res.writeHead(200, { 'Content-Type': typeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
};

const startServer = (port) => {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const filePath = path.join(distDir, urlPath);
    const isFile = path.extname(filePath).length > 0;
    if (isFile && serveFile(res, filePath)) return;
    serveFile(res, path.join(distDir, 'index.html'));
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
    PRERENDER_READY_TIMEOUT_MS
  );

  if (!result.ok) {
    const msg = `[prerender] prerender-ready timeout (${PRERENDER_READY_TIMEOUT_MS}ms) on ${route}`;
    if (isPrerenderRequired()) {
      throw new Error(msg);
    }
    console.warn(msg);
  }
};

const findChromeExecutable = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
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
  if (!/<meta[^>]+name="description"[^>]+content="[^"]{20,}"/i.test(homeHtml)) {
    errors.push('dist/index.html missing meta description (prerender may have failed)');
  }
  if (homeHtml.includes('Leader High-Tech & Troc au Cameroun') && !homeHtml.includes('Ndamba du Digital')) {
    errors.push('dist/index.html still has fallback title — Helmet SEO not applied');
  }

  const productRoutes = routes.filter((r) => r.startsWith('/product/'));
  if (productRoutes.length === 0) {
    errors.push('no product routes prerendered');
  } else {
    const sampleRoute = productRoutes[0];
    const samplePath = path.join(distDir, sampleRoute, 'index.html');
    if (!fs.existsSync(samplePath)) {
      errors.push(`sample product HTML missing: ${sampleRoute}`);
    } else {
      const sampleHtml = fs.readFileSync(samplePath, 'utf8');
      if (!/<title>[^<]+Acheter au Cameroun[^<]*<\/title>/i.test(sampleHtml)) {
        errors.push(`sample product page lacks SEO title: ${sampleRoute}`);
      }
      if (!/application\/ld\+json/i.test(sampleHtml)) {
        errors.push(`sample product page lacks JSON-LD: ${sampleRoute}`);
      }
    }
  }

  if (errors.length) {
    const msg = `[prerender] verification failed:\n- ${errors.join('\n- ')}`;
    if (isPrerenderRequired()) {
      throw new Error(msg);
    }
    console.warn(msg);
    return false;
  }

  console.log('[prerender] verification passed');
  return true;
};

const main = async () => {
  const routes = [...STATIC_ROUTES, ...(await getProductRoutes())];
  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Run vite build first.');
    process.exit(1);
  }

  const port = 4173;
  const server = await startServer(port);
  const localExecutable = findChromeExecutable();
  let executablePath = localExecutable;

  if (!executablePath) {
    try {
      executablePath = await chromium.executablePath();
    } catch (err) {
      console.warn('[prerender] @sparticuz/chromium unavailable:', err?.message || err);
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
    headless: chromium.headless
  });

  try {
    const page = await browser.newPage();
    let index = 0;
    await page.evaluateOnNewDocument(() => {
      window.__PRERENDER__ = true;
      window.__PRERENDER_READY__ = false;
    });

    for (const route of routes) {
      index += 1;
      console.log(`[prerender] ${index}/${routes.length} ${route}`);
      const url = `http://localhost:${port}${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForPrerender(page, route);
      const html = await page.content();
      await writeRouteHtml(route, html);
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
  console.error(err?.message || err);
  process.exit(1);
});

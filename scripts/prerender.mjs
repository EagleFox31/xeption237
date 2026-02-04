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

const STATIC_ROUTES = ['/', '/shop', '/troc', '/tracking', '/sav'];

const slugify = (input = '') => {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
};

const getProductRoutes = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const max = Number(process.env.PRERENDER_PRODUCTS || 200);
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('products')
      .select('id,name')
      .limit(max);
    if (error || !data) return [];
    return data.map((p) => `/product/${slugify(p.name || 'product')}-${p.id}`);
  } catch {
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
    // SPA fallback
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

const waitForPrerender = async (page) => {
  try {
    await page.evaluate(() => new Promise((resolve) => {
      document.addEventListener('prerender-ready', () => resolve(true), { once: true });
    }));
  } catch {
    // ignore
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

const main = async () => {
  const routes = [...STATIC_ROUTES, ...(await getProductRoutes())];
  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found. Run vite build first.');
    process.exit(1);
  }

  const port = 4173;
  const server = await startServer(port);
  const localExecutable = findChromeExecutable();
  const executablePath = localExecutable || await chromium.executablePath();
  if (!executablePath) {
    console.warn('[prerender] Chrome/Edge not found. Skipping prerender.');
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
    });

    for (const route of routes) {
      index += 1;
      console.log(`[prerender] ${index}/${routes.length} ${route}`);
      const url = `http://localhost:${port}${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForPrerender(page);
      const html = await page.content();
      await writeRouteHtml(route, html);
    }
    console.log('[prerender] done');
  } finally {
    await browser.close();
    server.close();
  }
};

main();

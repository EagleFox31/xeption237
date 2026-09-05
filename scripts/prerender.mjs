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
    /*
     * Rendu en parallele.
     *
     * La boucle etait sequentielle, sur un seul onglet : 3,8 s par route mesurees
     * sur ce projet, soit environ 15 minutes pour 240 routes — ajoutees a CHAQUE
     * deploiement Vercel, que le code ait change ou non.
     *
     * Les routes sont independantes : chacune ouvre une page, attend son signal
     * `prerender-ready`, ecrit son HTML. Rien de partage, donc rien a
     * synchroniser hormis la file et le compteur d'avancement.
     *
     * La concurrence reste modeste par defaut : chaque onglet est un vrai
     * rendu, gourmand en memoire. Un runner CI serre supporte mal davantage, et
     * un onglet tue par manque de memoire couterait plus cher que le temps
     * gagne. Ajustable par PRERENDER_CONCURRENCY.
     */
    const concurrence = Math.max(
      1,
      Math.min(12, Number(process.env.PRERENDER_CONCURRENCY) || 5),
    );
    console.log(`[prerender] concurrence: ${concurrence}`);

    /*
     * Le titre du shell EST le titre de repli, par definition : c'est celui
     * qu'affiche index.html avant que Helmet ait pose le SEO de la route.
     */
    const titreRepli = (
      fs.readFileSync(path.join(distDir, 'index.html'), 'utf8').match(/<title>([^<]*)<\/title>/) || [, '']
    )[1].trim();

    const file = [...routes];
    let traitees = 0;
    const echecs = [];
    const essais = new Map();
    const MAX_ESSAIS = 3;

    const nouvellePage = async () => {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        window.__PRERENDER__ = true;
        window.__PRERENDER_READY__ = false;
      });
      return page;
    };

    const travailleur = async () => {
      let page = await nouvellePage();

      try {
        for (;;) {
          const route = file.shift();
          if (route === undefined) break;

          try {
            const url = `http://localhost:${port}${route}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await waitForPrerender(page, route);

            /*
             * Le signal `prerender-ready` part AVANT que Helmet ait pose les
             * balises. En sequentiel, le temps CPU masquait l'ecart ; des deux
             * onglets il devient visible. Mesure sur 10 fiches :
             *
             *   sequentiel                    10/10 titres SEO corrects
             *   2 onglets, signal seul         6/10
             *   5 onglets, signal seul         4/10
             *   5 onglets, attente du titre   10/10
             *
             * On attend donc le RESULTAT — un titre different du repli — et non
             * le signal. Reserve aux fiches produit : l'accueil porte
             * legitimement le titre du shell, l'y attendre ferait patienter
             * pour rien.
             */
            if (route.startsWith('/product/') && titreRepli) {
              const titreObtenu = await page.evaluate(async (repli) => {
                for (let i = 0; i < 60; i += 1) {
                  if (document.title && document.title.trim() !== repli) return document.title.trim();
                  await new Promise((r) => setTimeout(r, 250));
                }
                return document.title.trim();
              }, titreRepli);

              /*
               * Impératif, pas indicatif. Avec une simple attente, 93 fiches sur
               * 228 repartaient encore avec le titre du repli — et le build
               * s'achevait quand meme. Une fiche produit sans titre propre est
               * une page morte pour le referencement : mieux vaut la refaire sur
               * un onglet neuf, quitte a ralentir.
               */
              if (titreObtenu === titreRepli) {
                throw new Error('titre SEO non applique (titre de repli conserve)');
              }
            }

            const html = await page.content();
            await writeRouteHtml(route, html);
            traitees += 1;
            console.log(`[prerender] ${traitees}/${routes.length} ${route}`);
          } catch (err) {
            const message = err?.message || String(err);

            // Un onglet peut mourir en cours de route (« detached Frame »), et
            // il reste alors inutilisable. Sans recreation, ce travailleur
            // echouait sur TOUTES les routes suivantes en les consommant :
            // 150 pertes sur 240 lors du premier essai, avec le meme
            // identifiant de frame repete dans chaque message.
            await page.close().catch(() => {});
            page = await nouvellePage();

            const n = (essais.get(route) || 0) + 1;
            essais.set(route, n);

            if (n < MAX_ESSAIS) {
              // Remise en tete de file : la route repasse tout de suite, sur
              // un onglet neuf.
              file.unshift(route);
              console.warn(`[prerender] reprise ${route} (essai ${n + 1}) — ${message}`);
            } else {
              echecs.push({ route, message });
              traitees += 1;
              console.error(`[prerender] echec definitif ${route} : ${message}`);
            }
          }
        }
      } finally {
        await page.close().catch(() => {});
      }
    };

    await Promise.all(Array.from({ length: concurrence }, travailleur));

    /*
     * Passe finale, SEQUENTIELLE, pour les retardataires.
     *
     * Dix fiches sur 228 perdaient encore la course apres trois essais en
     * parallele — des produits normaux, pas des donnees manquantes. La cause est
     * la contention : seul, un onglet applique toujours son SEO (10/10 mesures).
     *
     * Le gros du travail va donc vite en parallele, et le reliquat repasse sans
     * concurrence. C'est le seul endroit ou la lenteur achete de la certitude.
     */
    if (echecs.length) {
      const retardataires = echecs.splice(0, echecs.length);
      console.log(`[prerender] passe sequentielle pour ${retardataires.length} route(s)`);
      const page = await nouvellePage();
      try {
        for (const { route } of retardataires) {
          try {
            await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await waitForPrerender(page, route);
            if (route.startsWith('/product/') && titreRepli) {
              const titre = await page.evaluate(async (repli) => {
                for (let i = 0; i < 80; i += 1) {
                  if (document.title && document.title.trim() !== repli) return document.title.trim();
                  await new Promise((r) => setTimeout(r, 250));
                }
                return document.title.trim();
              }, titreRepli);
              if (titre === titreRepli) throw new Error('titre SEO non applique');
            }
            await writeRouteHtml(route, await page.content());
            console.log(`[prerender] rattrape ${route}`);
          } catch (err) {
            echecs.push({ route, message: err?.message || String(err) });
            console.error(`[prerender] echec apres passe sequentielle ${route}`);
          }
        }
      } finally {
        await page.close().catch(() => {});
      }
    }

    if (echecs.length) {
      console.warn(`[prerender] ${echecs.length} route(s) en echec :`);
      echecs.forEach((e) => console.warn(`  ${e.route} — ${e.message}`));
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

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Prérendu incrémental : empreintes par route, plan de rendu et cache disque.
 *
 * Une page est reprise du cache si et seulement si :
 * - la version de rendu globale (script, config, shell HTML, environnement) est identique ;
 * - le code exécuté pour la produire (modules Vite des chunks chargés) n'a pas changé ;
 * - les données qui la façonnent n'ont pas changé ;
 * - elle n'a pas dépassé son TTL.
 * Les fonctions pures sont testées dans tests/unit/prerenderCache.test.ts.
 */

export const CACHE_SCHEMA = 1;
export const MODULE_MANIFEST_FILE = 'modules.json';

const DAY_MS = 24 * 60 * 60 * 1000;

const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
};

export const stableStringify = (value) => JSON.stringify(sortKeys(value === undefined ? null : value));

export const hashOf = (value) =>
  crypto
    .createHash('sha256')
    .update(typeof value === 'string' ? value : stableStringify(value))
    .digest('hex');

// ---------------------------------------------------------------------------
// Balises d'assets (JS/CSS du build Vite)
// ---------------------------------------------------------------------------

const ASSET_SCRIPT_RE = /<script\b[^>]*\bsrc=["']\/assets\/[^"']+["'][^>]*>\s*<\/script>/gi;
const ASSET_LINK_RE = /<link\b[^>]*\bhref=["']\/assets\/[^"']+\.(?:js|mjs|css)["'][^>]*>/gi;

/** Balises <script>/<link> du shell qui pointent vers les JS/CSS du build. */
export const extractAssetTags = (html) => [...(html.match(ASSET_SCRIPT_RE) || []), ...(html.match(ASSET_LINK_RE) || [])];

/** Retire les balises JS/CSS du build (y compris celles injectées par le préchargement Vite). */
export const stripAssetTags = (html) => html.replace(ASSET_SCRIPT_RE, '').replace(ASSET_LINK_RE, '');

/**
 * Remplace les balises JS/CSS d'une page en cache par celles du build courant.
 * Sûr parce que l'app remplace le DOM au chargement (createRoot, sans hydratation).
 */
export const rebaseHtmlAssets = (cachedHtml, shellHtml) => {
  const tags = extractAssetTags(shellHtml).join('');
  const stripped = stripAssetTags(cachedHtml);
  if (!/<\/head>/i.test(stripped)) throw new Error('HTML en cache sans </head> : réutilisation impossible');
  return stripped.replace(/<\/head>/i, `${tags}</head>`);
};

/** Chemins /assets/... référencés par src/href (contrôle d'intégrité après réutilisation). */
export const extractAssetRefs = (html) => {
  const refs = new Set();
  for (const match of html.matchAll(/\b(?:src|href)=["'](\/assets\/[^"'?#]+)/gi)) refs.add(match[1]);
  return [...refs];
};

/** Liens produit présents dans le HTML (dépendances de données de la page). */
export const extractLinkedRoutes = (html, routePrefix) => {
  const refs = new Set();
  const escaped = routePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\bhref=["'](${escaped}[^"'?#]+)`, 'gi');
  for (const match of html.matchAll(re)) refs.add(match[1].replace(/\/+$/, ''));
  return [...refs].sort();
};

// ---------------------------------------------------------------------------
// Requêtes de données observées pendant le rendu
// ---------------------------------------------------------------------------

/**
 * Classe les URL chargées par la page : sources de données connues (fingerprintées)
 * et sources inconnues (page « volatile », toujours re-rendue).
 */
export const classifyDataRequests = (urls, { supabaseUrl, knownTables, ignoredPaths = [] }) => {
  const tables = new Set();
  const unknown = new Set();
  if (!supabaseUrl) return { tables: [], unknown: [] };
  const origin = new URL(supabaseUrl).origin;

  for (const raw of urls) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    if (ignoredPaths.some((prefix) => url.pathname.startsWith(prefix))) continue;

    const rest = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([^/]+)/);
    const source = rest ? (rest[1] ? `rpc:${rest[2]}` : rest[2]) : url.pathname;
    (knownTables.includes(source) ? tables : unknown).add(source);
  }
  return { tables: [...tables].sort(), unknown: [...unknown].sort() };
};

// ---------------------------------------------------------------------------
// Empreintes
// ---------------------------------------------------------------------------

const omit = (row, fields) => {
  if (!fields.length) return row;
  const copy = { ...row };
  for (const field of fields) delete copy[field];
  return copy;
};

const sortRows = (rows) => [...rows].map(sortKeys).sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));

/**
 * Contexte de données d'un build : calcule l'empreinte de données d'une route.
 * - fiche produit : sa ligne + les produits qu'elle lie + la composition de sa catégorie
 *   (sélection « produits similaires ») + les sources globales ;
 * - autres pages (listings, contenus) : tout le catalogue + les sources globales.
 */
export const createDataContext = ({ productRows, routeOf, globals, catalog }) => {
  const ignoreFields = catalog.ignoreFields || [];
  const rowHashByRoute = new Map();
  const rowByRoute = new Map();
  const membershipByCategory = new Map();

  for (const row of productRows) {
    const route = routeOf(row);
    rowByRoute.set(route, row);
    rowHashByRoute.set(route, hashOf(omit(row, ignoreFields)));
    const category = row[catalog.categoryField] ?? null;
    const member = Object.fromEntries(catalog.membershipFields.map((field) => [field, row[field] ?? null]));
    if (!membershipByCategory.has(category)) membershipByCategory.set(category, []);
    membershipByCategory.get(category).push(member);
  }

  const globalHash = hashOf(Object.fromEntries(Object.entries(globals).map(([table, rows]) => [table, sortRows(rows)])));
  const catalogHash = hashOf([...rowHashByRoute.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const membershipHash = new Map(
    [...membershipByCategory.entries()].map(([category, members]) => [category, hashOf(sortRows(members))]),
  );

  const isProductRoute = (route) => route.startsWith(catalog.routePrefix);

  const fingerprint = (route, deps = []) => {
    if (!isProductRoute(route)) return hashOf({ globalHash, catalogHash });
    const own = rowByRoute.get(route);
    const category = own ? own[catalog.categoryField] ?? null : null;
    return hashOf({
      globalHash,
      own: rowHashByRoute.get(route) ?? null,
      category: own ? membershipHash.get(category) ?? null : null,
      deps: [...deps].sort().map((dep) => [dep, rowHashByRoute.get(dep) ?? null]),
    });
  };

  return { fingerprint, isProductRoute, hasRoute: (route) => rowByRoute.has(route) };
};

/** Empreinte du code exécuté par une page : hash de chaque module des chunks qu'elle a chargés. */
export const codeFingerprint = (moduleIds, moduleHashes) =>
  hashOf([...moduleIds].sort().map((id) => [id, moduleHashes[id] ?? null]));

/** Expiration déterministe : TTL moins une gigue par route, pour étaler les re-rendus. */
export const isExpired = (entry, route, now, { ttlDays, ttlJitterDays = 0 }) => {
  const jitter = (Number.parseInt(hashOf(route).slice(0, 8), 16) / 0xffffffff) * ttlJitterDays;
  const renderedAt = Date.parse(entry.renderedAt);
  if (!Number.isFinite(renderedAt)) return true;
  return now - renderedAt >= (ttlDays - jitter) * DAY_MS;
};

/**
 * Plan du build : pages à rendre (avec raison), pages reprises, entrées à retirer.
 * `full` force tout le rendu (cache absent, version changée, PRERENDER_FULL=1).
 */
export const planRoutes = ({ routes, entries, full, now, ttl, codeFp, dataFp, htmlExists, pruneAllowed = true }) => {
  const render = [];
  const reuse = [];
  const wanted = new Set(routes);

  for (const route of routes) {
    const entry = entries.get(route);
    let reason = null;
    if (full) reason = 'complet';
    else if (!entry) reason = 'nouvelle';
    else if (entry.volatile) reason = 'volatile';
    else if (!htmlExists(entry)) reason = 'cache-incomplet';
    else if (isExpired(entry, route, now, ttl)) reason = 'ttl';
    else if (codeFp(entry.setId) !== entry.codeFp) reason = 'code';
    else if (dataFp(route, entry.deps) !== entry.dataFp) reason = 'donnees';

    if (reason) render.push({ route, reason });
    else reuse.push(route);
  }

  const removed = pruneAllowed ? [...entries.keys()].filter((route) => !wanted.has(route)) : [];
  return { render, reuse, removed };
};

export const summarizeReasons = (render) =>
  Object.entries(
    render.reduce((acc, { reason }) => {
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ');

// ---------------------------------------------------------------------------
// Cache disque (écritures atomiques, une entrée par route : reprise après arrêt)
// ---------------------------------------------------------------------------

const writeAtomic = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
};

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

export const openPrerenderCache = (cacheDir) => {
  const dirs = {
    entries: path.join(cacheDir, 'entries'),
    html: path.join(cacheDir, 'html'),
    sets: path.join(cacheDir, 'sets'),
  };
  const keyOf = (route) => hashOf(route).slice(0, 32);
  const metaFile = path.join(cacheDir, 'meta.json');

  const readMeta = () => readJson(metaFile);

  /** Vide les entrées (jamais le manifeste de modules du build courant). */
  const reset = (meta) => {
    for (const dir of Object.values(dirs)) fs.rmSync(dir, { recursive: true, force: true });
    writeAtomic(metaFile, JSON.stringify(meta));
  };

  const readEntries = () => {
    const entries = new Map();
    if (!fs.existsSync(dirs.entries)) return entries;
    for (const name of fs.readdirSync(dirs.entries)) {
      if (!name.endsWith('.json')) continue;
      const entry = readJson(path.join(dirs.entries, name));
      if (entry?.route) entries.set(entry.route, entry);
    }
    return entries;
  };

  const htmlPath = (entry) => path.join(dirs.html, entry.html);
  const htmlExists = (entry) => Boolean(entry?.html) && fs.existsSync(htmlPath(entry));
  const readHtml = (entry) => fs.readFileSync(htmlPath(entry), 'utf8');

  const readModuleSet = (setId) => readJson(path.join(dirs.sets, `${setId}.json`));
  const writeModuleSet = (moduleIds) => {
    const sorted = [...moduleIds].sort();
    const setId = hashOf(sorted).slice(0, 32);
    const file = path.join(dirs.sets, `${setId}.json`);
    if (!fs.existsSync(file)) writeAtomic(file, JSON.stringify(sorted));
    return setId;
  };

  /** HTML d'abord, entrée ensuite : une entrée présente garantit son HTML. */
  const store = (route, html, entry) => {
    const key = keyOf(route);
    writeAtomic(path.join(dirs.html, `${key}.html`), html);
    writeAtomic(path.join(dirs.entries, `${key}.json`), JSON.stringify({ ...entry, route, html: `${key}.html` }));
  };

  const remove = (route) => {
    const key = keyOf(route);
    fs.rmSync(path.join(dirs.entries, `${key}.json`), { force: true });
    fs.rmSync(path.join(dirs.html, `${key}.html`), { force: true });
  };

  return { readMeta, reset, readEntries, htmlExists, readHtml, readModuleSet, writeModuleSet, store, remove };
};

export const readModuleManifest = (cacheDir) => readJson(path.join(cacheDir, MODULE_MANIFEST_FILE));

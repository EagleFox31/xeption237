/**
 * Migration des images Cloudinary vers Trigenys Storage (R2).
 * Périmètre : products.image + products.images, trade_in_requests.photo_urls (images seulement ;
 * vidéos et archives restent sur Cloudinary). Rien n'est supprimé chez Cloudinary.
 *
 * Essai à blanc (défaut) : inventaire + vérification HEAD, aucune écriture.
 * --apply : par ligne, télécharge chaque source, la convertit en WebP (+ w320/w800 pour les produits),
 *   l'envoie au Worker, puis remplace les URLs de la ligne. Relançable : les URLs déjà migrées sont
 *   ignorées et la table de correspondance (--map) évite de renvoyer une image déjà stockée.
 *
 * Usage :
 *   node scripts/migrate-cloudinary-to-r2.mjs [--scope=products,trocs] [--only=<id>] [--limit=N]
 *     [--out=plan.json] [--map=map.json] [--concurrency=8] [--apply]
 * --apply : clé service via SUPABASE_SERVICE_ROLE_KEY, sinon récupérée par la CLI Supabase connectée
 *   (scripts/lib/serviceRoleKey.mjs) ; jamais affichée ni écrite.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolveServiceRoleKey } from './lib/serviceRoleKey.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env'), quiet: true });

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const APPLY = process.argv.includes('--apply');
const OUT = arg('out', join(tmpdir(), 'cloudinary-r2-plan.json'));
const MAP = arg('map', join(root, 'scripts', '.cloudinary-r2-map.json'));
const CONCURRENCY = Math.max(1, Number(arg('concurrency', 8)) || 8);
const SCOPES = arg('scope', 'products,trocs').split(',').map((s) => s.trim()).filter(Boolean);
const ONLY = arg('only', null);
const LIMIT = Number(arg('limit', 0)) || 0;
const PAGE = 500;

const STORAGE_ORIGIN = (process.env.TRIGENYS_STORAGE_API_URL ||
  'https://trigenys-storage-api.lawrynnjennifer.workers.dev').replace(/\/+$/, '');
const TENANT = 'xeption';
const WEBP_QUALITY = 85;
const VARIANT_WIDTHS = [320, 800];
const WORKER_MAX_BYTES = 8 * 1024 * 1024;

/** Configuration par table : mêmes réglages que l'upload navigateur (services/uploadService.ts). */
const TABLES = {
  products: {
    table: 'products', select: 'id,name,image,images', folder: 'products', maxSide: 2048, variants: true,
    urls: (r) => [r.image, ...(Array.isArray(r.images) ? r.images : [])],
    patch: (r, swap) => ({ image: swap(r.image), images: Array.isArray(r.images) ? r.images.map(swap) : r.images }),
  },
  trocs: {
    table: 'trade_in_requests', select: 'id,device_model,photo_urls', folder: 'trocs', maxSide: 1600, variants: false,
    urls: (r) => (Array.isArray(r.photo_urls) ? r.photo_urls : []),
    patch: (r, swap) => ({ photo_urls: r.photo_urls.map(swap) }),
  },
};

const CLOUDINARY_IMAGE_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i;
const isCloudinaryImage = (u) => typeof u === 'string' && CLOUDINARY_IMAGE_RE.test(u);

/** URL d'origine sans transformation : /upload/<transfos>/v123/... → /upload/v123/... */
const stripTransform = (url) => {
  const [head, tail] = url.split('/upload/');
  if (!tail) return url;
  const segments = tail.split('/');
  const isTransform = (s) => !/^v\d+$/.test(s) && /^[a-z]{1,3}_[^/]*$/.test(s);
  let i = 0;
  while (i < segments.length - 1 && isTransform(segments[i])) i++;
  return `${head}/upload/${segments.slice(i).join('/')}`;
};

/**
 * Sources à essayer, dans l'ordre. L'extension force une conversion (JPEG stocké → .png) que
 * Cloudinary refuse en 400 au-delà de 10 Mo produits ; sans extension il sert le format stocké.
 */
const sourceCandidates = (url) => {
  const source = stripTransform(url);
  const bare = source.replace(/\.[a-z0-9]{3,4}$/i, '');
  return bare === source ? [source] : [source, bare];
};

async function fetchRows(client, cfg) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(cfg.table).select(cfg.select).order('id').range(from, from + PAGE - 1);
    if (ONLY) q = q.eq('id', ONLY);
    const { data, error } = await q;
    if (error) throw new Error(`Lecture ${cfg.table} impossible : ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function probe(url) {
  let last;
  for (const source of sourceCandidates(url)) {
    try {
      const res = await fetch(source, { method: 'HEAD' });
      last = { status: res.status, bytes: Number(res.headers.get('content-length')) || null };
    } catch (e) {
      last = { status: 0, bytes: null, error: String(e?.message || e) };
    }
    if (last.status === 200) break;
  }
  return last;
}

/** Première source qui répond ; null si toutes échouent. */
async function fetchSource(url) {
  for (const source of sourceCandidates(url)) {
    const res = await fetch(source);
    if (res.ok) return res;
  }
  return null;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

const loadMap = () => (existsSync(MAP) ? JSON.parse(readFileSync(MAP, 'utf8')) : {});
const saveMap = (map) => writeFileSync(MAP, JSON.stringify(map, null, 2));

/** Conversion WebP : original borné + variantes plus étroites que l'original. */
async function toWebP(buffer, maxSide, withVariants) {
  const sharp = (await import('sharp')).default;
  const base = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  // Dimensions après rotation EXIF (photos de téléphone en portrait).
  const { width = 0, height = 0 } = meta.autoOrient ?? meta;
  const scale = Math.min(1, maxSide / Math.max(width, height || 1));
  const originalWidth = Math.round(width * scale);
  const original = await base.clone().resize({ width: originalWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY }).toBuffer();
  const variants = [];
  for (const w of withVariants ? VARIANT_WIDTHS : []) {
    if (w >= originalWidth) continue;
    variants.push({ width: w, buffer: await base.clone().resize({ width: w }).webp({ quality: WEBP_QUALITY }).toBuffer() });
  }
  return { original, variants };
}

async function uploadToWorker(secret, folder, { original, variants }) {
  if (original.length > WORKER_MAX_BYTES) throw new Error(`WebP trop lourd (${original.length} o)`);
  const auth = await fetch(`${STORAGE_ORIGIN}/v1/uploads/authorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-tenant-secret': secret },
    body: JSON.stringify({ tenant: TENANT, folder, contentType: 'image/webp', maxBytes: original.length }),
  });
  if (!auth.ok) throw new Error(`Autorisation refusée (${auth.status})`);
  const intent = await auth.json();
  const put = (path, body) => fetch(STORAGE_ORIGIN + path, {
    method: 'PUT',
    headers: { authorization: `Bearer ${intent.token}`, 'content-type': 'image/webp' },
    body,
  });
  const res = await put(intent.uploadUrl, original);
  if (!res.ok) throw new Error(`Envoi refusé (${res.status})`);
  // Variantes facultatives : le Worker sert l'original à leur place si elles manquent.
  const missing = [];
  for (const v of variants) {
    const r = await put(`${intent.uploadUrl}/w${v.width}`, v.buffer).catch(() => null);
    if (!r?.ok) missing.push(v.width);
  }
  return { url: STORAGE_ORIGIN + intent.mediaUrl, missing };
}

async function migrateRow(client, secret, cfg, row, map, dead, stats) {
  for (const raw of cfg.urls(row)) {
    if (!isCloudinaryImage(raw) || map[raw] || dead.has(raw)) continue;
    try {
      const res = await fetchSource(raw);
      if (!res) { dead.add(raw); stats.dead++; continue; }
      const webp = await toWebP(Buffer.from(await res.arrayBuffer()), cfg.maxSide, cfg.variants);
      const { url, missing } = await uploadToWorker(secret, cfg.folder, webp);
      map[raw] = url;
      saveMap(map);
      stats.uploaded++;
      stats.bytesIn += Number(res.headers.get('content-length')) || 0;
      stats.bytesOut += webp.original.length;
      if (missing.length) console.warn(`  variantes manquantes ${missing.join(',')} : ${url}`);
    } catch (e) {
      stats.failed++;
      console.warn(`  échec ${raw} : ${e.message}`);
    }
  }
  const swap = (u) => (typeof u === 'string' && map[u]) || u;
  const patch = cfg.patch(row, swap);
  if (JSON.stringify(patch) === JSON.stringify(cfg.patch(row, (u) => u))) return;

  // Relecture juste avant l'écriture : on ne remplace que si la ligne n'a pas bougé entre-temps.
  const { data: fresh, error } = await client.from(cfg.table).select(cfg.select).eq('id', row.id).maybeSingle();
  if (error || !fresh) { stats.failed++; console.warn(`  relecture ${row.id} impossible : ${error?.message ?? 'ligne introuvable'}`); return; }
  if (JSON.stringify(cfg.urls(fresh)) !== JSON.stringify(cfg.urls(row))) {
    stats.skipped++;
    console.warn(`  ${row.id} modifiée pendant la migration : ignorée (relancer)`);
    return;
  }
  const { error: updateError } = await client.from(cfg.table).update(patch).eq('id', row.id);
  if (updateError) { stats.failed++; console.warn(`  mise à jour ${row.id} : ${updateError.message}`); return; }
  stats.rowsUpdated++;
  console.log(`  ✓ ${cfg.table} ${row.id}`);
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // --apply : clé service résolue à la volée (env, sinon CLI Supabase) ; jamais affichée.
  const serviceKey = APPLY ? resolveServiceRoleKey() : process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) throw new Error('VITE_SUPABASE_URL et une clé Supabase sont requis');
  if (!serviceKey && SCOPES.includes('trocs')) console.warn('Sans clé service, les trocs ne sont pas lisibles (RLS).');
  const client = createClient(supabaseUrl, key, { auth: { persistSession: false } });

  const map = loadMap();
  const plan = { generatedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', scopes: {} };
  let secret = null;
  if (APPLY) {
    const { data, error } = await client.rpc('trigenys_storage_xeption_credential');
    if (error || typeof data !== 'string' || data.length < 32) throw new Error(`Secret de stockage indisponible : ${error?.message ?? 'réponse invalide'}`);
    secret = data;
  }

  for (const scope of SCOPES) {
    const cfg = TABLES[scope];
    if (!cfg) throw new Error(`Périmètre inconnu : ${scope}`);
    let rows = (await fetchRows(client, cfg).catch((e) => { console.warn(e.message); return []; }))
      .filter((r) => cfg.urls(r).some((u) => isCloudinaryImage(u) && !map[u]));
    if (LIMIT) rows = rows.slice(0, LIMIT);

    const urls = [...new Set(rows.flatMap((r) => cfg.urls(r)).filter((u) => isCloudinaryImage(u) && !map[u]))];
    const probes = await mapLimit(urls, CONCURRENCY, (u) => probe(u));
    const dead = new Set(urls.filter((_, i) => probes[i].status !== 200));
    const summary = {
      rows: rows.length,
      urls: urls.length,
      migratable: urls.length - dead.size,
      dead: dead.size,
      sourceMB: Math.round(probes.reduce((s, p) => s + (p.status === 200 ? p.bytes || 0 : 0), 0) / 104857.6) / 10,
      alreadyMapped: Object.keys(map).length,
    };
    plan.scopes[scope] = { summary, dead: [...dead] };
    console.log(`\n[${scope}]`);
    console.table(summary);

    if (APPLY) {
      const stats = { uploaded: 0, rowsUpdated: 0, dead: 0, failed: 0, skipped: 0, bytesIn: 0, bytesOut: 0 };
      for (const row of rows) await migrateRow(client, secret, cfg, row, map, dead, stats);
      stats.MBin = Math.round(stats.bytesIn / 104857.6) / 10;
      stats.MBout = Math.round(stats.bytesOut / 104857.6) / 10;
      delete stats.bytesIn; delete stats.bytesOut;
      plan.scopes[scope].result = stats;
      console.table(stats);
    }
  }

  writeFileSync(OUT, JSON.stringify(plan, null, 2));
  console.log(`\nRapport : ${OUT}${APPLY ? `\nCorrespondances : ${MAP}` : ''}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });

/**
 * Inventaire (essai à blanc) des images produits Cloudinary à migrer vers Trigenys Storage (R2).
 * Lecture seule : aucune écriture en base, chez Cloudinary ou chez Cloudflare.
 * Périmètre : products.images (images uniquement ; vidéos, trocs et archives restent sur Cloudinary).
 * Usage: node scripts/migrate-cloudinary-to-r2.mjs [--out=chemin.json] [--concurrency=8]
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const OUT = arg('out', join(tmpdir(), 'cloudinary-r2-plan.json'));
const CONCURRENCY = Math.max(1, Number(arg('concurrency', 8)) || 8);
const PAGE = 500;

const CLOUDINARY_IMAGE_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i;

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

async function fetchProducts(client) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('products')
      .select('id,name,images')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Lecture products impossible : ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function probe(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return {
      status: res.status,
      bytes: Number(res.headers.get('content-length')) || null,
      type: res.headers.get('content-type'),
    };
  } catch (e) {
    return { status: 0, bytes: null, type: null, error: String(e?.message || e) };
  }
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

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL et une clé Supabase sont requis dans .env');
  const client = createClient(url, key, { auth: { persistSession: false } });

  const products = await fetchProducts(client);
  const byUrl = new Map();
  let otherHosts = 0;
  let alreadyR2 = 0;
  for (const p of products) {
    for (const raw of Array.isArray(p.images) ? p.images : []) {
      if (typeof raw !== 'string' || !raw) continue;
      if (raw.includes('/v1/media/')) { alreadyR2++; continue; }
      if (!CLOUDINARY_IMAGE_RE.test(raw)) { otherHosts++; continue; }
      const source = stripTransform(raw);
      const entry = byUrl.get(raw) ?? { url: raw, source, products: [] };
      entry.products.push(p.id);
      byUrl.set(raw, entry);
    }
  }

  const entries = [...byUrl.values()];
  const probes = await mapLimit(entries, CONCURRENCY, (e) => probe(e.source));
  entries.forEach((e, i) => Object.assign(e, probes[i]));

  const alive = entries.filter((e) => e.status === 200);
  const dead = entries.filter((e) => e.status !== 200);
  const totalBytes = alive.reduce((s, e) => s + (e.bytes || 0), 0);
  const affected = new Set(alive.flatMap((e) => e.products));
  const deadProducts = new Set(dead.flatMap((e) => e.products));

  const plan = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    summary: {
      products: products.length,
      cloudinaryImageUrls: entries.length,
      migratable: alive.length,
      dead: dead.length,
      alreadyR2,
      otherHosts,
      totalMB: Math.round((totalBytes / 1024 / 1024) * 10) / 10,
      productsToUpdate: affected.size,
      productsWithDeadUrls: deadProducts.size,
    },
    migratable: alive.map(({ url, source, bytes, type, products }) => ({ url, source, bytes, type, products })),
    dead: dead.map(({ url, status, error, products }) => ({ url, status, error, products })),
  };

  try { writeFileSync(OUT, JSON.stringify(plan, null, 2)); } catch {
    const { mkdirSync } = await import('fs');
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(plan, null, 2));
  }
  console.table(plan.summary);
  console.log(`Plan écrit : ${OUT}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });

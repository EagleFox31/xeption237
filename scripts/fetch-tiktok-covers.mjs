#!/usr/bin/env node
/**
 * Télécharge et héberge les couvertures des vidéos TikTok citées dans les contenus.
 * Les URL de couverture TikTok sont signées et expirent : on les fige en WebP dans public/.
 *
 * Idempotent : une couverture déjà présente n'est pas retéléchargée (--force pour tout refaire).
 * Usage : node scripts/fetch-tiktok-covers.mjs [--force] [--dry-run]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [join(root, 'content/seo'), join(root, 'constants/contact.ts')];
const OUT_DIR = join(root, 'public/media/tiktok');
const COVER_WIDTH = 480;
const VIDEO_URL = (id) => `https://www.tiktok.com/@xeption_cameroun/video/${id}`;
const ID_PATTERN = /(?:tiktokId:\s*|_VIDEO_ID\s*=\s*)'(\d{15,22})'/g;
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'accept-language': 'fr-FR',
};

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const dryRun = args.has('--dry-run');

const sourceFiles = SOURCES.flatMap((p) =>
  p.endsWith('.ts') ? [p] : readdirSync(p).filter((f) => f.endsWith('.ts')).map((f) => join(p, f)),
);
const ids = [...new Set(sourceFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(ID_PATTERN)].map((m) => m[1])))];

/** URL de couverture lue dans le JSON embarqué de la page publique (pas d'API officielle sans clé). */
const findCoverUrl = async (id) => {
  const html = await (await fetch(VIDEO_URL(id), { headers: BROWSER_HEADERS })).text();
  const match = html.match(/"(?:originCover|cover)":"([^"]+)"/);
  return match ? JSON.parse(`"${match[1]}"`) : null;
};

mkdirSync(OUT_DIR, { recursive: true });
let written = 0;
const failures = [];
for (const id of ids) {
  const target = join(OUT_DIR, `${id}.webp`);
  if (existsSync(target) && !force) continue;
  if (dryRun) { console.log(`[plan] ${id}`); continue; }
  try {
    const coverUrl = await findCoverUrl(id);
    if (!coverUrl) throw new Error('couverture introuvable dans la page');
    const res = await fetch(coverUrl, { headers: BROWSER_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: COVER_WIDTH }).webp({ quality: 78 }).toFile(target);
    written += 1;
    console.log(`[ok] ${id}`);
  } catch (error) {
    failures.push(id);
    console.error(`[échec] ${id}`, error);
  }
}
console.log(`${ids.length} vidéos référencées, ${written} couvertures écrites, ${failures.length} échecs.`);
if (failures.length) process.exitCode = 1;

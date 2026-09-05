/**
 * Fusionne / supprime les imports Mfoundi doublonnés avec l'ancien catalogue.
 * Garde les anciens, supprime l'import (images fusionnées si besoin).
 *
 * Usage:
 *   node scripts/merge-mfoundi-duplicates.mjs --dry-run
 *   node scripts/merge-mfoundi-duplicates.mjs --apply
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY || process.argv.includes('--dry-run');

const PLACEHOLDER = '/icons/icon-192x192.png';

function norm(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholder(url) {
  const raw = (url || '').trim();
  if (!raw) return true;
  if (/placeholder/i.test(raw)) return true;
  if (raw === PLACEHOLDER || raw.endsWith('/icons/icon-192x192.png')) return true;
  return false;
}

function hasRealImage(p) {
  return !isPlaceholder(p.image);
}

function extractStorage(name) {
  const n = norm(name);
  const m =
    n.match(/\b(\d+)\s*(go|gb|giga)\b/) ||
    n.match(/\b(\d+)(go|gb)\b/) ||
    n.match(/\b(\d+)\s*\/\s*(\d+)\s*go/); // 128Go/ 4Go RAM
  if (!m) return null;
  return parseInt(m[1], 10);
}

function parseIphone(name) {
  const n = norm(name);
  if (!n.includes('iphone')) return null;
  if (/\biphone\s*xr\b|\biphone\s*xr\b|^iphone xr/.test(n) || (n.includes('xr') && n.includes('iphone'))) {
    return { kind: 'iphone', xr: true, gen: null, pro: false, max: false };
  }
  const genM = n.match(/iphone\s*(\d{1,2})/);
  const gen = genM ? parseInt(genM[1], 10) : null;
  const max = /pro\s*max|promax/.test(n);
  const pro = !max && (/\bpro\b/.test(n) || /iphone\s*\d+\s*pro\b/.test(n));
  return { kind: 'iphone', xr: false, gen, pro, max };
}

function iphoneEqual(a, b) {
  const pa = parseIphone(a);
  const pb = parseIphone(b);
  if (!pa || !pb) return false;
  if (pa.xr && pb.xr) return true;
  if (pa.xr !== pb.xr) return false;
  return pa.gen === pb.gen && pa.pro === pb.pro && pa.max === pb.max;
}

function parseSamsung(name) {
  const n = norm(name).replace(/galaxy/g, '').trim();
  if (!norm(name).includes('samsung') && !/^s\d/.test(n) && !/^galaxie/.test(norm(name))) {
    if (!/^(s\d|a\d|m\d|z\s)/.test(n) && !norm(name).includes('galaxie')) return null;
  }
  const full = norm(name);
  let model = null;
  if (/z\s*fold\s*(\d+)/.test(full) || /fold\s*(\d+)/.test(full)) {
    const g = full.match(/z\s*fold\s*(\d+)|fold\s*(\d+)/);
    model = `zfold${g[1] || g[2]}`;
  } else if (/z\s*flip\s*(\d+)/.test(full) || /flip\s*(\d+)/.test(full)) {
    const g = full.match(/z\s*flip\s*(\d+)|flip\s*(\d+)/);
    model = `zflip${g[1] || g[2]}`;
  } else if (/s(\d{1,2})\s*\+/.test(full) || /s(\d{1,2})\s*plus/.test(full)) {
    const g = full.match(/s(\d{1,2})\s*\+|s(\d{1,2})\s*plus/);
    model = `s${g[1] || g[2]}plus`;
  } else if (/s(\d{1,2})\s*ultra/.test(full)) {
    const g = full.match(/s(\d{1,2})\s*ultra/);
    model = `s${g[1]}ultra`;
  } else if (/s(\d{1,2})\s*fe/.test(full)) {
    const g = full.match(/s(\d{1,2})\s*fe/);
    model = `s${g[1]}fe`;
  } else if (/s(\d{1,2})\b/.test(full)) {
    const g = full.match(/s(\d{1,2})\b/);
    model = `s${g[1]}`;
  } else if (/a(\d{2,3})\b/.test(full)) {
    const g = full.match(/a(\d{2,3})\b/);
    model = `a${g[1]}`;
  } else if (/m(\d{2,3})\b/.test(full)) {
    const g = full.match(/m(\d{2,3})\b/);
    model = `m${g[1]}`;
  } else if (/note\s*(\d+)/.test(full)) {
    const g = full.match(/note\s*(\d+)/);
    model = `note${g[1]}`;
  } else if (/watch|buds/.test(full)) {
    return { kind: 'samsung-accessory', model: full };
  }
  return model ? { kind: 'samsung', model } : null;
}

function samsungEqual(a, b) {
  const pa = parseSamsung(a);
  const pb = parseSamsung(b);
  if (!pa || !pb) return false;
  if (pa.kind !== pb.kind) return false;
  return pa.model === pb.model;
}

function parsePixel(name) {
  const n = norm(name);
  if (!n.includes('pixel')) return null;
  const m = n.match(/pixel\s*(\d+)\s*(a|pro|xl|fold)?/);
  if (!m) return null;
  const gen = parseInt(m[1], 10);
  let variant = 'base';
  if (n.includes('pro xl') || n.includes('proxl')) variant = 'proxl';
  else if (n.includes(' pro ')) variant = 'pro';
  else if (n.includes(' xl ')) variant = 'xl';
  else if (n.match(/\d+a\b/)) variant = 'a';
  else if (n.includes(' fold')) variant = 'fold';
  return { kind: 'pixel', gen, variant };
}

function pixelEqual(a, b) {
  const pa = parsePixel(a);
  const pb = parsePixel(b);
  if (!pa || !pb) return false;
  return pa.gen === pb.gen && pa.variant === pb.variant;
}

function parseXiaomi(name) {
  const n = norm(name);
  if (!n.includes('redmi') && !n.includes('xiaomi') && !n.includes('poco')) return null;
  const note = n.match(/redmi\s*note\s*(\d+\s*pro\+?|\d+)/);
  if (note) return { kind: 'redmi-note', model: norm(note[0]) };
  const redmi = n.match(/redmi\s*([a-z0-9\s]+?)(?:\s+\d+\s*go|\s+\d+$|$)/);
  if (redmi) return { kind: 'redmi', model: norm(redmi[0].slice(0, 30)) };
  return { kind: 'xiaomi', model: n.slice(0, 40) };
}

function xiaomiEqual(a, b) {
  const pa = parseXiaomi(a);
  const pb = parseXiaomi(b);
  if (!pa || !pb) return false;
  return pa.kind === pb.kind && pa.model === pb.model;
}

function parseInfinix(name) {
  const n = norm(name);
  if (!n.includes('infinix') && !n.includes('hot ') && !n.includes('smart ')) return null;
  const hot = n.match(/hot\s*(\d+[a-z]*(?:\s*pro\+?)?)/);
  if (hot) return { kind: 'infinix', model: `hot${norm(hot[1])}` };
  const smart = n.match(/smart\s*(\d+[a-z]*)/);
  if (smart) return { kind: 'infinix', model: `smart${smart[1]}` };
  return { kind: 'infinix', model: n.slice(0, 35) };
}

function infinixEqual(a, b) {
  const pa = parseInfinix(a);
  const pb = parseInfinix(b);
  if (!pa || !pb) return false;
  return pa.model === pb.model;
}

function parseTecno(name) {
  const n = norm(name);
  if (!n.includes('tecno') && !n.includes('spark') && !n.includes('pop ')) return null;
  const spark = n.match(/spark\s*(\d+)/);
  if (spark) return { kind: 'tecno', model: `spark${spark[1]}` };
  const pop = n.match(/pop\s*(\d+)/);
  if (pop) return { kind: 'tecno', model: `pop${pop[1]}` };
  return { kind: 'tecno', model: n.slice(0, 35) };
}

function tecnoEqual(a, b) {
  const pa = parseTecno(a);
  const pb = parseTecno(b);
  if (!pa || !pb) return false;
  return pa.model === pb.model;
}

function modelsMatch(importName, legacyName) {
  if (iphoneEqual(importName, legacyName)) return true;
  if (samsungEqual(importName, legacyName)) return true;
  if (pixelEqual(importName, legacyName)) return true;
  if (xiaomiEqual(importName, legacyName)) return true;
  if (infinixEqual(importName, legacyName)) return true;
  if (tecnoEqual(importName, legacyName)) return true;
  return false;
}

function storageMatch(importName, legacyName, singleCandidate = false) {
  const si = extractStorage(importName);
  const sl = extractStorage(legacyName);
  if (si == null) return true;
  if (sl != null) return si === sl;
  const n = norm(legacyName);
  if (
    n.includes(`${si} go`) ||
    n.includes(`${si}go`) ||
    n.includes(`${si} gb`) ||
    n.includes(`${si}gb`) ||
    n.includes(`${si} giga`)
  ) {
    return true;
  }
  // Un seul ancien pour ce modèle : on fusionne (stockage souvent absent du titre legacy)
  return singleCandidate;
}

function isImportProduct(p) {
  return (p.description || '').toLowerCase().includes('mfoundi mall');
}

function pickBestLegacy(candidates) {
  return [...candidates].sort((a, b) => {
    const imgA = hasRealImage(a) ? 1 : 0;
    const imgB = hasRealImage(b) ? 1 : 0;
    if (imgB !== imgA) return imgB - imgA;
    return (b.stock || 0) - (a.stock || 0);
  })[0];
}

function mergeGallery(legacy, importP) {
  const gallery = [...(legacy.images || [])];
  const add = (url) => {
    if (!url || isPlaceholder(url) || gallery.includes(url)) return;
    gallery.push(url);
  };
  (importP.images || []).forEach(add);
  if (hasRealImage(importP) && importP.image !== legacy.image) add(importP.image);
  return gallery;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');

  const supabase = createClient(url, key);
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) throw error;

  const imports = products.filter(isImportProduct);
  const legacy = products.filter((p) => !isImportProduct(p));

  const actions = { merged: [], deleted: [], kept: [], ask: [] };

  for (const imp of imports) {
    const modelCandidates = legacy.filter((leg) => modelsMatch(imp.name, leg.name));
    const candidates = modelCandidates.filter((leg) =>
      storageMatch(imp.name, leg.name, modelCandidates.length === 1),
    );

    if (candidates.length === 0) {
      actions.kept.push({ import: imp.name, reason: 'aucun ancien équivalent' });
      continue;
    }

    if (candidates.length > 1) {
      const best = pickBestLegacy(candidates);
      const dupLegacy = candidates.filter((c) => c.id !== best.id);
      if (dupLegacy.length > 0) {
        actions.ask.push({
          import: imp.name,
          importId: imp.id,
          reason: `${candidates.length} fiches anciennes doublons — fusion sur la meilleure`,
          keepLegacy: { id: best.id, name: best.name, stock: best.stock },
          duplicateLegacies: dupLegacy.map((c) => ({
            id: c.id,
            name: c.name,
            stock: c.stock,
          })),
        });
      }
      candidates.splice(0, candidates.length, best);
    }

    const leg = pickBestLegacy(candidates);

    const updates = {
      price: imp.price,
      warranty_months: imp.warranty_months ?? leg.warranty_months,
    };

    const legImg = hasRealImage(leg);
    const impImg = hasRealImage(imp);

    if (!legImg && impImg) updates.image = imp.image;
    updates.images = mergeGallery(leg, imp);

    if (imp.specs && JSON.stringify(imp.specs).length > JSON.stringify(leg.specs || []).length) {
      updates.specs = imp.specs;
    }

    const action = {
      import: imp.name,
      importId: imp.id,
      legacy: leg.name,
      legacyId: leg.id,
      mergedImages: !legImg && impImg,
      updates,
    };

    if (DRY) {
      actions.merged.push(action);
      continue;
    }

    const { error: upErr } = await supabase
      .from('products')
      .update(updates)
      .eq('id', leg.id);
    if (upErr) {
      actions.ask.push({
        import: imp.name,
        reason: `échec update: ${upErr.message}`,
      });
      continue;
    }

    const { error: delErr } = await supabase.from('products').delete().eq('id', imp.id);
    if (delErr) {
      actions.ask.push({
        import: imp.name,
        reason: `échec delete: ${delErr.message}`,
      });
      continue;
    }

    actions.merged.push(action);
    actions.deleted.push(imp.id);
  }

  const report = {
    mode: DRY ? 'dry-run' : 'applied',
    at: new Date().toISOString(),
    importTotal: imports.length,
    merged: actions.merged.length,
    deleted: actions.deleted.length,
    kept: actions.kept.length,
    ask: actions.ask.length,
    details: actions,
  };

  const out = join(root, 'data/mfoundi-merge-actions.json');
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Mode: ${report.mode}`);
  console.log(`Fusion/suppression: ${report.merged} | Conservés (import seul): ${report.kept} | À clarifier: ${report.ask}`);
  console.log(`Report: ${out}`);

  if (actions.ask.length) {
    console.log('\n--- Cas à clarifier ---');
    for (const a of actions.ask) {
      console.log(`• ${a.import}: ${a.reason}`);
      if (a.candidates) console.log('  ', a.candidates.map((c) => c.name).join(' | '));
      if (a.legacy) console.log(`  ancien: ${a.legacy}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

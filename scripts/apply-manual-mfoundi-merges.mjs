/**
 * Fusion manuelle selon règles utilisateur (variantes stockage, titres legacy).
 * Usage: node scripts/apply-manual-mfoundi-merges.mjs [--dry-run]
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const DRY = process.argv.includes('--dry-run');

const PLACEHOLDER = '/icons/icon-192x192.png';

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

function isImportProduct(p) {
  return (p.description || '').toLowerCase().includes('mfoundi mall');
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

function hasStorageInName(name) {
  return /\d+\s*(go|gb|giga)/i.test(name) || /\d+(go|gb)/i.test(name);
}

function ensureStorageInName(name, storageGb) {
  const n = name || '';
  const re = new RegExp(`\\b${storageGb}\\s*(go|gb|giga)\\b`, 'i');
  if (re.test(n)) return n.trim();
  return `${n.trim()} ${storageGb} Go`.replace(/\s+/g, ' ').trim();
}

function findImport(products, pattern) {
  return products.find(
    (p) => isImportProduct(p) && pattern.test(p.name),
  );
}

function findLegacy(products, pattern) {
  return products.find((p) => !isImportProduct(p) && pattern.test(p.name));
}

async function mergePair(supabase, legacy, imp, legacyUpdates, log) {
  const updates = {
    ...legacyUpdates,
    price: imp.price,
    warranty_months: imp.warranty_months ?? legacy.warranty_months,
    images: mergeGallery(legacy, imp),
  };

  const legImg = hasRealImage(legacy);
  const impImg = hasRealImage(imp);
  if (!legImg && impImg) updates.image = imp.image;

  if (
    imp.specs &&
    JSON.stringify(imp.specs).length > JSON.stringify(legacy.specs || []).length
  ) {
    updates.specs = imp.specs;
  }

  log.push({
    action: 'merge',
    import: imp.name,
    importId: imp.id,
    legacy: legacy.name,
    legacyId: legacy.id,
    newName: updates.name,
    updates,
  });

  if (DRY) return;

  const { error: upErr } = await supabase.from('products').update(updates).eq('id', legacy.id);
  if (upErr) throw new Error(`update ${legacy.id}: ${upErr.message}`);

  const { error: delErr } = await supabase.from('products').delete().eq('id', imp.id);
  if (delErr) throw new Error(`delete ${imp.id}: ${delErr.message}`);
}

async function deleteImportOnly(supabase, imp, reason, log) {
  log.push({ action: 'delete_import', import: imp.name, importId: imp.id, reason });
  if (DRY) return;
  const { error } = await supabase.from('products').delete().eq('id', imp.id);
  if (error) throw new Error(`delete ${imp.id}: ${error.message}`);
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');

  const supabase = createClient(url, key);
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) throw error;

  const log = [];

  // iPhone 13 128 → legacy "Iphone 13" (sans stockage dans titre), titre + specs import
  const imp13_128 = findImport(products, /iphone\s*13\s+128/i);
  const leg13 = findLegacy(products, /^iphone\s*13$/i);
  if (imp13_128 && leg13) {
    await mergePair(supabase, leg13, imp13_128, {
      name: ensureStorageInName(leg13.name, 128),
    }, log);
  } else {
    log.push({
      action: 'skip',
      reason: 'iPhone 13 128',
      missing: !imp13_128 ? 'import' : 'legacy Iphone 13',
    });
  }

  // XR 64 → legacy iPhone XR sans stockage, ajouter 64 Go au titre
  const impXr64 = findImport(products, /iphone\s*xr\s+64/i);
  const legXrFound = products.find(
    (p) =>
      !isImportProduct(p) &&
      /^iphone\s*xr\s*$/i.test(p.name.trim()) &&
      !/\d+\s*(go|gb|giga)/i.test(p.name),
  );
  if (impXr64 && legXrFound) {
    await mergePair(supabase, legXrFound, impXr64, {
      name: ensureStorageInName(legXrFound.name, 64),
    }, log);
  } else {
    log.push({
      action: 'skip',
      reason: 'XR 64',
      missing: !impXr64 ? 'import' : 'legacy iPhone XR',
    });
  }

  // 12 Pro Max 128 → legacy IPHONE 12 PRO MAX, ajouter stockage au titre
  const imp12pm128 = findImport(products, /iphone\s*12\s*pro\s*max\s+128/i);
  const leg12pmCandidates = products.filter(
    (p) =>
      !isImportProduct(p) &&
      /12\s*pro\s*max/i.test(p.name) &&
      !hasStorageInName(p.name),
  );
  const leg12pm =
    leg12pmCandidates.find((p) => /^iphone\s*12\s*pro\s*max$/i.test(p.name.trim())) ||
    leg12pmCandidates[0];
  if (imp12pm128 && leg12pm) {
    await mergePair(supabase, leg12pm, imp12pm128, {
      name: ensureStorageInName(leg12pm.name, 128),
    }, log);
  } else {
    log.push({
      action: 'skip',
      reason: '12 Pro Max 128',
      missing: !imp12pm128 ? 'import' : 'legacy 12 Pro Max sans stockage',
      leg12pm: leg12pm?.name,
    });
  }

  // A07 : garder legacy, supprimer imports doublons (sans fusion)
  for (const imp of products.filter((p) => isImportProduct(p) && /galaxy\s*a07/i.test(p.name))) {
    await deleteImportOnly(supabase, imp, 'garder legacy A07 — import supprimé', log);
  }

  // iPhone 11 64 : rien (gardé comme import seul)
  log.push({ action: 'keep', import: 'Apple iPhone 11 64 Go', reason: 'pas de legacy' });

  const out = join(root, 'data/mfoundi-manual-merge-log.json');
  writeFileSync(
    out,
    JSON.stringify({ mode: DRY ? 'dry-run' : 'applied', at: new Date().toISOString(), log }, null, 2),
    'utf8',
  );

  console.log(`Mode: ${DRY ? 'dry-run' : 'applied'}`);
  for (const e of log) {
    if (e.action === 'merge') {
      console.log(`✓ Fusion: ${e.import} → ${e.legacy} (${e.newName || 'nom inchangé'})`);
    } else if (e.action === 'delete_import') {
      console.log(`✗ Suppression import (legacy gardé): ${e.import}`);
    } else if (e.action === 'keep') {
      console.log(`○ Conservé: ${e.import || e.reason}`);
    } else {
      console.log(`? Skip ${e.reason}: ${e.missing}`);
    }
  }
  console.log(`Log: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

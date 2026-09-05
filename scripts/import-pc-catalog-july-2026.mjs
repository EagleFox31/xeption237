/**
 * Upload les galeries présentes dans data/laptop puis importe le catalogue PC.
 *
 * Sécurité :
 * - sans --apply : préflight local uniquement, aucune écriture ;
 * - avec --apply : refuse de démarrer si une image ou un champ catalogue manque ;
 * - les images sont toutes uploadées avant la première écriture Supabase.
 *
 * Usage :
 *   node scripts/import-pc-catalog-july-2026.mjs
 *   node scripts/import-pc-catalog-july-2026.mjs --apply
 *   node scripts/import-pc-catalog-july-2026.mjs --apply --images-dir=C:/chemin/images
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { PC_CATALOG_JULY_2026 } from '../data/pc-catalog-july-2026.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
dotenv.config({ path: join(root, '.env') });

const APPLY = process.argv.includes('--apply');
const REUSE_UPLOADED = process.argv.includes('--reuse-uploaded');
const imagesDirArg = process.argv.find((arg) => arg.startsWith('--images-dir='));
const rawImagesDir = imagesDirArg?.slice('--images-dir='.length) || 'data/laptop';
const imagesDir = isAbsolute(rawImagesDir) ? rawImagesDir : resolve(root, rawImagesDir);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const CLOUDINARY_CLOUD_NAME = 'dli0kdkg9';
const CLOUDINARY_UPLOAD_PRESET = 'xeption_preset';
const CLOUDINARY_FOLDER = 'xeption';
const MIN_IMAGE_BYTES = 4_000;
const RECOMMENDED_IMAGE_BYTES = 10_000;
const SUPPORTED_EXTENSIONS = new Set(['.avif', '.jpg', '.jpeg', '.png', '.webp']);
const INVALID_IMAGE_FILES = new Set(['hp-laptop-14s-8.png']);

const IMAGE_GROUPS = {
  'lenovo-300e-128-4': {
    main: 'lenovo-300e.png',
    prefixes: ['lenovo-300e', 'lenovo-laptop-300e'],
  },
  'dell-latitude-5310-2in1-i5-16-512': {
    main: 'dell-5310.png',
    prefixes: ['dell-5310'],
  },
  'dell-latitude-3190-4-128': {
    main: 'dell-3190.jpg',
    prefixes: ['dell-3190'],
  },
  'hp-probook-445-g8-ryzen3-8-256': {
    main: 'hp-445-g8.png',
    prefixes: ['hp-445-g8'],
  },
  'dell-latitude-5510-i5-16-512': {
    main: 'dell-5510.png',
    prefixes: ['dell-5510'],
  },
  'microsoft-surface-pro-3-i5-8-256': {
    main: 'surface-pro3.png',
    prefixes: ['surface-pro3'],
  },
  'dell-latitude-5530-i7-16-512': {
    main: 'dell-5530.png',
    prefixes: ['dell-5530'],
  },
  'lenovo-thinkpad-13-i5-8-256': {
    main: 'lenovo-thinkpad-13.png',
    prefixes: ['lenovo-thinkpad-13'],
  },
  'lenovo-thinkpad-e495-ryzen3-16-256': {
    main: 'Lenovo-ThinkPad-E495.png',
    prefixes: ['lenovo-thinkpad-e495'],
  },
  'dell-latitude-5580-i5-8-256': {
    main: 'dell-5580.webp',
    prefixes: ['dell-5580'],
  },
  'lenovo-thinkpad-a485-ryzen5pro-8-256': {
    main: 'Lenovo-ThinkPad-A485.webp',
    prefixes: ['lenovo-thinkpad-a485'],
  },
  'hp-elitebook-840-g5-i5-8-256': {
    main: 'hp-840-g5.png',
    prefixes: ['hp-840-g5'],
  },
  'hp-elitebook-x360-830-g6-i5-16-256': {
    main: 'hp-830-g6.jpg',
    prefixes: ['hp-830-g6'],
  },
  'hp-mt43-8-256': {
    main: 'hp-mt43.png',
    prefixes: ['hp-mt43'],
  },
  'hp-elitebook-820-g3-i5-8-500': {
    main: 'hp-820-g3.webp',
    prefixes: ['hp-820-g3'],
  },
  'hp-elitebook-850-g6-i5-16-256': {
    main: 'hp-850-g6-i5.png',
    prefixes: ['hp-850-g6-i5'],
    extraFiles: ['hp-850-g6.png', 'hp-850-g6-4.png'],
  },
  'hp-elitebook-850-g6-i7-touch-16-512': {
    main: 'hp-850-g6-i7.png',
    prefixes: ['hp-850-g6-i7'],
  },
  'hp-elitebook-745-g6-ryzen3pro-16-256': {
    main: 'hp-745-g6.png',
    prefixes: ['hp-745-g6'],
  },
  'hp-elitebook-840-g2-i5-8-256': {
    main: 'hp-840-g2.png',
    prefixes: ['hp-840-g2'],
  },
  'hp-elitebook-745-g2-amd-8-256': {
    main: 'hp-745-g2.png',
    prefixes: ['hp-745-g2'],
  },
  'hp-elite-x2-1012-g1-m5-8-256': {
    main: 'hp-elite-x2-1012-g1png.jpg',
    prefixes: ['hp-elite-x2-1012-g1'],
  },
  'hp-probook-x360-11-g2-ee-4-256': {
    main: 'hp-probook-x360-11-g2-ee.png',
    prefixes: ['hp-probook-x360-11-g2-ee'],
  },
  'hp-probook-430-g3-i3-8-500': {
    main: 'hp-probook-430-g3.png',
    prefixes: ['hp-probook-430-g3'],
  },
  'hp-probook-445-g6-ryzen5-8-256': {
    main: 'hp-probook-445-g6.png',
    prefixes: ['hp-probook-445-g6'],
  },
  'hp-probook-440-g8-i5-16-256': {
    main: 'hp-probook-440-g8.png',
    prefixes: ['hp-probook-440-g8'],
  },
  'hp-laptop-14s-i7-8-256': {
    main: 'hp-laptop-14s.png',
    prefixes: ['hp-laptop-14s'],
  },
};

const DELL_3190_KEEP_ID = 'bd1ae261-30aa-4bf4-afca-8ae3e0dc8dad';
const DELL_3190_DELETE_ID = '4e3320ab-3c34-42d8-930d-601158f21895';

const requiredText = [
  'key',
  'name',
  'brandSlug',
  'brandName',
  'rangeSlug',
  'rangeName',
  'description',
  'reviewShort',
  'imageFile',
];

function validateCatalog() {
  const errors = [];
  const names = new Set();
  const imageFiles = new Set();

  if (PC_CATALOG_JULY_2026.length !== 26) {
    errors.push(`26 fiches attendues, ${PC_CATALOG_JULY_2026.length} trouvées.`);
  }

  for (const [index, product] of PC_CATALOG_JULY_2026.entries()) {
    const label = `Fiche ${index + 1} (${product.name || product.key || '?'})`;

    for (const field of requiredText) {
      if (!String(product[field] || '').trim()) errors.push(`${label}: ${field} manquant.`);
    }
    if (product.category !== 'computer') errors.push(`${label}: category doit être "computer".`);
    if (product.condition !== 'refurbished') {
      errors.push(`${label}: condition doit être "refurbished".`);
    }
    if (!Number.isInteger(product.price) || product.price <= 0) {
      errors.push(`${label}: prix invalide.`);
    }
    if (product.stock !== 10) errors.push(`${label}: stock doit être 10.`);
    if (product.warrantyMonths !== 3) errors.push(`${label}: garantie doit être 3 mois.`);
    if (
      !Number.isInteger(product.releaseYear) ||
      product.releaseYear < 1995 ||
      product.releaseYear > 2100
    ) {
      errors.push(`${label}: releaseYear invalide.`);
    }
    if (product.description.trim().length < 120) {
      errors.push(`${label}: description trop courte.`);
    }
    if (!Array.isArray(product.specs) || product.specs.length < 6) {
      errors.push(`${label}: au moins 6 specs requises.`);
    }
    if (product.specs?.some((spec) => !spec?.label?.trim() || !spec?.value?.trim())) {
      errors.push(`${label}: spec vide.`);
    }
    if (!Array.isArray(product.pros) || product.pros.length !== 3) {
      errors.push(`${label}: exactement 3 avantages requis.`);
    }
    if (!Array.isArray(product.cons) || product.cons.length !== 2) {
      errors.push(`${label}: exactement 2 limites requises.`);
    }
    if (names.has(product.name)) errors.push(`${label}: nom dupliqué.`);
    if (imageFiles.has(product.imageFile)) errors.push(`${label}: imageFile dupliqué.`);
    names.add(product.name);
    imageFiles.add(product.imageFile);
  }

  return errors;
}

function getSourceFiles() {
  if (!existsSync(imagesDir)) return [];
  return readdirSync(imagesDir).filter((fileName) =>
    SUPPORTED_EXTENSIONS.has(extname(fileName).toLowerCase()),
  );
}

function getProductImageFiles(product, sourceFiles) {
  const group = IMAGE_GROUPS[product.key];
  if (!group) return [];

  const prefixes = group.prefixes.map((prefix) => prefix.toLowerCase());
  const extraFiles = new Set((group.extraFiles || []).map((fileName) => fileName.toLowerCase()));
  const matches = sourceFiles.filter((fileName) => {
    const lowerName = fileName.toLowerCase();
    return prefixes.some((prefix) => lowerName.startsWith(prefix)) || extraFiles.has(lowerName);
  });
  matches.sort((a, b) => {
    if (a.toLowerCase() === group.main.toLowerCase()) return -1;
    if (b.toLowerCase() === group.main.toLowerCase()) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  return matches.map((fileName, index) => ({
    fileName,
    publicId: `${product.key}-${String(index + 1).padStart(2, '0')}`,
  }));
}

function validateImages() {
  const errors = [];
  const warnings = [];
  let validCount = 0;
  const sourceFiles = getSourceFiles();
  const assignedFiles = new Set();

  for (const product of PC_CATALOG_JULY_2026) {
    const imageFiles = getProductImageFiles(product, sourceFiles);
    const group = IMAGE_GROUPS[product.key];
    if (!group) {
      errors.push(`Correspondance images absente : ${product.key}`);
      continue;
    }
    if (imageFiles.length < 3) {
      errors.push(`${product.name}: 3 images minimum, ${imageFiles.length} trouvée(s).`);
    }
    if (
      imageFiles[0]?.fileName.toLowerCase() !== group.main.toLowerCase()
    ) {
      errors.push(`${product.name}: image principale introuvable (${group.main}).`);
    }

    for (const imageFile of imageFiles) {
      assignedFiles.add(imageFile.fileName.toLowerCase());
      const imagePath = join(imagesDir, imageFile.fileName);
      if (!existsSync(imagePath)) {
        errors.push(`Image manquante : ${imageFile.fileName}`);
        continue;
      }
      const size = statSync(imagePath).size;
      if (size < MIN_IMAGE_BYTES) {
        errors.push(`Image trop petite ou invalide (${size} octets) : ${imageFile.fileName}`);
        continue;
      }
      if (size < RECOMMENDED_IMAGE_BYTES) {
        warnings.push(`Image légère (${size} octets) : ${imageFile.fileName}`);
      }
      validCount += 1;
    }
  }

  const unassignedFiles = sourceFiles.filter(
    (fileName) => !assignedFiles.has(fileName.toLowerCase()),
  );
  if (unassignedFiles.length > 0) {
    warnings.push(`Fichiers non attribués : ${unassignedFiles.join(', ')}`);
  }

  return { errors, warnings, validCount, sourceFiles };
}

async function uploadImage(imageFile) {
  const imagePath = join(imagesDir, imageFile.fileName);
  const bytes = readFileSync(imagePath);
  const form = new FormData();
  const mimeTypes = {
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const extension = extname(imageFile.fileName).toLowerCase();
  form.append(
    'file',
    new Blob([bytes], { type: mimeTypes[extension] || 'application/octet-stream' }),
    imageFile.fileName,
  );
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', CLOUDINARY_FOLDER);
  form.append('public_id', imageFile.publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );
  const payload = await response.json();
  if (!response.ok || !payload.secure_url) {
    throw new Error(
      `Cloudinary ${imageFile.fileName}: ${payload?.error?.message || response.status}`,
    );
  }
  return payload.secure_url;
}

function getUploadedImageUrl(imageFile) {
  const extension = extname(imageFile.fileName).toLowerCase();
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${CLOUDINARY_FOLDER}/${imageFile.publicId}${extension}`;
}

async function ensureBrand(supabase, slug, name) {
  const { data: existing, error: readError } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('brands')
    .insert({ slug, name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureRange(supabase, brandId, slug, name) {
  const { data: existing, error: readError } = await supabase
    .from('product_ranges')
    .select('id')
    .eq('brand_id', brandId)
    .eq('slug', slug)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('product_ranges')
    .insert({
      brand_id: brandId,
      slug,
      name,
      category: 'computer',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function findExistingProduct(supabase, product) {
  if (product.existingId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.existingId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('name', product.name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function mergeLegacyDell3190(supabase, dellBrandId, latitudeRangeId) {
  const { data: rows, error: readError } = await supabase
    .from('products')
    .select('id,stock')
    .in('id', [DELL_3190_KEEP_ID, DELL_3190_DELETE_ID]);
  if (readError) throw readError;

  const keep = rows?.find((row) => row.id === DELL_3190_KEEP_ID);
  const duplicate = rows?.find((row) => row.id === DELL_3190_DELETE_ID);
  if (!keep && !duplicate) return { merged: false, reason: 'déjà supprimés/absents' };

  if (keep && duplicate) {
    const mergedStock = Math.max(0, Number(keep.stock) || 0) + Math.max(0, Number(duplicate.stock) || 0);
    const { error: updateError } = await supabase
      .from('products')
      .update({
        name: 'Dell Latitude 3190 2-en-1 tactile',
        stock: mergedStock,
        warranty_months: 3,
        brand: dellBrandId,
        product_range: latitudeRangeId,
        release_year: 2018,
      })
      .eq('id', keep.id);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', duplicate.id);
    if (deleteError) throw deleteError;
    return { merged: true, stock: mergedStock };
  }

  const survivor = keep || duplicate;
  const { error: updateError } = await supabase
    .from('products')
    .update({
      name: 'Dell Latitude 3190 2-en-1 tactile',
      warranty_months: 3,
      brand: dellBrandId,
      product_range: latitudeRangeId,
      release_year: 2018,
    })
    .eq('id', survivor.id);
  if (updateError) throw updateError;
  return { merged: false, reason: 'un seul ancien enregistrement présent' };
}

const catalogErrors = validateCatalog();
const {
  errors: imageErrors,
  warnings: imageWarnings,
  validCount,
  sourceFiles,
} = validateImages();
const errors = [...catalogErrors, ...imageErrors];

console.log(`Catalogue : ${PC_CATALOG_JULY_2026.length} fiches`);
console.log(`Dossier images : ${imagesDir}`);
console.log(`Images valides : ${validCount}/${sourceFiles.length}`);
for (const warning of imageWarnings) console.warn(`Avertissement : ${warning}`);

if (errors.length > 0) {
  console.error('\nPréflight refusé :');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else if (!APPLY) {
  console.log('\n✓ Préflight OK. Relancer avec --apply pour uploader et importer.');
} else {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Identifiants Supabase manquants dans .env.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('\nUpload Cloudinary…');
  const imageUrls = new Map();
  let uploadedCount = 0;
  for (const [index, product] of PC_CATALOG_JULY_2026.entries()) {
    const urls = [];
    for (const imageFile of getProductImageFiles(product, sourceFiles)) {
      if (INVALID_IMAGE_FILES.has(imageFile.fileName)) {
        console.warn(`Image invalide ignorée : ${imageFile.fileName}`);
        continue;
      }
      if (REUSE_UPLOADED) {
        urls.push(getUploadedImageUrl(imageFile));
        uploadedCount += 1;
        console.log(`[${uploadedCount}/${validCount - INVALID_IMAGE_FILES.size}] réutilisée ${imageFile.fileName}`);
        continue;
      }
      try {
        urls.push(await uploadImage(imageFile));
        uploadedCount += 1;
        console.log(`[${uploadedCount}/${validCount}] ${imageFile.fileName}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid image file')) {
          console.warn(`Image ignorée par Cloudinary : ${imageFile.fileName}`);
          continue;
        }
        throw error;
      }
    }
    if (urls.length < 3) {
      throw new Error(`${product.name}: moins de 3 images Cloudinary valides.`);
    }
    imageUrls.set(product.key, urls);
    console.log(`Galerie ${index + 1}/26 prête : ${product.name}`);
  }

  const brandIds = new Map();
  const rangeIds = new Map();
  for (const product of PC_CATALOG_JULY_2026) {
    if (!brandIds.has(product.brandSlug)) {
      brandIds.set(
        product.brandSlug,
        await ensureBrand(supabase, product.brandSlug, product.brandName),
      );
    }
    const brandId = brandIds.get(product.brandSlug);
    const rangeKey = `${product.brandSlug}:${product.rangeSlug}`;
    if (!rangeIds.has(rangeKey)) {
      rangeIds.set(
        rangeKey,
        await ensureRange(supabase, brandId, product.rangeSlug, product.rangeName),
      );
    }
  }

  console.log('\nImport Supabase…');
  let created = 0;
  let updated = 0;

  for (const [index, product] of PC_CATALOG_JULY_2026.entries()) {
    const existing = await findExistingProduct(supabase, product);
    const id = existing?.id || crypto.randomUUID();
    const generatedGallery = imageUrls.get(product.key);
    const image = generatedGallery[0];
    const existingGallery = Array.isArray(existing?.images) ? existing.images : [];
    const gallery = [
      ...generatedGallery,
      ...existingGallery.filter(
        (url) => url && url !== existing?.image && !generatedGallery.includes(url),
      ),
    ];
    const reviews = Array.isArray(existing?.reviews) ? existing.reviews : [];
    const rating = reviews.length > 0 ? existing?.rating ?? null : null;
    const brandId = brandIds.get(product.brandSlug);
    const rangeId = rangeIds.get(`${product.brandSlug}:${product.rangeSlug}`);

    const payload = {
      id,
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      category: product.category,
      image,
      images: gallery,
      video: existing?.video || product.video,
      stock: product.stock,
      isPromo: product.isPromo,
      rating,
      reviewShort: product.reviewShort,
      specs: product.specs,
      pros: product.pros,
      cons: product.cons,
      reviews,
      warranty_months: product.warrantyMonths,
      is_featured: product.isFeatured,
      brand: brandId,
      product_range: rangeId,
      condition: product.condition,
      release_year: product.releaseYear,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from('products').upsert(payload);
    if (upsertError) throw new Error(`${product.name}: ${upsertError.message}`);
    if (existing) updated += 1;
    else created += 1;
    console.log(`[${index + 1}/26] ${existing ? 'MAJ' : 'CRÉÉ'} ${product.name}`);
  }

  const dellBrandId = brandIds.get('dell');
  const latitudeRangeId = rangeIds.get('dell:dell-latitude');
  const mergeResult = await mergeLegacyDell3190(supabase, dellBrandId, latitudeRangeId);

  const { count: importedCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'computer')
    .not('brand', 'is', null)
    .not('product_range', 'is', null);
  if (countError) throw countError;

  console.log('\n✓ Import terminé');
  console.log(`Créés : ${created}`);
  console.log(`Mis à jour : ${updated}`);
  console.log(`Fusion Dell 3190 : ${JSON.stringify(mergeResult)}`);
  console.log(`PC avec marque + gamme en BD : ${importedCount}`);
}

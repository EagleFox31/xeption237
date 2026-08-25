import type { Brand, Product, ProductRange } from '../types';
import { supabase } from './supabaseClient';
import { DB_TABLES, DB_SCHEMA } from '../constants/dbSchema';
import { generateProductDetails } from './aiProductDetailsService';
import type { ProductEnricherField } from './personas/productEnricher';
import {
  parseJsonDraftList,
  parseMfoundiCatalog,
  type IngestProductDraft,
  type MfoundiCatalogJson,
  DEFAULT_INGEST_IMAGE,
} from '../utils/mfoundiCatalogParser';
import { findDuplicateProduct } from '../utils/productDuplicate';
import { isWeakProductDescription } from '../utils/productDescription';
import { productNeedsAiEnrichment } from '../utils/productIngestionNeeds';

export type IngestionProgress = {
  step: 'upsert' | 'enrich';
  index: number;
  total: number;
  name: string;
  status: 'running' | 'ok' | 'skipped' | 'error';
  message?: string;
};

export type IngestionFunnelReport = {
  created: number;
  updated: number;
  enriched: number;
  skipped: number;
  errors: Array<{ name: string; step: string; error: string }>;
};

export type IngestionFunnelOptions = {
  enrichWithAi?: boolean;
  enrichDelayMs?: number;
  updateDuplicates?: boolean;
  onProgress?: (progress: IngestionProgress) => void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureBrand(slug: string, name: string): Promise<string> {
  const { data: existing } = await supabase
    .from(DB_TABLES.BRANDS)
    .select(DB_SCHEMA.BRANDS.ID)
    .eq(DB_SCHEMA.BRANDS.SLUG, slug)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from(DB_TABLES.BRANDS)
    .insert({ [DB_SCHEMA.BRANDS.NAME]: name, [DB_SCHEMA.BRANDS.SLUG]: slug })
    .select(DB_SCHEMA.BRANDS.ID)
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureRange(
  brandId: string,
  slug: string,
  name: string,
  category: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from(DB_TABLES.PRODUCT_RANGES)
    .select(DB_SCHEMA.PRODUCT_RANGES.ID)
    .eq(DB_SCHEMA.PRODUCT_RANGES.BRAND_ID, brandId)
    .eq(DB_SCHEMA.PRODUCT_RANGES.SLUG, slug)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from(DB_TABLES.PRODUCT_RANGES)
    .insert({
      [DB_SCHEMA.PRODUCT_RANGES.NAME]: name,
      [DB_SCHEMA.PRODUCT_RANGES.SLUG]: slug,
      [DB_SCHEMA.PRODUCT_RANGES.BRAND_ID]: brandId,
      category,
    })
    .select(DB_SCHEMA.PRODUCT_RANGES.ID)
    .single();
  if (error) throw error;
  return data.id as string;
}

function mergeCommercialSpecs(
  existing: Product['specs'],
  incoming: Product['specs'],
): Product['specs'] {
  const map = new Map<string, { label: string; value: string }>();
  for (const s of existing || []) {
    if (s?.label && s?.value) map.set(s.label.toLowerCase().trim(), s);
  }
  for (const s of incoming || []) {
    if (s?.label && s?.value) map.set(s.label.toLowerCase().trim(), s);
  }
  return Array.from(map.values());
}

async function enrichWithDeepSeek(product: Product): Promise<Partial<Product>> {
  const weakDesc = isWeakProductDescription(product.description, product.name);
  const fields: ProductEnricherField[] | 'all' = weakDesc
    ? 'all'
    : ['reviewShort', 'pros', 'cons', 'specs', 'manualChecks'];

  const context =
    !weakDesc && product.description?.trim()
      ? { description: product.description.trim() }
      : undefined;

  const details = await generateProductDetails(
    product.name,
    product.category,
    fields,
    context,
  );

  const payload: Partial<Product> = {};
  if (weakDesc && details.description) payload.description = details.description;
  if (details.reviewShort) payload.reviewShort = details.reviewShort;
  if (details.pros?.length) payload.pros = details.pros;
  if (details.cons?.length) payload.cons = details.cons;
  if (details.specs?.length) {
    payload.specs = mergeCommercialSpecs(product.specs, details.specs);
  }
  return payload;
}

export function parseIngestInput(
  format: 'mfoundi' | 'json',
  raw: unknown,
): IngestProductDraft[] {
  if (format === 'mfoundi') return parseMfoundiCatalog(raw as MfoundiCatalogJson);
  return parseJsonDraftList(raw);
}

export async function runProductIngestionFunnel(
  drafts: IngestProductDraft[],
  existingProducts: Product[],
  brands: Brand[],
  ranges: ProductRange[],
  options: IngestionFunnelOptions = {},
): Promise<{ report: IngestionFunnelReport; products: Product[] }> {
  const enrichWithAi = options.enrichWithAi ?? true;
  const enrichDelayMs = options.enrichDelayMs ?? 2500;
  const updateDuplicates = options.updateDuplicates ?? true;
  const onProgress = options.onProgress;

  const report: IngestionFunnelReport = {
    created: 0,
    updated: 0,
    enriched: 0,
    skipped: 0,
    errors: [],
  };

  let productList = [...existingProducts];
  const brandCache = new Map(brands.map((b) => [b.slug, b.id]));
  const rangeCache = new Map(
    ranges.map((r) => [`${r.brand_id}::${r.slug}`, r.id]),
  );

  const total = drafts.length;

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    onProgress?.({
      step: 'upsert',
      index: i + 1,
      total,
      name: draft.name,
      status: 'running',
      message: 'Upsert catalogue…',
    });

    try {
      let brandId = brandCache.get(draft.brandSlug);
      if (!brandId) {
        brandId = await ensureBrand(draft.brandSlug, draft.brandName);
        brandCache.set(draft.brandSlug, brandId);
      }

      const rangeKey = `${brandId}::${draft.rangeSlug}`;
      let rangeId = rangeCache.get(rangeKey);
      if (!rangeId) {
        rangeId = await ensureRange(brandId, draft.rangeSlug, draft.rangeName, draft.category);
        rangeCache.set(rangeKey, rangeId);
      }

      const candidate: Product = {
        id: crypto.randomUUID(),
        name: draft.name,
        description: draft.description || '',
        price: draft.price,
        category: draft.category,
        brand: brandId,
        productRange: rangeId,
        condition: draft.condition,
        image: draft.image || DEFAULT_INGEST_IMAGE,
        images: [],
        stock: draft.stock,
        warrantyMonths: draft.warrantyMonths,
        specs: draft.specs,
        pros: [],
        cons: [],
        rating: 5,
      };

      const duplicate = findDuplicateProduct(productList, candidate);
      let saved: Product;

      if (duplicate && !updateDuplicates) {
        report.skipped += 1;
        onProgress?.({
          step: 'upsert',
          index: i + 1,
          total,
          name: draft.name,
          status: 'skipped',
          message: 'Doublon — ignoré',
        });
        continue;
      }

      if (duplicate) {
        saved = {
          ...duplicate,
          price: draft.price,
          condition: draft.condition,
          warrantyMonths: draft.warrantyMonths,
          specs: mergeCommercialSpecs(duplicate.specs, draft.specs),
          stock: duplicate.stock ?? draft.stock,
        };
        if (isWeakProductDescription(duplicate.description, duplicate.name)) {
          saved.description = '';
        }
        report.updated += 1;
      } else {
        saved = candidate;
        report.created += 1;
      }

      const dbPayload = {
        [DB_SCHEMA.PRODUCTS.ID]: saved.id,
        [DB_SCHEMA.PRODUCTS.NAME]: saved.name,
        [DB_SCHEMA.PRODUCTS.DESCRIPTION]: saved.description || '',
        [DB_SCHEMA.PRODUCTS.PRICE]: saved.price,
        [DB_SCHEMA.PRODUCTS.CATEGORY]: saved.category,
        [DB_SCHEMA.PRODUCTS.IMAGE]: saved.image,
        [DB_SCHEMA.PRODUCTS.STOCK]: saved.stock,
        [DB_SCHEMA.PRODUCTS.CONDITION]: saved.condition || 'refurbished',
        [DB_SCHEMA.PRODUCTS.RATING]: saved.rating || 5,
        [DB_SCHEMA.PRODUCTS.WARRANTY_MONTHS]: saved.warrantyMonths || 0,
        [DB_SCHEMA.PRODUCTS.IS_FEATURED]: saved.isFeatured || false,
        [DB_SCHEMA.PRODUCTS.IS_PROMO]: saved.isPromo || false,
        [DB_SCHEMA.PRODUCTS.BRAND]: saved.brand || null,
        [DB_SCHEMA.PRODUCTS.PRODUCT_RANGE]: saved.productRange || null,
        [DB_SCHEMA.PRODUCTS.SPECS]: saved.specs || [],
        [DB_SCHEMA.PRODUCTS.PROS]: saved.pros || [],
        [DB_SCHEMA.PRODUCTS.CONS]: saved.cons || [],
        [DB_SCHEMA.PRODUCTS.IMAGES]: saved.images || [],
      };

      const { error: upErr } = await supabase.from(DB_TABLES.PRODUCTS).upsert(dbPayload);
      if (upErr) throw upErr;

      productList = duplicate
        ? productList.map((p) => (p.id === saved.id ? saved : p))
        : [...productList, saved];

      if (enrichWithAi && productNeedsAiEnrichment(saved)) {
        onProgress?.({
          step: 'enrich',
          index: i + 1,
          total,
          name: draft.name,
          status: 'running',
          message: 'DeepSeek — description & specs…',
        });

        try {
          const enriched = await enrichWithDeepSeek(saved);
          const enrichPayload: Record<string, unknown> = {};
          if (enriched.description) enrichPayload[DB_SCHEMA.PRODUCTS.DESCRIPTION] = enriched.description;
          if (enriched.reviewShort) enrichPayload[DB_SCHEMA.PRODUCTS.REVIEW_SHORT] = enriched.reviewShort;
          if (enriched.pros) enrichPayload[DB_SCHEMA.PRODUCTS.PROS] = enriched.pros;
          if (enriched.cons) enrichPayload[DB_SCHEMA.PRODUCTS.CONS] = enriched.cons;
          if (enriched.specs) enrichPayload[DB_SCHEMA.PRODUCTS.SPECS] = enriched.specs;

          if (Object.keys(enrichPayload).length > 0) {
            const { error: enrErr } = await supabase
              .from(DB_TABLES.PRODUCTS)
              .update(enrichPayload)
              .eq(DB_SCHEMA.PRODUCTS.ID, saved.id);
            if (enrErr) throw enrErr;

            saved = { ...saved, ...enriched };
            productList = productList.map((p) => (p.id === saved.id ? saved : p));
            report.enriched += 1;
          }

          onProgress?.({
            step: 'enrich',
            index: i + 1,
            total,
            name: draft.name,
            status: 'ok',
            message: 'Enrichi',
          });
          await sleep(enrichDelayMs);
        } catch (enrichErr) {
          const msg = enrichErr instanceof Error ? enrichErr.message : String(enrichErr);
          report.errors.push({ name: draft.name, step: 'enrich', error: msg });
          onProgress?.({
            step: 'enrich',
            index: i + 1,
            total,
            name: draft.name,
            status: 'error',
            message: msg,
          });
        }
      } else {
        onProgress?.({
          step: 'upsert',
          index: i + 1,
          total,
          name: draft.name,
          status: 'ok',
          message: duplicate ? 'Mis à jour' : 'Créé',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push({ name: draft.name, step: 'upsert', error: msg });
      onProgress?.({
        step: 'upsert',
        index: i + 1,
        total,
        name: draft.name,
        status: 'error',
        message: msg,
      });
    }
  }

  return { report, products: productList };
}

export function detectIngestFormat(raw: unknown): 'mfoundi' | 'json' {
  if (raw && typeof raw === 'object' && Array.isArray((raw as MfoundiCatalogJson).rows)) {
    return 'mfoundi';
  }
  return 'json';
}

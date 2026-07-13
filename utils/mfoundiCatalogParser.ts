export type IngestProductDraft = {
  name: string;
  price: number;
  category: string;
  brandSlug: string;
  brandName: string;
  rangeSlug: string;
  rangeName: string;
  condition: 'new' | 'refurbished';
  stock: number;
  warrantyMonths: number;
  specs: { label: string; value: string }[];
  description?: string;
  image?: string;
};

export type MfoundiCatalogJson = {
  rows: unknown[];
  location?: string;
};

const BRAND_SLUG_MAP: Record<string, string> = {
  Google: 'google-pixel',
  Apple: 'apple',
  Samsung: 'samsung',
  Xiaomi: 'xiaomi',
  Infinix: 'infinix',
  Tecno: 'tecno',
};

const BRAND_NAME_MAP: Record<string, string> = {
  Google: 'Google Pixel',
};

const CAT_MAP: Record<string, string> = {
  smartphone: 'phones',
  smartwatch: 'accessories',
  earbuds: 'accessories',
};

export const DEFAULT_INGEST_IMAGE = '/icons/icon-192x192.png';

function slugify(text: string): string {
  return text
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function packagingLabel(p: string | null | undefined): string | null {
  if (p === 'scelle') return 'Scellé';
  if (p === 'non_scelle') return 'Non scellé';
  return null;
}

function buildProductName(row: unknown[]): string {
  const [, brand, model, storage, ram] = row as [string, string, string, number | null, number | null];
  const parts = [brand, model];
  if (storage) parts.push(`${storage} Go`);
  if (ram) parts.push(`${ram} GB RAM`);
  return parts.join(' ');
}

function buildSpecs(row: unknown[]): { label: string; value: string }[] {
  const [, , , storage, ram, packaging, sim, origin, , , accessories, source, notes] = row as [
    string,
    string,
    string,
    number | null,
    number | null,
    string | null,
    string | null,
    string | null,
    number,
    number | null,
    boolean | null,
    string | null,
    string | null,
  ];
  const specs: { label: string; value: string }[] = [];
  if (storage) specs.push({ label: 'Stockage', value: `${storage} Go` });
  if (ram) specs.push({ label: 'RAM', value: `${ram} GB` });
  const pkg = packagingLabel(packaging);
  if (pkg) specs.push({ label: 'Conditionnement', value: pkg });
  if (sim) specs.push({ label: 'SIM', value: sim });
  if (origin) specs.push({ label: 'Origine', value: origin });
  if (source) specs.push({ label: 'Source', value: source });
  if (notes) specs.push({ label: 'Notes', value: notes });
  if (accessories) specs.push({ label: 'Accessoires', value: 'Oui' });
  return specs;
}

function conditionFromRow(row: unknown[]): 'new' | 'refurbished' {
  const packaging = row[5] as string | null;
  if (packaging === 'scelle') return 'new';
  if (packaging === 'non_scelle') return 'refurbished';
  if (row[0] === 'smartphone' && row[1] === 'Apple') return 'refurbished';
  return 'new';
}

/** Catalogue Mfoundi (`data/mfoundi-mall-catalog.json`). */
export function parseMfoundiCatalog(catalog: MfoundiCatalogJson): IngestProductDraft[] {
  const drafts: IngestProductDraft[] = [];

  for (const row of catalog.rows) {
    if (!Array.isArray(row) || row.length < 9) continue;
    const [cat, brandName, model] = row as [string, string, string];
    const brandSlug = BRAND_SLUG_MAP[brandName] || slugify(brandName);
    const displayBrand = BRAND_NAME_MAP[brandName] || brandName;
    const category = CAT_MAP[cat] || 'phones';
    const rangeSlug = slugify(model);
    const price = Number(row[8]);
    if (!price || price <= 0) continue;

    drafts.push({
      name: buildProductName(row),
      brandSlug,
      brandName: displayBrand,
      rangeSlug,
      rangeName: model,
      category,
      price,
      warrantyMonths: Number(row[9]) || 0,
      condition: conditionFromRow(row),
      stock: 0,
      specs: buildSpecs(row),
      description: '',
      image: DEFAULT_INGEST_IMAGE,
    });
  }

  return drafts;
}

/** Liste JSON de fiches déjà structurées (export admin / API). */
export function parseJsonDraftList(raw: unknown): IngestProductDraft[] {
  if (!Array.isArray(raw)) throw new Error('JSON invalide : tableau attendu');
  return raw.map((item, idx) => {
    if (!item || typeof item !== 'object') throw new Error(`Ligne ${idx + 1} invalide`);
    const o = item as Record<string, unknown>;
    const name = String(o.name || '').trim();
    const price = Number(o.price);
    const category = String(o.category || '').trim();
    if (!name || !category || !price) {
      throw new Error(`Ligne ${idx + 1} : name, category et price obligatoires`);
    }
    const brandSlug = String(o.brandSlug || o.brand || 'generic').trim();
    const rangeSlug = String(o.rangeSlug || slugify(name)).trim();
    return {
      name,
      price,
      category,
      brandSlug,
      brandName: String(o.brandName || brandSlug).trim(),
      rangeSlug,
      rangeName: String(o.rangeName || rangeSlug).trim(),
      condition: (o.condition === 'new' ? 'new' : 'refurbished') as 'new' | 'refurbished',
      stock: Math.max(0, Number(o.stock) || 0),
      warrantyMonths: Math.max(0, Number(o.warrantyMonths) || 0),
      specs: Array.isArray(o.specs) ? (o.specs as { label: string; value: string }[]) : [],
      description: String(o.description || '').trim(),
      image: String(o.image || DEFAULT_INGEST_IMAGE).trim(),
    };
  });
}

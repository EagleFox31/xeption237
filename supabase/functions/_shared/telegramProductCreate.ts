/**
 * Pure helpers for the conversational "Ajouter un produit" workflow in Telegram bot.
 * No Deno / npm imports: shared by telegram-bot-entry and vitest suites.
 */

export type ProductDraftStep =
  | "name"
  | "duplicate_check"
  | "category"
  | "brand"
  | "specs_storage"
  | "specs_ram"
  | "condition"
  | "price"
  | "stock"
  | "photos"
  | "confirm";

export interface ProductDraft {
  telegram_user_id: string;
  store_id: string;
  category?: string;
  brand_id?: string;
  brand_name?: string;
  name?: string;
  condition?: "refurbished" | "new";
  storage?: string;
  ram?: string;
  price?: number;
  stock?: number;
  images?: string[];
  photo_message_id?: number;
  step: ProductDraftStep;
  fuzzy_match_id?: string;
}

export const PRODUCT_CATEGORIES = [
  { slug: "phones", label: "Smartphones", icon: "📱", hasSpecs: true },
  { slug: "computer", label: "Ordinateurs", icon: "💻", hasSpecs: true },
  { slug: "tablettes", label: "Tablettes", icon: "📲", hasSpecs: true },
  { slug: "accessories", label: "Accessoires", icon: "🎧", hasSpecs: false }
] as const;

export const STORAGE_OPTIONS = ["64 Go", "128 Go", "256 Go", "512 Go", "1 To"] as const;
export const RAM_OPTIONS = ["4 Go", "6 Go", "8 Go", "12 Go", "16 Go", "32 Go"] as const;

export const CONDITION_OPTIONS = [
  { value: "refurbished" as const, label: "🌟 Reconditionné (défaut)" },
  { value: "new" as const, label: "✨ Neuf scellé" }
] as const;

// ── Callbacks (tous <= 64 octets) ─────────────────────────────────────────────
export const prodCreateStartCb = (storeCode = "") => `nav:pcs:${storeCode}`;
export const prodCreateStoreCb = (storeCode: string) => `nav:pcst:${storeCode}`;
export const prodCreateDupCb = (choice: string) => `nav:pcdu:${choice}`;
export const prodCreateCatCb = (cat: string) => `nav:pcc:${cat}`;
export const prodCreateBrandCb = (brandId: string) => `nav:pcb:${brandId}`;
export const prodCreateBrandAllCb = () => "nav:pcb_all";
export const prodCreateStorageCb = (storage: string) => `nav:pcso:${storage}`;
export const prodCreateRamCb = (ram: string) => `nav:pcrm:${ram}`;
export const prodCreateCondCb = (cond: "refurbished" | "new") => `nav:pccn:${cond}`;
export const prodCreateSkipPhotosCb = () => "nav:pc_skip_ph";
export const prodCreateConfirmCb = () => "nav:pc_commit";
export const prodCreateCancelCb = () => "nav:pc_cancel";

// ── Direction : Validation & Publication ──────────────────────────────────────
export const prodPendingListCb = () => "nav:pcr_list";
export const prodReviewCb = (productId: string) => `nav:pcr_v:${productId}`;
export const prodAiEnrichCb = (productId: string) => `nav:pcr_ai:${productId}`;
export const prodChangePriceCb = (productId: string) => `nav:pcr_pr:${productId}`;
export const prodPublishCb = (productId: string) => `nav:pcr_pub:${productId}`;
export const prodUnpublishCb = (productId: string) => `nav:pcr_unpub:${productId}`;
export const prodRejectCb = (productId: string) => `nav:pcr_del:${productId}`;
export const prodRejectConfirmCb = (productId: string) => `nav:pcr_del_cf:${productId}`;

// ── Tags ForceReply ──────────────────────────────────────────────────────────
export const PC_TAG_NAME = "#PC:NAME";
export const PC_TAG_PRICE = "#PC:PRICE";
export const PC_TAG_STOCK = "#PC:STOCK";
export const PC_TAG_PUB_PRICE_PREFIX = "#PC:PUB_PRICE:";

export function parsePcTag(text: string): "NAME" | "PRICE" | "STOCK" | null {
  if (text.includes(PC_TAG_NAME)) return "NAME";
  if (text.includes(PC_TAG_PRICE)) return "PRICE";
  if (text.includes(PC_TAG_STOCK)) return "STOCK";
  return null;
}

export function parsePcPubPriceTag(text: string): string | null {
  const idx = text.indexOf(PC_TAG_PUB_PRICE_PREFIX);
  if (idx === -1) return null;
  const sub = text.slice(idx + PC_TAG_PUB_PRICE_PREFIX.length).trim();
  const match = /^([a-f0-9-]{36})/.exec(sub);
  return match ? match[1] : null;
}

/** Parses FCFA prices like "450 000", "450000", "450k", "450K". */
export function parseProductPrice(text: string): number | null {
  const clean = text.trim().replace(/\s+/g, "").toLowerCase();
  if (/^\d+k$/.test(clean)) {
    const n = Number(clean.replace("k", ""));
    return n >= 1 && n <= 10000 ? n * 1000 : null;
  }
  const match = /^(\d{3,9})$/.exec(clean);
  if (!match) return null;
  const price = Number(match[1]);
  return price >= 500 && price <= 50000000 ? price : null;
}

/** Parses stock quantity (1..500). */
export function parseProductStock(text: string): number | null {
  const clean = text.trim();
  const match = /^(\d{1,3})$/.exec(clean);
  if (!match) return null;
  const stock = Number(match[1]);
  return stock >= 1 && stock <= 500 ? stock : null;
}


// ── Normalisation catalogue (miroir Deno de utils/productDisplay.ts + utils/productBrand.ts) ──

/** Nom saisi au bot : espaces compactés et graphie officielle « Galaxy » (pas « Galaxie »). */
export function normalizeProductName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().replace(/\bGalaxie\b/gi, "Galaxy");
}

export interface BrandOption {
  id: string;
  name: string;
  slug?: string | null;
}

const isCanonicalSamsung = (b: BrandOption) => b.slug === "samsung" || b.name.trim().toLowerCase() === "samsung";

/** Une seule entrée « Samsung » dans le sélecteur — pas Samsung + Samsung Galaxy. */
export function dedupeBrandOptions<T extends BrandOption>(brands: readonly T[]): T[] {
  const samsung = brands.find(isCanonicalSamsung);
  if (!samsung) return [...brands];
  return brands.filter((b) => b === samsung || !b.name.toLowerCase().includes("samsung"));
}

/** Slugs de marques autorisées par catégorie (évite de proposer HP/Dell pour les smartphones). */
export const CATEGORY_ALLOWED_BRAND_SLUGS: Record<string, string[]> = {
  phones: [
    "apple",
    "samsung",
    "samsung-galaxy",
    "xiaomi",
    "tecno",
    "infinix",
    "google-pixel",
    "huawei",
    "oppo",
    "blackview",
    "cmf"
  ],
  computer: [
    "hp",
    "dell",
    "lenovo",
    "apple",
    "asus",
    "microsoft"
  ],
  tablettes: [
    "apple",
    "samsung",
    "samsung-galaxy",
    "blackview",
    "tecno",
    "lenovo",
    "xiaomi",
    "microsoft"
  ],
  accessories: [
    "oraimo",
    "jbl",
    "apple",
    "samsung",
    "samsung-galaxy",
    "cmf",
    "xiaomi",
    "asus",
    "dell",
    "hp",
    "lenovo"
  ]
};

/** Filtre les marques en fonction du type d'appareil sélectionné. */
export function filterBrandsForCategory<T extends BrandOption>(brands: readonly T[], category?: string): T[] {
  const deduped = dedupeBrandOptions(brands);
  if (!category) return deduped;
  const allowed = CATEGORY_ALLOWED_BRAND_SLUGS[category];
  if (!allowed || allowed.length === 0) return deduped;

  const filtered = deduped.filter(b => {
    const slug = (b.slug ?? b.name).toLowerCase().trim();
    return allowed.some(a => slug === a || slug.includes(a));
  });

  return filtered.length > 0 ? filtered : deduped;
}


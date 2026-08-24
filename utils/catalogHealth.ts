export const CATALOG_HEALTH_SEVERITIES = ['data', 'metier'] as const;
export type CatalogHealthSeverity = (typeof CATALOG_HEALTH_SEVERITIES)[number];

export const CATALOG_HEALTH_RULE_CODES = [
  'missing_name',
  'missing_category',
  'missing_price',
  'missing_image',
  'missing_brand',
  'invalid_stock',
  'empty_stock',
] as const;

export type CatalogHealthRuleCode = (typeof CATALOG_HEALTH_RULE_CODES)[number];

export const CATALOG_HEALTH_SNOOZE_DAYS = 7;
export const CATALOG_HEALTH_LIST_PREVIEW = 8;

export const CATALOG_HEALTH_RULE_LABELS: Record<CatalogHealthRuleCode, string> = {
  missing_name: 'Sans nom commercial',
  missing_category: 'Sans type',
  missing_price: 'Sans prix',
  missing_image: 'Sans photo',
  missing_brand: 'Sans marque',
  invalid_stock: 'Stock négatif',
  empty_stock: 'Plus en stock',
};

export type CatalogHealthFinding = {
  id: string;
  productId: string;
  productName: string;
  ruleCode: CatalogHealthRuleCode;
  severity: CatalogHealthSeverity;
  title: string;
  lastSeenAt: string;
};

export type CatalogHealthSummary = {
  data: CatalogHealthFinding[];
  metier: CatalogHealthFinding[];
  openData: number;
  openMetier: number;
  openTotal: number;
};

export const isCatalogHealthRuleCode = (value: string): value is CatalogHealthRuleCode =>
  (CATALOG_HEALTH_RULE_CODES as readonly string[]).includes(value);

export const isCatalogHealthSeverity = (value: string): value is CatalogHealthSeverity =>
  (CATALOG_HEALTH_SEVERITIES as readonly string[]).includes(value);

export const catalogHealthRuleLabel = (ruleCode: string): string =>
  isCatalogHealthRuleCode(ruleCode)
    ? CATALOG_HEALTH_RULE_LABELS[ruleCode]
    : 'À vérifier';

export const summarizeCatalogHealth = (
  findings: CatalogHealthFinding[],
): CatalogHealthSummary => {
  const data = findings.filter((f) => f.severity === 'data');
  const metier = findings.filter((f) => f.severity === 'metier');
  return {
    data,
    metier,
    openData: data.length,
    openMetier: metier.length,
    openTotal: findings.length,
  };
};

export const parseCatalogHealthFinding = (raw: unknown): CatalogHealthFinding | null => {
  const row = (raw ?? {}) as Record<string, unknown>;
  const ruleCode = String(row.rule_code ?? '');
  const severity = String(row.severity ?? '');
  const id = String(row.id ?? '');
  const productId = String(row.product_id ?? '');
  if (!id || !productId || !isCatalogHealthRuleCode(ruleCode) || !isCatalogHealthSeverity(severity)) {
    return null;
  }
  return {
    id,
    productId,
    productName: String(row.product_name ?? '').trim() || 'Sans nom',
    ruleCode,
    severity,
    title: String(row.title ?? '').trim() || catalogHealthRuleLabel(ruleCode),
    lastSeenAt: String(row.last_seen_at ?? ''),
  };
};

export const parseCatalogHealthScanResult = (
  raw: unknown,
): { openData: number; openMetier: number } => {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    openData: Number(row.open_data ?? 0),
    openMetier: Number(row.open_metier ?? 0),
  };
};

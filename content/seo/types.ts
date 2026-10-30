/**
 * Contrats des contenus SEO déclaratifs (landing pages, guides, aide).
 * TS pur : importé par vite.config.ts (manifeste de routes) et par l'app.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface ContentLink {
  to: string;
  label: string;
}

export type ProductConditionFilter = 'new' | 'refurbished';

export interface ProductFilter {
  /** Valeurs de CATEGORY_SLUGS. */
  categories?: string[];
  /** Noms de marque comparés en slug (« Samsung » couvre Samsung Galaxy). */
  brands?: string[];
  /** Repli quand la marque n'est pas résolue : fragments du nom produit. */
  nameIncludes?: string[];
  conditions?: ProductConditionFilter[];
  /** Bornes incluses, en FCFA. */
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

export type LandingSort = 'default' | 'price-asc' | 'price-desc' | 'newest';

export interface LandingPageDef {
  slug: string;
  h1: string;
  title: string;
  metaDescription: string;
  /** Libellé court pour le footer et les liens internes. */
  navLabel: string;
  intro: string[];
  buyingTips: { title: string; body: string }[];
  faq: FaqItem[];
  filter: ProductFilter;
  sort?: LandingSort;
  limit?: number;
  /** « Voir tout » vers la boutique filtrée. */
  shopHref: string;
  relatedGuides: string[];
  relatedLandings: string[];
  showInFooter?: boolean;
  updatedAt: string;
}

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  links?: ContentLink[];
}

/** Guides d'achat et pages d'aide partagent la même structure. */
export interface ArticleDef {
  slug: string;
  h1: string;
  title: string;
  metaDescription: string;
  navLabel: string;
  summary: string;
  updatedAt: string;
  sections: ArticleSection[];
  faq?: FaqItem[];
  relatedLandings: string[];
  relatedGuides?: string[];
  /** Sélection « produits recommandés » affichée sous l'article. */
  products?: { filter: ProductFilter; limit: number; sort?: LandingSort };
  /** Fiches produit qui affichent ce guide dans « Guides utiles ». */
  appliesTo?: ProductFilter;
}

export interface SeoRouteEntry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: number;
  lastmod: string;
}

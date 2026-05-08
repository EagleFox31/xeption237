import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.xeptionetwork.shop';
const DEFAULT_OG_IMAGE =
  'https://res.cloudinary.com/dli0kdkg9/image/upload/w_1200,h_630,c_pad,b_rgb:050505/v1768287078/logo_mbajfa.png';

export interface PageSEOProps {
  title: string;
  description: string;
  /** Path relatif (ex : "/shop", "/troc"). Calcule automatiquement le canonical. */
  path?: string;
  /** URL absolue d'image. Si non fourni → logo Xeption en fallback. */
  ogImage?: string | null;
  /** Marquer la page comme noindex (dashboards privés, panier, etc). */
  noindex?: boolean;
  /** Type Open Graph : 'website' (défaut) ou 'product'. */
  ogType?: 'website' | 'product' | 'article';
}

/**
 * Composant SEO standardisé. À placer en haut du JSX de chaque page.
 * Toutes les balises sont injectées dans le <head> via react-helmet-async,
 * donc capturées par le prerender Puppeteer au build.
 */
export const PageSEO: React.FC<PageSEOProps> = ({
  title,
  description,
  path = '/',
  ogImage,
  noindex = false,
  ogType = 'website',
}) => {
  const url = `${SITE_URL}${path}`;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Xeption Network" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

/**
 * Transforme une URL Cloudinary en variante 1200×630 padded fond sombre,
 * idéale pour Open Graph / Twitter Card.
 */
export const toOgImage = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/w_1200,h_630,c_pad,b_rgb:050505/');
};

export interface ProductSchemaInput {
  name: string;
  description?: string;
  images?: string[];
  brand?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  url: string;
  rating?: { value: number; count: number } | null;
}

export const productJsonLd = (p: ProductSchemaInput) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: p.name,
  description: p.description || undefined,
  image: p.images?.length ? p.images : undefined,
  brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
  offers: p.price
    ? {
        '@type': 'Offer',
        url: p.url,
        price: p.price,
        priceCurrency: p.currency || 'XAF',
        availability: `https://schema.org/${p.availability || 'InStock'}`,
        seller: { '@type': 'Organization', name: 'Xeption Network' },
      }
    : undefined,
  aggregateRating: p.rating
    ? {
        '@type': 'AggregateRating',
        ratingValue: p.rating.value,
        reviewCount: p.rating.count,
      }
    : undefined,
});

export interface BreadcrumbItem {
  name: string;
  /** Path relatif. Le dernier élément (page courante) peut omettre l'URL. */
  path?: string;
}

export const breadcrumbJsonLd = (items: BreadcrumbItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: item.name,
    ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
  })),
});

/**
 * Composant pour injecter un ou plusieurs blocs JSON-LD via Helmet.
 * Accepte n'importe quel objet schema.org.
 */
export const JsonLd: React.FC<{ data: object | object[] }> = ({ data }) => {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <Helmet>
      {blocks.map((block, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

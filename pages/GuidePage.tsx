import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Product } from '../types';
import { getGuideBySlug } from '../content/seo';
import { selectProducts } from '../utils/landingPageFilter';
import { GUIDES_INDEX_PATH, guidePath } from '../utils/routes';
import { PageSEO, JsonLd, breadcrumbJsonLd, faqJsonLd, absoluteUrl } from '../utils/seo';
import ContentPageShell from '../components/content/ContentPageShell';
import ArticleBody from '../components/content/ArticleBody';
import FaqSection from '../components/content/FaqSection';
import ProductLinkGrid from '../components/content/ProductLinkGrid';
import RelatedLinks from '../components/content/RelatedLinks';
import { TikTokVideoButton } from '../components/TikTokVideoButton';
import { guideLinks, landingLinks } from '../components/content/contentLinks';
import { INSTITUTIONAL_SECTION_CLASS } from '../constants/institutionalPageStyles';

interface GuidePageProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Guide d'achat (/guides/:slug), piloté par content/seo/guides.ts. */
const GuidePage: React.FC<GuidePageProps> = ({ products, onAddToCart }) => {
  const { slug } = useParams<{ slug: string }>();
  const guide = getGuideBySlug(slug);
  const picks = useMemo(
    () => (guide?.products ? selectProducts(products, guide.products.filter, guide.products.sort, guide.products.limit) : []),
    [products, guide],
  );

  if (!guide) {
    return (
      <>
        <PageSEO title="Guide introuvable | Xeption" description="Ce guide n'existe pas." path={guidePath(slug ?? '')} noindex />
        <div className="min-h-screen pt-32 text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Guide introuvable</h1>
          <Link to={GUIDES_INDEX_PATH} className="text-xeption-gold underline">Tous les guides</Link>
        </div>
      </>
    );
  }

  const path = guidePath(guide.slug);
  const crumbs = [{ name: 'Accueil', path: '/' }, { name: 'Guides', path: GUIDES_INDEX_PATH }, { name: guide.navLabel }];
  return (
    <>
      <PageSEO title={guide.title} description={guide.metaDescription} path={path} ogType="article" />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: guide.h1,
            description: guide.metaDescription,
            dateModified: guide.updatedAt,
            mainEntityOfPage: absoluteUrl(path),
            publisher: { '@id': absoluteUrl('/#organization') },
          },
          ...(guide.faq?.length ? [faqJsonLd(guide.faq)] : []),
        ]}
      />
      <ContentPageShell
        crumbs={crumbs}
        h1={guide.h1}
        lead={
          <>
            <p className="mt-3 max-w-3xl text-gray-300 leading-relaxed">{guide.summary}</p>
            <p className="mt-2 text-xs text-gray-500">
              Mis à jour le <time dateTime={guide.updatedAt}>{formatDate(guide.updatedAt)}</time>
            </p>
            {guide.videos?.map((video) => (
              <TikTokVideoButton
                key={video.tiktokId}
                videoId={video.tiktokId}
                label={video.label}
                title={video.title}
                className="mt-3 mr-4 text-xs"
              />
            ))}
          </>
        }
      >
        <div>
          <ArticleBody sections={guide.sections} />
        </div>
        {picks.length > 0 && (
          <section className={`mt-6 ${INSTITUTIONAL_SECTION_CLASS}`} aria-labelledby="produits-title">
            <h2 id="produits-title" className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide mb-4">
              Modèles disponibles
            </h2>
            <ProductLinkGrid products={picks} onAddToCart={onAddToCart} />
          </section>
        )}
        {guide.faq?.length ? <FaqSection items={guide.faq} /> : null}
        <RelatedLinks title="Rayons associés" links={landingLinks(guide.relatedLandings)} />
        <RelatedLinks title="À lire aussi" links={guideLinks(guide.relatedGuides ?? [])} />
      </ContentPageShell>
    </>
  );
};

export default GuidePage;

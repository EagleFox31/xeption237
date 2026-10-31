import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { getLandingBySlug } from '../content/seo';
import { selectLandingProducts } from '../utils/landingPageFilter';
import { landingPath, productPath } from '../utils/routes';
import { getProductDisplayName } from '../utils/productDisplay';
import { PageSEO, JsonLd, breadcrumbJsonLd, faqJsonLd, itemListJsonLd, absoluteUrl } from '../utils/seo';
import ContentPageShell from '../components/content/ContentPageShell';
import { INSTITUTIONAL_SECTION_CLASS } from '../constants/institutionalPageStyles';
import FaqSection from '../components/content/FaqSection';
import ProductLinkGrid from '../components/content/ProductLinkGrid';
import RelatedLinks from '../components/content/RelatedLinks';
import { RelatedCardSections } from '../components/content/RelatedCards';
import type { CardSectionDef } from '../utils/contentCards';
import { helpLinks } from '../components/content/contentLinks';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { VideoTeaserList } from '../components/content/VideoTeaser';

interface LandingPageProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

/** Page catégorie / marque permanente (/categorie/:slug), pilotée par content/seo/landingPages.ts. */
const LandingPage: React.FC<LandingPageProps> = ({ products, onAddToCart }) => {
  const { slug } = useParams<{ slug: string }>();
  const def = getLandingBySlug(slug);
  const selection = useMemo(() => (def ? selectLandingProducts(products, def) : []), [products, def]);
  const relatedSections = useMemo<CardSectionDef[]>(
    () => [
      { kind: 'guides', title: "Guides d'achat", slugs: def?.relatedGuides },
      { kind: 'landings', title: 'Autres rayons', slugs: def?.relatedLandings },
    ],
    [def],
  );

  if (!def) {
    return (
      <>
        <PageSEO title="Page introuvable | Xeption" description="Cette page n'existe pas." path={landingPath(slug ?? '')} noindex />
        <div className="min-h-screen pt-32 text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Page introuvable</h1>
          <Link to="/shop" className="text-xeption-gold underline">Voir la boutique</Link>
        </div>
      </>
    );
  }

  // Texte, FAQ et SEO ne dépendent pas du catalogue : seule la grille attend son chargement.
  const catalogueLoading = products.length === 0;
  const path = landingPath(def.slug);
  return (
    <>
      <PageSEO title={def.title} description={def.metaDescription} path={path} />
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Boutique', path: '/shop' }, { name: def.navLabel }]),
          ...(catalogueLoading
            ? []
            : [
                itemListJsonLd({
                  name: def.h1,
                  path,
                  items: selection.map((p) => ({ name: getProductDisplayName(p), url: absoluteUrl(productPath(p)) })),
                }),
              ]),
          faqJsonLd(def.faq),
        ]}
      />
      <ContentPageShell
        crumbs={[{ name: 'Accueil', path: '/' }, { name: 'Boutique', path: '/shop' }, { name: def.navLabel }]}
        h1={def.h1}
        lead={
          <>
            {def.intro.map((t, i) => (
              <p key={i} className="mt-3 max-w-3xl text-gray-300 leading-relaxed">
                {t}
              </p>
            ))}
            <VideoTeaserList videos={def.videos} eyebrow="Voir avant d'acheter" />
          </>
        }
      >
        <section className={INSTITUTIONAL_SECTION_CLASS} aria-labelledby="selection-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <h2 id="selection-title" className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide">
              Notre sélection{catalogueLoading ? "" : ` (${selection.length})`}
            </h2>
            <Link to={def.shopHref} className="inline-flex items-center gap-1 text-sm text-xeption-gold hover:text-white">
              Filtrer dans la boutique <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {catalogueLoading ? (
            <SkeletonLoader variant="product-grid" count={8} />
          ) : selection.length ? (
            <ProductLinkGrid products={selection} onAddToCart={onAddToCart} />
          ) : (
            <p className="text-gray-400" data-empty-selection>
              Aucun modèle disponible pour le moment.{' '}
              <Link to="/shop" className="text-xeption-gold underline">Voir toute la boutique</Link>
            </p>
          )}
        </section>

        <section className={`mt-6 ${INSTITUTIONAL_SECTION_CLASS}`} aria-labelledby="conseils-title">
          <h2 id="conseils-title" className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide mb-4">
            Conseils d'achat
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {def.buyingTips.map((tip) => (
              <div key={tip.title} className="p-4 rounded-lg border border-white/10 bg-[#0f0f0f]/80">
                <h3 className="font-semibold text-xeption-gold mb-2">{tip.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        <FaqSection items={def.faq} />
        <RelatedCardSections sections={relatedSections} products={products} />
        <RelatedLinks title="Aide & SAV" links={helpLinks(['livraison', 'paiement', 'garanties'])} />
      </ContentPageShell>
    </>
  );
};

export default LandingPage;

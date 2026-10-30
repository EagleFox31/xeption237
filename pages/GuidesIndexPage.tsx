import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GUIDES } from '../content/seo';
import { GUIDES_INDEX_PATH, guidePath } from '../utils/routes';
import { PageSEO, JsonLd, breadcrumbJsonLd, itemListJsonLd, absoluteUrl } from '../utils/seo';
import ContentPageShell from '../components/content/ContentPageShell';
import RelatedLinks from '../components/content/RelatedLinks';
import { landingLinks } from '../components/content/contentLinks';

/** Index des guides d'achat (/guides). */
const GuidesIndexPage: React.FC = () => {
  const crumbs = [{ name: 'Accueil', path: '/' }, { name: 'Guides' }];
  return (
    <>
      <PageSEO
        title="Guides d'achat et conseils | Xeption"
        description="Nos guides pour bien choisir un smartphone ou un ordinateur au Cameroun : budget, neuf ou reconditionné, vérification d'un iPhone et reprise Smart Troc."
        path={GUIDES_INDEX_PATH}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd({
            name: "Guides d'achat Xeption",
            path: GUIDES_INDEX_PATH,
            items: GUIDES.map((g) => ({ name: g.h1, url: absoluteUrl(guidePath(g.slug)) })),
          }),
        ]}
      />
      <ContentPageShell
        crumbs={crumbs}
        h1="Guides d'achat & conseils"
        lead={
          <p className="mt-3 max-w-3xl text-gray-300">
            Des réponses concrètes avant d'acheter, reliées aux modèles disponibles en boutique.
          </p>
        }
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                to={guidePath(g.slug)}
                className="group block h-full p-5 rounded-lg border border-white/10 bg-[#0f0f0f]/80 hover:border-xeption-gold/50 transition-colors"
              >
                <h2 className="font-tech font-bold uppercase tracking-wide text-lg group-hover:text-xeption-gold">{g.h1}</h2>
                <p className="mt-2 text-sm text-gray-300">{g.summary}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm text-xeption-gold">
                  Lire le guide <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <RelatedLinks title="Nos rayons" links={landingLinks()} />
      </ContentPageShell>
    </>
  );
};

export default GuidesIndexPage;

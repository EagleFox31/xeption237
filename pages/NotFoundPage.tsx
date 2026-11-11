import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageSEO } from '../utils/seo';
import { LANDING_PAGES } from '../content/seo';

/**
 * Route fourre-tout : URL inconnue. `noindex` évite le « soft 404 » (Vercel répond 200 pour
 * les routes SPA) ; les liens renvoient vers les rayons pour ne pas perdre le visiteur.
 */
const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <>
      <PageSEO
        title="Page introuvable | Xeption"
        description="Cette page n'existe pas ou a été déplacée. Retrouvez nos smartphones, PC et accessoires au Cameroun."
        path={pathname}
        noindex
      />
      <div className="min-h-screen pt-32 pb-16 px-4 text-center text-white">
        <h1 className="text-2xl sm:text-3xl font-bold font-tech uppercase mb-3">Page introuvable</h1>
        <p className="text-white/70 mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <Link to="/" className="px-4 py-2 rounded-full bg-xeption-gold text-black font-bold">
            Accueil
          </Link>
          <Link to="/shop" className="px-4 py-2 rounded-full border border-xeption-gold text-xeption-gold">
            Voir la boutique
          </Link>
        </div>
        <nav aria-label="Rayons" className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
          {LANDING_PAGES.map((landing) => (
            <Link
              key={landing.slug}
              to={`/categorie/${landing.slug}`}
              className="px-3 py-1.5 rounded-full bg-white/10 text-sm text-white/90 hover:bg-white/20"
            >
              {landing.navLabel}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default NotFoundPage;

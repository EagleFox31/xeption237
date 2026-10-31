import React from 'react';
import { Link } from 'react-router-dom';
import { GUIDES_INDEX_PATH, helpPath } from '../../utils/routes';
import { LANDING_PAGES } from '../../content/seo';
import { landingLinks } from './contentLinks';

const FOOTER_LANDINGS = landingLinks(LANDING_PAGES.filter((l) => l.showInFooter).map((l) => l.slug));

interface FooterSeoLinksProps {
  className?: string;
}

/** Colonnes de maillage du footer : rayons, guides, aide. */
const FooterSeoLinks: React.FC<FooterSeoLinksProps> = ({
  className = 'grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-left',
}) => (
  <nav aria-label="Rayons et aide" className={className}>
    <div>
      <p className="font-tech font-bold uppercase tracking-wider text-xs text-white mb-3">Rayons</p>
      <ul className="space-y-2">
        {FOOTER_LANDINGS.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <p className="font-tech font-bold uppercase tracking-wider text-xs text-white mb-3">Conseils & SAV</p>
      <ul className="space-y-2">
        <li>
          <Link to={GUIDES_INDEX_PATH} className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed">
            Guides d'achat
          </Link>
        </li>
        <li>
          <Link to={helpPath()} className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed">
            Aide & SAV
          </Link>
        </li>
        <li>
          <Link to={helpPath('livraison')} className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed">
            Livraison au Cameroun
          </Link>
        </li>
        <li>
          <Link to={helpPath('retours')} className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed">
            Garantie & Retours
          </Link>
        </li>
        <li>
          <Link to="/troc" className="text-gray-400 hover:text-xeption-gold transition-colors block py-0.5 leading-relaxed">
            Reprise Smart Troc
          </Link>
        </li>
      </ul>
    </div>
  </nav>
);

export default FooterSeoLinks;

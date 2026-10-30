import React from 'react';
import { Link } from 'react-router-dom';
import { GUIDES_INDEX_PATH, helpPath } from '../../utils/routes';
import { LANDING_PAGES } from '../../content/seo';
import { landingLinks } from './contentLinks';

const FOOTER_LANDINGS = landingLinks(LANDING_PAGES.filter((l) => l.showInFooter).map((l) => l.slug));

/** Colonnes de maillage du footer : rayons, guides, aide. */
const FooterSeoLinks: React.FC = () => (
  <nav aria-label="Rayons et aide" className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs text-left">
    <div>
      <p className="font-bold uppercase text-gray-400 mb-2">Rayons</p>
      <ul className="space-y-1.5">
        {FOOTER_LANDINGS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-gray-500 hover:text-xeption-gold transition-colors">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <p className="font-bold uppercase text-gray-400 mb-2">Conseils & aide</p>
      <ul className="space-y-1.5">
        <li><Link to={GUIDES_INDEX_PATH} className="text-gray-500 hover:text-xeption-gold transition-colors">Guides d'achat</Link></li>
        <li><Link to={helpPath()} className="text-gray-500 hover:text-xeption-gold transition-colors">Aide & SAV</Link></li>
        <li><Link to={helpPath('livraison')} className="text-gray-500 hover:text-xeption-gold transition-colors">Livraison</Link></li>
        <li><Link to={helpPath('retours')} className="text-gray-500 hover:text-xeption-gold transition-colors">Retours</Link></li>
        <li><Link to="/troc" className="text-gray-500 hover:text-xeption-gold transition-colors">Smart Troc</Link></li>
      </ul>
    </div>
  </nav>
);

export default FooterSeoLinks;

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { buildPriceTableRows, formatPriceTableDate } from '../../utils/landingPriceTable';
import { INSTITUTIONAL_SECTION_CLASS } from '../../constants/institutionalPageStyles';

/** Tableau de prix daté : un relevé lisible et citable (moteurs de recherche et de réponse). */
const LandingPriceTable: React.FC<{ products: Product[]; title: string }> = ({ products, title }) => {
  const rows = useMemo(() => buildPriceTableRows(products), [products]);
  if (!rows.length) return null;
  const date = formatPriceTableDate(new Date());
  return (
    <section className={`mt-6 ${INSTITUTIONAL_SECTION_CLASS}`} aria-labelledby="prix-title">
      <h2 id="prix-title" className="text-xl md:text-2xl font-tech font-bold uppercase tracking-wide mb-1">
        {title}
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        Prix Xeption relevés le {date}, en FCFA. Prix et stock à jour sur chaque fiche.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <caption className="sr-only">
            {title} au {date}
          </caption>
          <thead className="text-xs uppercase text-gray-400 border-b border-white/10">
            <tr>
              <th scope="col" className="py-2 pr-3">Modèle</th>
              <th scope="col" className="py-2 pr-3">État</th>
              <th scope="col" className="py-2 pr-3 text-right">Prix</th>
              <th scope="col" className="py-2">Disponibilité</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path} className="border-b border-white/5">
                <td className="py-2 pr-3">
                  <Link to={r.path} className="text-white hover:text-xeption-gold">{r.name}</Link>
                </td>
                <td className="py-2 pr-3 text-gray-300">{r.condition}</td>
                <td className="py-2 pr-3 text-right font-semibold text-white whitespace-nowrap">
                  {r.price.toLocaleString('fr-FR')} FCFA
                </td>
                <td className="py-2 text-gray-300">{r.inStock ? 'En stock' : 'Sur commande'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default LandingPriceTable;

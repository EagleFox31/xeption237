import React from 'react';
import RelatedLinks from './RelatedLinks';
import { guideLinks, landingLinks } from './contentLinks';

/** Bloc de maillage accueil : catégories phares + guides d'achat. */
const SeoLinksBlock: React.FC = () => (
  <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <RelatedLinks title="Nos rayons" links={landingLinks()} className="" />
    <RelatedLinks title="Guides d'achat" links={guideLinks()} className="mt-8" />
  </section>
);

export default SeoLinksBlock;

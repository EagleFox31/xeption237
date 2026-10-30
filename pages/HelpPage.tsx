import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HELP_TOPICS, getHelpTopicBySlug } from '../content/seo';
import { helpPath } from '../utils/routes';
import { PageSEO, JsonLd, breadcrumbJsonLd, faqJsonLd } from '../utils/seo';
import ContentPageShell from '../components/content/ContentPageShell';
import ArticleBody from '../components/content/ArticleBody';
import FaqSection from '../components/content/FaqSection';
import RelatedLinks from '../components/content/RelatedLinks';
import { guideLinks, helpLinks } from '../components/content/contentLinks';

const HELP_ACTIONS = [
  { to: '/sav', label: 'Ouvrir un dossier SAV' },
  { to: '/tracking', label: 'Suivre ma commande' },
  { to: '/contact', label: 'Nous contacter' },
  { to: '/cgv', label: 'Conditions générales de vente' },
];

/** Espace « Aide & SAV » : index (/aide) et fiches (/aide/:slug), piloté par content/seo/helpTopics.ts. */
const HelpPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();

  if (!slug) {
    const crumbs = [{ name: 'Accueil', path: '/' }, { name: 'Aide & SAV' }];
    return (
      <>
        <PageSEO
          title="Aide & SAV | Xeption"
          description="Garanties, livraison, paiement Orange Money et MoMo, retours et reprise Smart Troc : toutes les réponses pour acheter sereinement chez Xeption."
          path={helpPath()}
        />
        <JsonLd data={breadcrumbJsonLd(crumbs)} />
        <ContentPageShell crumbs={crumbs} h1="Aide & SAV">
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {HELP_TOPICS.map((t) => (
              <li key={t.slug}>
                <Link
                  to={helpPath(t.slug)}
                  className="group block h-full p-5 rounded-lg border border-white/10 bg-[#0f0f0f]/80 hover:border-xeption-gold/50 transition-colors"
                >
                  <h2 className="font-tech font-bold uppercase tracking-wide group-hover:text-xeption-gold">{t.navLabel}</h2>
                  <p className="mt-2 text-sm text-gray-300">{t.summary}</p>
                  <ArrowRight className="mt-3 w-4 h-4 text-xeption-gold" />
                </Link>
              </li>
            ))}
          </ul>
          <RelatedLinks title="Besoin d'une action ?" links={HELP_ACTIONS} />
        </ContentPageShell>
      </>
    );
  }

  const topic = getHelpTopicBySlug(slug);
  if (!topic) {
    return (
      <>
        <PageSEO title="Page introuvable | Xeption" description="Cette page d'aide n'existe pas." path={helpPath(slug)} noindex />
        <div className="min-h-screen pt-32 text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Page introuvable</h1>
          <Link to={helpPath()} className="text-xeption-gold underline">Aide & SAV</Link>
        </div>
      </>
    );
  }

  const crumbs = [{ name: 'Accueil', path: '/' }, { name: 'Aide & SAV', path: helpPath() }, { name: topic.navLabel }];
  return (
    <>
      <PageSEO title={topic.title} description={topic.metaDescription} path={helpPath(topic.slug)} />
      <JsonLd data={[breadcrumbJsonLd(crumbs), ...(topic.faq?.length ? [faqJsonLd(topic.faq)] : [])]} />
      <ContentPageShell crumbs={crumbs} h1={topic.h1} lead={<p className="mt-3 max-w-3xl text-gray-300">{topic.summary}</p>}>
        <div className="max-w-3xl">
          <ArticleBody sections={topic.sections} />
        </div>
        {topic.faq?.length ? <FaqSection items={topic.faq} /> : null}
        <RelatedLinks title="Guides utiles" links={guideLinks(topic.relatedGuides ?? [])} />
        <RelatedLinks
          title="Autres rubriques d'aide"
          links={helpLinks(HELP_TOPICS.filter((t) => t.slug !== topic.slug).map((t) => t.slug))}
        />
      </ContentPageShell>
    </>
  );
};

export default HelpPage;

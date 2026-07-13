import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Cookie,
  Shield,
  Lock,
  RefreshCw,
  Settings2,
  Globe,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  INSTITUTIONAL_CALLOUT_CLASS,
  INSTITUTIONAL_CALLOUT_TEXT_CLASS,
  INSTITUTIONAL_HEADER_BADGE_CLASS,
  INSTITUTIONAL_PAGE_HEADER_CLASS,
  INSTITUTIONAL_PAGE_LEAD_CLASS,
  INSTITUTIONAL_PAGE_TITLE_CLASS,
  INSTITUTIONAL_SECTION_BODY_CLASS,
  INSTITUTIONAL_SECTION_CLASS,
  INSTITUTIONAL_SECTION_DIVIDER_CLASS,
  INSTITUTIONAL_SECTION_HEADING_CLASS,
  INSTITUTIONAL_TOC_CLASS,
  INSTITUTIONAL_TOC_LINK_IDLE,
} from '../constants/institutionalPageStyles';

const Section: React.FC<{ id: string; icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ id, icon, title, children }) => (
  <section id={id} className={INSTITUTIONAL_SECTION_CLASS}>
    <div className={`flex items-center gap-3 mb-6 pb-4 ${INSTITUTIONAL_SECTION_DIVIDER_CLASS}`}>
      <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold">
        {icon}
      </div>
      <h2 className={INSTITUTIONAL_SECTION_HEADING_CLASS}>{title}</h2>
    </div>
    <div className={INSTITUTIONAL_SECTION_BODY_CLASS}>
      {children}
    </div>
  </section>
);

const CookieRow: React.FC<{
  name: string;
  purpose: string;
  provider: string;
  consent: string;
}> = ({ name, purpose, provider, consent }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 py-3 border-b border-white/10 last:border-0 text-xs">
    <span className="text-white font-bold">{name}</span>
    <span className="text-white/90">{purpose}</span>
    <span className="text-white/90">{provider}</span>
    <span className="text-xeption-gold font-mono">{consent}</span>
  </div>
);

const SECTIONS = [
  { id: 'information-essentielle', label: 'Vue d’ensemble' },
  { id: 'definition-cookie', label: 'Définition' },
  { id: 'traceurs-utilises', label: 'Traceurs utilisés' },
  { id: 'traceurs-tiers', label: 'Traceurs tiers' },
  { id: 'gestion-choix', label: 'Gestion des choix' },
  { id: 'evolution-politique', label: 'Évolution' },
];

const TOC: React.FC<{ activeId: string }> = ({ activeId }) => (
  <nav className={INSTITUTIONAL_TOC_CLASS} aria-label="Sommaire">
    <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest mb-3 xl:mb-4">Sommaire</p>
    <ol className="flex gap-2 overflow-x-auto no-scrollbar text-sm xl:flex-col xl:overflow-visible">
      {SECTIONS.map((item, idx) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id} className="shrink-0 xl:shrink">
            <a
              href={`#${item.id}`}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 group whitespace-nowrap ${
                isActive ? 'bg-xeption-gold/10 border border-xeption-gold/20 text-xeption-gold' : INSTITUTIONAL_TOC_LINK_IDLE
              }`}
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-300 shrink-0 ${isActive ? 'text-xeption-gold translate-x-1' : 'text-white/60 group-hover:text-xeption-gold group-hover:translate-x-0.5'}`} />
              <span className={`font-mono text-xs w-5 shrink-0 ${isActive ? 'text-xeption-gold' : 'text-xeption-gold/50'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="font-medium">{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  </nav>
);

const PolitiqueCookiesPage: React.FC = () => {
  const lastUpdated = '08 mai 2026';
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Helmet>
        <title>Politique Cookies | Xeption Network — ETS XEPTION</title>
        <meta
          name="description"
          content="Politique cookies du site xeptionetwork.shop — informations sur les cookies et traceurs techniques utilisés par ETS XEPTION, leurs finalités et la gestion de vos choix."
        />
        <link rel="canonical" href="https://www.xeptionetwork.shop/politique-cookies" />
      </Helmet>

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <TOC activeId={activeSection} />
          <div className={INSTITUTIONAL_PAGE_HEADER_CLASS}>
            <div className={INSTITUTIONAL_HEADER_BADGE_CLASS}>
              <Cookie className="w-3.5 h-3.5" />
              Cookies & traceurs
            </div>
            <h1 className={INSTITUTIONAL_PAGE_TITLE_CLASS}>
              Politique <span className="text-xeption-gold">Cookies</span>
            </h1>
            <p className={`${INSTITUTIONAL_PAGE_LEAD_CLASS} max-w-2xl`}>
              Cette page explique quels cookies et autres traceurs techniques peuvent être utilisés sur
              <span className="text-xeption-gold font-mono"> xeptionetwork.shop</span>, dans quel but et comment
              vous pouvez gérer vos préférences.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-white/75 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <div className="space-y-6 snap-y snap-proximity">
            <section id="information-essentielle" className={INSTITUTIONAL_CALLOUT_CLASS}>
              <FileText className="w-5 h-5 text-xeption-gold shrink-0 mt-0.5" />
              <div className={INSTITUTIONAL_CALLOUT_TEXT_CLASS}>
                <span className="text-xeption-gold font-bold uppercase tracking-wider block mb-1">Information essentielle</span>
                À la date de dernière mise à jour, le site n'utilise pas de cookies publicitaires, de pixels marketing
                ni d'outil de mesure d'audience de type Google Analytics, Meta Pixel ou Hotjar. Les traceurs utilisés
                sont limités à des finalités techniques, d'authentification et de sécurité.
              </div>
            </section>

            <Section id="definition-cookie" icon={<Shield className="w-5 h-5" />} title="Qu'est-ce qu'un cookie ?">
              <p>
                Un cookie ou traceur est un fichier, un identifiant ou un mécanisme technique permettant de lire ou
                d'écrire certaines informations sur votre terminal lors de votre navigation sur un site web.
              </p>
              <p>
                Certains cookies sont strictement nécessaires au fonctionnement du site ou à la sécurité des services.
                D'autres, lorsqu'ils servent à la publicité, au ciblage ou à certaines mesures d'audience, nécessitent
                un consentement préalable.
              </p>
            </Section>

            <Section id="traceurs-utilises" icon={<Lock className="w-5 h-5" />} title="Cookies et traceurs utilisés">
              <p>
                Le site utilise uniquement des cookies et traceurs techniques ou de sécurité strictement nécessaires au
                service :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-white/75 border-b border-white/10 pb-2">
                <span>Nom / catégorie</span>
                <span>Finalité</span>
                <span>Fournisseur</span>
                <span>Consentement</span>
              </div>

              <CookieRow
                name="Cookies d'authentification"
                purpose="Authentification sécurisée de l'espace staff et maintien de session lorsque nécessaire."
                provider="Fournisseur d'authentification tiers"
                consent="Exempté"
              />
              <CookieRow
                name="hCaptcha"
                purpose="Protection contre les bots, soumissions automatiques et abus sur certaines actions sensibles."
                provider="hCaptcha"
                consent="Exempté"
              />
              <CookieRow
                name="Cookies techniques de fonctionnement"
                purpose="Bon fonctionnement général du site et continuité technique du service."
                provider="Xeption / infrastructure"
                consent="Exempté"
              />

              <p className="text-white text-xs italic">
                Ces traceurs sont utilisés uniquement dans la mesure nécessaire au fonctionnement, à l'authentification
                ou à la sécurité du service.
              </p>
            </Section>

            <Section id="traceurs-tiers" icon={<Globe className="w-5 h-5" />} title="Traceurs tiers">
              <p>Certains composants techniques peuvent impliquer l'intervention de prestataires tiers :</p>
              <div className="space-y-3 mt-2">
                {[
                  {
                    name: 'Service d\'authentification',
                    detail: "Gestion de l'authentification staff et des mécanismes de session associés.",
                  },
                  {
                    name: 'hCaptcha',
                    detail: 'Protection des formulaires et des actions sensibles contre les usages automatisés.',
                  },
                ].map((item, index) => (
                  <div key={index} className="bg-black/40 border border-white/10 rounded-lg p-4">
                    <p className="text-white font-bold text-sm">{item.name}</p>
                    <p className="text-white/90 text-xs mt-1">{item.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-white text-xs italic">
                Ces prestataires peuvent appliquer leurs propres politiques de confidentialité et de sécurité dans le
                cadre de leurs services techniques.
              </p>
            </Section>

            <Section id="gestion-choix" icon={<Settings2 className="w-5 h-5" />} title="Gestion de vos choix">
              <p>
                Comme les traceurs actuellement utilisés sont strictement nécessaires, ils ne font pas l'objet d'un
                bandeau de consentement dédié à la date de dernière mise à jour.
              </p>
              <p>
                Vous pouvez toutefois configurer votre navigateur pour bloquer ou limiter certains cookies. Une telle
                désactivation peut affecter le bon fonctionnement de certaines fonctions du site, notamment les
                mécanismes de sécurité ou d'authentification.
              </p>
            </Section>

            <Section id="evolution-politique" icon={<AlertCircle className="w-5 h-5" />} title="Évolution de cette politique">
              <p>
                Si le site venait à utiliser à l'avenir des cookies de mesure d'audience non exemptés, des traceurs
                publicitaires ou des outils de personnalisation nécessitant un consentement, cette page serait mise à
                jour et un mécanisme de recueil de consentement serait déployé.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
};

export default PolitiqueCookiesPage;

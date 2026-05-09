import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Cpu, MapPin, RefreshCw, ShieldCheck, Sparkles, Store, Truck } from 'lucide-react';
import { PageSEO } from '../utils/seo';

const Section: React.FC<{ id: string; icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ id, icon, title, children }) => (
  <section
    id={id}
    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-8 hover:border-xeption-gold/20 transition-all duration-300 scroll-mt-32 snap-start"
  >
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
      <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white font-tech uppercase tracking-wider">{title}</h2>
    </div>
    <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
    <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold mb-4">
      {icon}
    </div>
    <h3 className="text-white font-bold font-tech uppercase tracking-wider text-sm mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
  </div>
);

const SECTIONS = [
  { id: 'qui-nous-sommes', label: 'Qui nous sommes' },
  { id: 'positionnement', label: 'Notre positionnement' },
  { id: 'engagements', label: 'Nos engagements' },
  { id: 'presence', label: 'Présence & zones' },
  { id: 'offre', label: 'Ce que nous proposons' },
];

const TOC: React.FC<{ activeId: string }> = ({ activeId }) => (
  <nav className="fixed top-24 right-4 w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100vh-7rem)] overflow-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl z-40" aria-label="Sommaire">
    <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest mb-4">Sommaire</p>
    <ol className="flex flex-col gap-2 text-sm">
      {SECTIONS.map((item, idx) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 group ${
                isActive ? 'bg-xeption-gold/10 border border-xeption-gold/20 text-xeption-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-300 shrink-0 ${isActive ? 'text-xeption-gold translate-x-1' : 'text-gray-600 group-hover:text-xeption-gold group-hover:translate-x-0.5'}`} />
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

const AboutPage: React.FC = () => {
  const lastUpdated = '08 mai 2026';
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
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
      <PageSEO
        title="À Propos | Xeption Network — ETS XEPTION"
        description="Découvrez Xeption Network, boutique tech premium au Cameroun : smartphones, PC, Smart Troc, livraison locale, conseils et expérience pensée pour le marché 237."
        path="/about"
      />

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-0 pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-xeption-gold/10 border border-xeption-gold/30 rounded-full px-4 py-2 text-xeption-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Xeption Network
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
              À <span className="text-xeption-gold">Propos</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto text-sm leading-relaxed">
              Xeption Network est une boutique tech pensée pour le marché camerounais, avec une approche plus claire,
              plus premium et plus utile que le e-commerce gadget. L'objectif est simple : aider les clients à acheter,
              comparer, faire reprendre ou suivre leurs appareils dans un cadre plus sérieux.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <TOC activeId={activeSection} />

          <div className="space-y-6 w-full snap-y snap-proximity">
            <Section id="qui-nous-sommes" icon={<Store className="w-5 h-5" />} title="Qui Nous Sommes">
              <p>
                ETS XEPTION développe une expérience de vente tech centrée sur la confiance, la lisibilité des offres
                et la qualité du service. La boutique opère depuis <strong className="text-white">Mfoundi Mall,
                Boutique 2063 à Yaoundé</strong> et s'adresse aux clients à Yaoundé, Douala et dans le reste du
                Cameroun.
              </p>
              <p>
                La sélection de produits couvre principalement les smartphones, accessoires, ordinateurs portables et
                équipements associés, avec un effort particulier sur la présentation claire des caractéristiques, des
                garanties et du service après-vente.
              </p>
            </Section>

            <Section id="positionnement" icon={<Cpu className="w-5 h-5" />} title="Notre Positionnement">
              <p>
                Xeption ne cherche pas seulement à afficher des fiches produits. Le site a été conçu pour orienter la
                décision d'achat avec plus de contexte : mise en avant des spécifications utiles, assistance à la
                comparaison, prise en charge du <strong className="text-white">Smart Troc</strong> et accès plus simple
                au suivi et au SAV.
              </p>
              <p>
                Cette approche vise à réduire les achats mal compris, les mauvaises surprises et les échanges flous qui
                abîment souvent l'expérience client dans le commerce tech local.
              </p>
            </Section>

            <section id="engagements" className="scroll-mt-32 snap-start">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <FeatureCard
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Confiance"
                text="Produits scellés ou certifiés conformes, politique de SAV visible et informations légales publiées."
              />
              <FeatureCard
                icon={<Truck className="w-5 h-5" />}
                title="Service Local"
                text="Livraison, retrait boutique, accompagnement client et adaptation aux usages réels du marché 237."
              />
              <FeatureCard
                icon={<BadgeCheck className="w-5 h-5" />}
                title="Clarté"
                text="Descriptions plus utiles, contact direct, parcours de commande lisible et pages juridiques structurées."
              />
              <FeatureCard
                icon={<Sparkles className="w-5 h-5" />}
                title="Expérience"
                text="Une boutique tech avec une identité visuelle forte et une logique produit plus éditorialisée."
              />
            </div>
            </section>

            <Section id="presence" icon={<MapPin className="w-5 h-5" />} title="Présence & Zones Desservies">
              <p>
                Xeption est basé à Yaoundé et dessert notamment Yaoundé, Douala, Bafoussam, Kribi, Garoua, Bamenda et
                d'autres localités du Cameroun selon le produit, le mode d'expédition et les contraintes logistiques.
              </p>
              <p>
                Pour certaines demandes spécifiques, notamment les reprises Smart Troc ou certains besoins SAV, un
                passage en boutique peut être requis afin de vérifier l'état réel de l'appareil ou de confirmer les
                éléments techniques avant validation.
              </p>
            </Section>

            <Section id="offre" icon={<Sparkles className="w-5 h-5" />} title="Ce Que Nous Proposons">
              <p>
                L'offre Xeption s'articule autour de quatre blocs : achat de produits tech, accompagnement dans le
                choix, suivi de commande et reprise d'appareils via Smart Troc.
              </p>
              <p>
                Si vous souhaitez nous écrire directement ou venir en boutique, consultez la page{' '}
                <Link to="/contact" className="text-xeption-gold hover:underline">
                  Contact
                </Link>.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;

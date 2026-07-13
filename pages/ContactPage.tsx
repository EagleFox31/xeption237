import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock3, Mail, MapPin, MessageCircle, Phone, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { PageSEO } from '../utils/seo';
import {
  INSTITUTIONAL_FEATURE_CARD_CLASS,
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

const ContactCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  cta?: string;
}> = ({ icon, title, text, href, cta }) => (
  <div className={`${INSTITUTIONAL_FEATURE_CARD_CLASS} flex flex-col gap-3`}>
    <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold">
      {icon}
    </div>
    <div>
      <h3 className="text-white font-bold font-tech uppercase tracking-wider text-sm mb-2">{title}</h3>
      <p className="text-white/90 text-sm leading-relaxed">{text}</p>
    </div>
    {href && cta && (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center justify-center px-4 py-3 bg-xeption-gold/10 border border-xeption-gold/30 text-xeption-gold hover:bg-xeption-gold/20 transition-all rounded-lg text-xs font-bold uppercase tracking-widest"
      >
        {cta}
      </a>
    )}
  </div>
);

const SECTIONS = [
  { id: 'acces-rapide', label: 'Accès rapide' },
  { id: 'coordonnees', label: 'Coordonnées' },
  { id: 'quand-nous-contacter', label: 'Quand nous contacter' },
  { id: 'suivi-sav-troc', label: 'Suivi, SAV et Troc' },
  { id: 'informations-utiles', label: 'Informations utiles' },
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

const ContactPage: React.FC = () => {
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
        title="Contact | Xeption Network — ETS XEPTION"
        description="Contactez Xeption Network : boutique à Yaoundé, WhatsApp, téléphone, email, suivi de commande, SAV et demandes Smart Troc."
        path="/contact"
      />

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className={INSTITUTIONAL_PAGE_HEADER_CLASS}>
            <div className={INSTITUTIONAL_HEADER_BADGE_CLASS}>
              <Phone className="w-3.5 h-3.5" />
              Contact Xeption
            </div>
            <h1 className={INSTITUTIONAL_PAGE_TITLE_CLASS}>
              Nous <span className="text-xeption-gold">Contacter</span>
            </h1>
            <p className={`${INSTITUTIONAL_PAGE_LEAD_CLASS} max-w-2xl leading-relaxed`}>
              Pour une commande, une question produit, un besoin SAV ou une demande Smart Troc, utilisez le canal le
              plus adapté ci-dessous. Les demandes sensibles ou nécessitant vérification technique peuvent être traitées
              en boutique.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-white/75 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <TOC activeId={activeSection} />

          <div className="space-y-6 w-full snap-y snap-proximity">
            <section id="acces-rapide" className="scroll-mt-32 snap-start">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <ContactCard
                  icon={<MessageCircle className="w-5 h-5" />}
                  title="WhatsApp"
                  text="Canal rapide pour les questions produit, confirmations et échanges pratiques."
                  href="https://wa.me/237697686684"
                  cta="Écrire sur WhatsApp"
                />
                <ContactCard
                  icon={<Phone className="w-5 h-5" />}
                  title="Téléphone"
                  text="Pour parler directement avec la boutique ou confirmer une information urgente."
                  href="tel:+237697686684"
                  cta="Appeler"
                />
                <ContactCard
                  icon={<Mail className="w-5 h-5" />}
                  title="Email"
                  text="Pour les demandes écrites, documents, réclamations ou questions nécessitant une trace."
                  href="mailto:support@xeptionetwork.shop"
                  cta="Envoyer un email"
                />
                <ContactCard
                  icon={<MapPin className="w-5 h-5" />}
                  title="Boutique"
                  text="Mfoundi Mall, Boutique 2063, Yaoundé. Passage utile pour SAV et vérification Smart Troc."
                />
              </div>
            </section>
            <Section id="coordonnees" icon={<MapPin className="w-5 h-5" />} title="Coordonnées">
              <div className="space-y-3">
                <p><span className="text-white/75 uppercase tracking-widest text-[10px] block mb-1">Entreprise</span><span className="text-white font-medium">ETS XEPTION</span></p>
                <p><span className="text-white/75 uppercase tracking-widest text-[10px] block mb-1">Adresse</span><span className="text-white">Mfoundi Mall, Boutique 2063, Avenue Mgr Vogt, Marché Mfoundi, Centre-ville, Yaoundé, Cameroun</span></p>
                <p><span className="text-white/75 uppercase tracking-widest text-[10px] block mb-1">Téléphone</span><a href="tel:+237697686684" className="text-xeption-gold hover:underline">+237 697 686 684</a></p>
                <p><span className="text-white/75 uppercase tracking-widest text-[10px] block mb-1">Email</span><a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">support@xeptionetwork.shop</a></p>
              </div>
            </Section>

            <Section id="quand-nous-contacter" icon={<Clock3 className="w-5 h-5" />} title="Quand Nous Contacter">
              <p>
                Pour les demandes de disponibilité, de livraison, de commande ou de reprise, WhatsApp reste le canal le
                plus direct. Pour les sujets contractuels, SAV ou demandes nécessitant un historique clair, privilégiez
                l'email.
              </p>
              <p>
                Si une vérification physique du produit ou de l'appareil est requise, l'équipe peut vous orienter vers
                un passage en boutique avant validation définitive.
              </p>
            </Section>

            <Section id="suivi-sav-troc" icon={<Wrench className="w-5 h-5" />} title="Suivi, SAV et Smart Troc">
              <p>
                Pour suivre une commande, vous pouvez utiliser la page{' '}
                <Link to="/tracking" className="text-xeption-gold hover:underline">
                  Tracking
                </Link>.
              </p>
              <p>
                Pour les demandes de service après-vente, utilisez la page{' '}
                <Link to="/sav" className="text-xeption-gold hover:underline">
                  SAV
                </Link>{' '}
                ou contactez directement la boutique si la situation nécessite une prise en charge rapide.
              </p>
              <p>
                Pour le service de reprise, consultez{' '}
                <Link to="/troc" className="text-xeption-gold hover:underline">
                  Smart Troc
                </Link>{' '}
                puis finalisez en boutique si une inspection physique est demandée.
              </p>
            </Section>

            <Section id="informations-utiles" icon={<ShieldCheck className="w-5 h-5" />} title="Informations Utiles">
              <p>
                Pour les informations légales de l'entreprise, consultez les{' '}
                <Link to="/mentions-legales" className="text-xeption-gold hover:underline">
                  Mentions légales
                </Link>.
              </p>
              <p>
                Pour les conditions de vente, la confidentialité et les cookies, les pages dédiées sont accessibles
                depuis le footer du site.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;

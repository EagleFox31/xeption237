import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield, Globe, Server, BookOpen, Mail, Phone, MapPin, Building2, FileText, RefreshCw } from 'lucide-react';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-8 hover:border-xeption-gold/20 transition-all duration-300">
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
      <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white font-tech uppercase tracking-wider">{title}</h2>
    </div>
    <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-white/5 last:border-0">
    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest sm:w-48 shrink-0 flex items-center gap-1.5">
      {icon && <span className="text-xeption-gold">{icon}</span>}
      {label}
    </span>
    <span className="text-white font-medium">{value}</span>
  </div>
);

const MentionsLegalesPage: React.FC = () => {
  const lastUpdated = '08 mai 2026';

  return (
    <>
      <Helmet>
        <title>Mentions Légales | Xeption Network — ETS XEPTION</title>
        <meta
          name="description"
          content="Mentions légales du site xeptionetwork.shop — informations sur l'éditeur, l'hébergement, la propriété intellectuelle et les données personnelles de la boutique ETS XEPTION."
        />
        <link rel="canonical" href="https://www.xeptionetwork.shop/mentions-legales" />
      </Helmet>

      <div className="min-h-screen pt-28 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-xeption-gold/10 border border-xeption-gold/30 rounded-full px-4 py-2 text-xeption-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Shield className="w-3.5 h-3.5" />
              Informations légales
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
              Mentions <span className="text-xeption-gold">Légales</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Conformément aux obligations légales en vigueur, vous trouverez ci-dessous toutes les informations relatives à l'édition et à l'hébergement du présent site.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-600 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <div className="space-y-6">

            {/* Éditeur du site */}
            <Section icon={<Building2 className="w-5 h-5" />} title="Éditeur du site">
              <p className="text-gray-400 text-xs italic mb-4">
                Le présent site est édité par ETS XEPTION, entreprise individuelle (EI) exerçant ses activités dans le secteur de la vente de produits high-tech.
              </p>
              <Row
                label="Nom commercial"
                value="ETS XEPTION"
                icon={<Building2 className="w-3 h-3" />}
              />
              <Row
                label="Forme juridique"
                value="Entreprise Individuelle (EI)"
              />
              <Row
                label="Responsable"
                value="Jordan Ladzou Kuete"
                icon={<Shield className="w-3 h-3" />}
              />
              <Row
                label="Adresse"
                value={
                  <>
                    Mfoundi Mall, Boutique 2063,{' '}
                    <span className="text-yellow-400 font-mono text-xs bg-yellow-400/10 px-2 py-0.5 rounded">
                      [À COMPLÉTER — Adresse administrative complète]
                    </span>
                    {', Yaoundé, Cameroun'}
                  </>
                }
                icon={<MapPin className="w-3 h-3" />}
              />
              <Row
                label="Téléphone"
                value={
                  <a href="tel:+237697686684" className="text-xeption-gold hover:underline">
                    +237 697 686 684
                  </a>
                }
                icon={<Phone className="w-3 h-3" />}
              />
              <Row
                label="Email"
                value={
                  <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">
                    support@xeptionetwork.shop
                  </a>
                }
                icon={<Mail className="w-3 h-3" />}
              />
              <Row
                label="RCCM"
                value={<span className="font-mono">CM-NSI-01-2025-A10-01892</span>}
                icon={<FileText className="w-3 h-3" />}
              />
              <Row
                label="NIU"
                value={<span className="font-mono">P039916777543H</span>}
                icon={<FileText className="w-3 h-3" />}
              />
              <Row
                label="N° TVA"
                value={<span className="font-mono">P039916777543H</span>}
                icon={<FileText className="w-3 h-3" />}
              />
            </Section>

            {/* Responsable de la publication */}
            <Section icon={<FileText className="w-5 h-5" />} title="Responsable de la publication">
              <Row
                label="Identité"
                value="Jordan Ladzou Kuete"
              />
              <Row
                label="Contact"
                value={
                  <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">
                    support@xeptionetwork.shop
                  </a>
                }
                icon={<Mail className="w-3 h-3" />}
              />
            </Section>

            {/* Hébergement */}
            <Section icon={<Server className="w-5 h-5" />} title="Hébergement">
              <p className="text-gray-400 text-xs italic mb-4">
                Le site est hébergé par la société suivante :
              </p>
              <Row label="Hébergeur" value="Vercel Inc." />
              <Row
                label="Adresse"
                value="340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis"
                icon={<MapPin className="w-3 h-3" />}
              />
              <Row
                label="Support"
                value={
                  <a
                    href="https://vercel.com/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xeption-gold hover:underline"
                  >
                    https://vercel.com/support
                  </a>
                }
                icon={<Globe className="w-3 h-3" />}
              />
            </Section>

            {/* Nom de domaine */}
            <Section icon={<Globe className="w-5 h-5" />} title="Nom de domaine">
              <p className="text-gray-400 text-xs italic mb-4">
                Le nom de domaine <strong className="text-white">xeptionetwork.shop</strong> est enregistré auprès du bureau d'enregistrement suivant :
              </p>
              <Row label="Registraire" value="HOSTINGER operations, UAB" />
              <Row
                label="Adresse"
                value="Švitrigailos str. 34, Vilnius 03230, Lituanie"
                icon={<MapPin className="w-3 h-3" />}
              />
              <Row
                label="Téléphone"
                value={
                  <a href="tel:+37064503378" className="text-xeption-gold hover:underline">
                    +370 645 03378
                  </a>
                }
                icon={<Phone className="w-3 h-3" />}
              />
              <Row
                label="Email"
                value={
                  <a href="mailto:domains@hostinger.com" className="text-xeption-gold hover:underline">
                    domains@hostinger.com
                  </a>
                }
                icon={<Mail className="w-3 h-3" />}
              />
            </Section>

            {/* Propriété intellectuelle */}
            <Section icon={<BookOpen className="w-5 h-5" />} title="Propriété intellectuelle">
              <p>
                L'ensemble des éléments présents sur ce site — notamment les textes, images, graphismes, logo, icônes, sons et contenus multimédia —, sauf mention contraire, sont la <strong className="text-white">propriété exclusive de ETS XEPTION</strong> et sont protégés par les lois applicables en matière de propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, transmission ou adaptation totale ou partielle de ces éléments, par quelque procédé que ce soit et sur quelque support que ce soit, est <strong className="text-white">strictement interdite sans autorisation préalable écrite</strong> de ETS XEPTION.
              </p>
              <p className="text-gray-500 text-xs italic">
                Pour toute demande d'autorisation ou de licence, contactez-nous à{' '}
                <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">
                  support@xeptionetwork.shop
                </a>.
              </p>
            </Section>

            {/* Données personnelles */}
            <Section icon={<Shield className="w-5 h-5" />} title="Données personnelles">
              <p>
                Dans le cadre de l'utilisation de ce site et du traitement de vos commandes, ETS XEPTION est susceptible de collecter des données à caractère personnel (nom, prénom, adresse email, numéro de téléphone, adresse de livraison).
              </p>
              <p>
                Ces données sont traitées dans le strict respect de la réglementation applicable et ne sont jamais cédées à des tiers à des fins commerciales sans votre consentement.
              </p>
              <p>
                Pour toute question relative au traitement de vos données personnelles, ou pour exercer vos droits d'accès, de rectification ou de suppression, vous pouvez écrire à :
              </p>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 mt-2">
                <Mail className="w-4 h-4 text-xeption-gold" />
                <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline font-mono text-sm">
                  support@xeptionetwork.shop
                </a>
              </div>
            </Section>

            {/* Note bas de page */}
            <div className="text-center text-gray-600 text-xs pt-4 pb-8">
              <p>© {new Date().getFullYear()} ETS XEPTION — Tous droits réservés.</p>
              <p className="mt-1">Site réalisé par <span className="text-gray-500">Trigenys Group</span></p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default MentionsLegalesPage;

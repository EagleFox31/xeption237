import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  RefreshCw, FileText, Camera, Smartphone, CreditCard, Award,
  Ban, Database, Handshake, Gavel, ChevronRight, Mail,
} from 'lucide-react';
import { TrocServiceFeesLegal } from '../components/troc/TrocServiceFeesLegal';
import { formatTrocFee, TROC_TIER_PRICES, TROC_TUNNEL_TIER } from '../utils/trocPricing';
import {
  INSTITUTIONAL_FOOTER_LINK_CLASS,
  INSTITUTIONAL_FOOTER_NOTE_CLASS,
  INSTITUTIONAL_HEADER_BADGE_CLASS,
  INSTITUTIONAL_PAGE_HEADER_CLASS,
  INSTITUTIONAL_PAGE_LEAD_CLASS,
  INSTITUTIONAL_PAGE_TITLE_CLASS,
  INSTITUTIONAL_SECTION_BODY_CLASS,
  INSTITUTIONAL_SECTION_CLASS,
  INSTITUTIONAL_SECTION_DIVIDER_CLASS,
  INSTITUTIONAL_SECTION_HEADING_CLASS,
  INSTITUTIONAL_TOC_LINK_IDLE,
  INSTITUTIONAL_TOC_STICKY_CLASS,
} from '../constants/institutionalPageStyles';

/**
 * Conditions spécifiques au service Smart Troc — ETS XEPTION
 * Cadre juridique : loi camerounaise N°2010/021 du 21 décembre 2010
 * régissant le commerce électronique. Document complémentaire aux CGV.
 */

const Section: React.FC<{
  id: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ id, number, icon, title, children }) => (
  <section
    id={id}
    className={INSTITUTIONAL_SECTION_CLASS}
  >
    <div className={`flex items-center gap-3 mb-6 pb-4 ${INSTITUTIONAL_SECTION_DIVIDER_CLASS}`}>
      <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold shrink-0">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-tech text-xeption-gold/70 uppercase tracking-widest">
          Article {number}
        </span>
        <h2 className={INSTITUTIONAL_SECTION_HEADING_CLASS}>
          {title}
        </h2>
      </div>
    </div>
    <div className={INSTITUTIONAL_SECTION_BODY_CLASS}>
      {children}
    </div>
  </section>
);

const TOC: React.FC<{ items: { id: string; label: string }[], activeId: string }> = ({ items, activeId }) => (
  <nav className={INSTITUTIONAL_TOC_STICKY_CLASS} aria-label="Sommaire">
    <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest mb-3 lg:mb-4 hidden lg:block">Sommaire</p>
    <ol className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar lg:flex-col gap-2 text-sm pb-2 lg:pb-0">
      {items.map((item, idx) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id} className="snap-start shrink-0">
            <a
              href={`#${item.id}`}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 group ${
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

const SECTIONS = [
  { id: 'objet',         label: 'Objet du service' },
  { id: 'processus',     label: 'Processus d’évaluation' },
  { id: 'frais',         label: 'Frais de service' },
  { id: 'estimation',    label: 'Estimation indicative' },
  { id: 'bon',           label: 'Bon de reprise' },
  { id: 'photos',        label: 'Photos et IMEI' },
  { id: 'refus',         label: 'Conditions de refus' },
  { id: 'donnees',       label: 'Données collectées' },
  { id: 'cession',       label: 'Cession en boutique' },
  { id: 'litiges',       label: 'Litiges et juridiction' },
];

const CGVSmartTrocPage: React.FC = () => {
  const lastUpdated = '12 juin 2026';
  const [activeSection, setActiveSection] = useState<string>('objet');

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
      <Helmet>
        <title>Conditions Smart Troc | Xeption Network — ETS XEPTION</title>
        <meta
          name="description"
          content="Conditions spécifiques au service Smart Troc d’ETS XEPTION : reprise d’appareils mobiles, estimation IA, frais, bon de reprise et conditions de refus."
        />
        <link rel="canonical" href="https://www.xeptionetwork.shop/cgv-smart-troc" />
      </Helmet>

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="max-w-6xl mx-auto relative z-10">

          {/* Header */}
          <div className={`${INSTITUTIONAL_PAGE_HEADER_CLASS} mb-16`}>
            <div className={INSTITUTIONAL_HEADER_BADGE_CLASS}>
              <RefreshCw className="w-3.5 h-3.5" />
              Smart Troc — Conditions spécifiques
            </div>
            <h1 className={INSTITUTIONAL_PAGE_TITLE_CLASS}>
              Conditions <span className="text-xeption-gold">Smart Troc</span>
            </h1>
            <p className={INSTITUTIONAL_PAGE_LEAD_CLASS}>
              Conditions applicables au service de reprise d’appareils mobiles d’ETS XEPTION. Ces conditions complètent les{' '}
              <Link to="/cgv" className="text-xeption-gold hover:underline">Conditions Générales de Vente</Link>.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-white/75 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <TOC items={SECTIONS} activeId={activeSection} />

            <div className="flex-1 space-y-8 w-full">

            {/* 1. Objet */}
            <Section id="objet" number="01" icon={<RefreshCw className="w-5 h-5" />} title="Objet du service Smart Troc">
              <p>
                La rubrique <strong className="text-white">Smart Troc</strong> regroupe deux services en ligne distincts, accessibles via{' '}
                <Link to="/troc" className="text-xeption-gold hover:underline">/troc</Link>, ouverts à toute personne majeure résidant au Cameroun et propriétaire légitime de l’appareil concerné :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>
                  <strong className="text-white">Troquer mon appareil</strong> — estimation indicative du prix de reprise et émission d’un bon d’achat applicable en boutique ({formatTrocFee(TROC_TIER_PRICES[TROC_TUNNEL_TIER])} de frais de service) ;
                </li>
                <li>
                  <strong className="text-white">Certifier mon appareil</strong> — vérification IMEI et délivrance d’un certificat officiel pour rassurer un acheteur, sans reprise ({formatTrocFee(TROC_TIER_PRICES.certif)} de frais de service).
                </li>
              </ul>
              <p>
                Le Client choisit le service adapté à son besoin <strong className="text-white">dès l’entrée du parcours</strong>. Le montant affiché à ce stade est celui appliqué au paiement.
              </p>
            </Section>

            {/* 2. Processus */}
            <Section id="processus" number="02" icon={<FileText className="w-5 h-5" />} title="Processus d’évaluation">
              <p>
                Selon le service choisi, le parcours en ligne se déroule comme suit. Dans les deux cas, la validation définitive intervient en boutique pour la reprise, ou s’achève à la délivrance du certificat pour la certification.
              </p>

              <p className="text-white font-semibold text-sm mt-4 mb-2">
                A. Troquer mon appareil — reprise
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-2 text-white/90">
                <li>Choix du type d’appareil (téléphone mobile lorsque le service est ouvert)</li>
                <li>Renseignement du formulaire (marque, modèle, état déclaré, coordonnées)</li>
                <li>Vérification du numéro IMEI</li>
                <li>Envoi de photographies claires de l’appareil</li>
                <li>Paiement des frais de service ({formatTrocFee(TROC_TIER_PRICES[TROC_TUNNEL_TIER])} — cf. article 3)</li>
                <li>Analyse automatisée par intelligence artificielle</li>
                <li>Consultation du résultat et émission d’un bon de reprise indicatif</li>
              </ol>
              <p>
                La validation définitive de l’offre de reprise intervient lors du dépôt physique de l’appareil en boutique, après vérification par notre technicien.
              </p>

              <p className="text-white font-semibold text-sm mt-6 mb-2">
                B. Certifier mon appareil — certification IMEI
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-2 text-white/90">
                <li>Saisie de l’identité du Client, de ses coordonnées et du numéro IMEI</li>
                <li>Vérification IMEI en ligne</li>
                <li>Paiement des frais de service ({formatTrocFee(TROC_TIER_PRICES.certif)} — cf. article 3)</li>
                <li>Génération et téléchargement du certificat officiel</li>
              </ol>
              <p>
                Ce parcours ne produit pas de bon de reprise et ne constitue pas une offre d’achat de l’appareil par ETS XEPTION.
              </p>
            </Section>

            {/* 3. Frais */}
            <Section id="frais" number="03" icon={<CreditCard className="w-5 h-5" />} title="Frais de service">
              <TrocServiceFeesLegal />
            </Section>

            {/* 4. Estimation indicative */}
            <Section id="estimation" number="04" icon={<Smartphone className="w-5 h-5" />} title="Caractère indicatif de l’estimation">
              <p>
                L’estimation produite par le service est <strong className="text-white">indicative</strong> et <strong className="text-white">non contractuelle</strong>. Elle repose sur les déclarations du Client, les photographies fournies et l’analyse algorithmique des données.
              </p>
              <p>
                La <strong className="text-white">valeur définitive de reprise</strong> est confirmée uniquement après vérification physique de l’appareil en boutique par notre technicien, qui peut :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>Confirmer l’estimation initiale</li>
                <li>Réviser le montant à la hausse ou à la baisse selon l’état réel</li>
                <li>Refuser la reprise dans les cas prévus à l’article 7</li>
              </ul>
            </Section>

            {/* 5. Bon de reprise */}
            <Section id="bon" number="05" icon={<Award className="w-5 h-5" />} title="Bon de reprise">
              <p>
                À l’issue de l’évaluation, un <strong className="text-white">bon de reprise nominatif</strong> est généré et téléchargeable au format PDF. Ce bon mentionne :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>L’identité du Client</li>
                <li>L’appareil concerné (marque, modèle, IMEI)</li>
                <li>La valeur estimée de reprise</li>
                <li>La date d’émission et la date d’expiration</li>
              </ul>
              <p>
                Le bon est valable <strong className="text-white">trente (30) jours calendaires</strong> à compter de son émission. Passé ce délai, une nouvelle évaluation est nécessaire.
              </p>
              <p>
                Le bon n’a pas valeur de paiement et ne peut être cédé à un tiers. Sa présentation à la boutique est requise lors du dépôt de l’appareil.
              </p>
            </Section>

            {/* 6. Photos et IMEI */}
            <Section id="photos" number="06" icon={<Camera className="w-5 h-5" />} title="Vérification des photos et de l’IMEI">
              <p>
                Le Client s’engage à fournir des <strong className="text-white">photographies authentiques et récentes</strong> de l’appareil qu’il souhaite faire reprendre. Sont expressément exclues :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>Les captures d’écran et images marketing</li>
                <li>Les photographies d’un autre appareil</li>
                <li>Les images générées ou retouchées artificiellement</li>
                <li>Les visuels où l’appareil n’est pas identifiable</li>
              </ul>
              <p>
                Le système peut signaler une ou plusieurs photographies non conformes et demander leur remplacement avant de poursuivre l’évaluation. Cette demande ne constitue pas une accusation de fraude.
              </p>
              <p>
                Le numéro IMEI saisi est croisé avec les bases de données disponibles afin de vérifier la cohérence avec l’appareil déclaré et l’absence de signalement (vol, blocage opérateur).
              </p>
            </Section>

            {/* 7. Conditions de refus */}
            <Section id="refus" number="07" icon={<Ban className="w-5 h-5" />} title="Conditions de refus">
              <p>
                ETS XEPTION se réserve le droit de refuser ou de suspendre la reprise dans les situations suivantes :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>Appareil ne s’allumant pas ou présentant un défaut de fonctionnement majeur</li>
                <li>Dégâts d’eau avérés rendant l’appareil non récupérable</li>
                <li>Compte iCloud, Google ou autre verrou propriétaire non levé lors du dépôt</li>
                <li>IMEI signalé comme volé ou bloqué par un opérateur</li>
                <li>État physique sensiblement différent des déclarations et photographies fournies</li>
                <li>Soupçon avéré de fraude ou de vol</li>
              </ul>
              <p>
                Pour les cas de comptes verrouillés, notre technicien peut, en boutique, accompagner le Client dans la procédure de déverrouillage si celui-ci dispose des identifiants.
              </p>
              <p>
                En cas de refus à distance avant dépôt, le Client conserve la faculté d’apporter l’appareil en boutique pour une expertise physique gratuite.
              </p>
            </Section>

            {/* 8. Données */}
            <Section id="donnees" number="08" icon={<Database className="w-5 h-5" />} title="Données et photographies collectées">
              <p>
                Dans le cadre du service Smart Troc, les données suivantes sont collectées et traitées :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>Identité du Client (nom, téléphone, email)</li>
                <li>Caractéristiques déclarées de l’appareil</li>
                <li>Photographies de l’appareil</li>
                <li>Numéro IMEI</li>
              </ul>
              <p>
                Ces données sont utilisées <strong className="text-white">exclusivement</strong> aux fins d’évaluation, de génération du bon de reprise et de suivi du dossier en boutique. Elles ne sont jamais cédées à des tiers à des fins commerciales.
              </p>
              <p>
                Les photographies sont conservées pour la durée du processus de troc et au maximum trente (30) jours après émission du bon. Elles sont supprimées à l’issue de cette période, sauf en cas de litige en cours.
              </p>
              <p className="text-white text-xs italic">
                Pour exercer vos droits d’accès, rectification ou suppression :{' '}
                <Link to="/politique-confidentialite" className="text-xeption-gold hover:underline">
                  Politique de confidentialité
                </Link>.
              </p>
            </Section>

            {/* 9. Cession */}
            <Section id="cession" number="09" icon={<Handshake className="w-5 h-5" />} title="Cession en boutique">
              <p>
                La cession de l’appareil intervient lors du dépôt physique en boutique, après acceptation par le Client de la valeur de reprise définitive proposée par le technicien.
              </p>
              <p>
                Avant signature du bordereau de cession, le Client conserve la pleine propriété de son appareil et peut <strong className="text-white">refuser l’offre finale</strong> sans aucun frais (hormis les frais de service prévus à l’article 3, déjà acquis à ETS XEPTION).
              </p>
              <p>
                Une fois la cession signée et le paiement perçu, la transaction est <strong className="text-white">définitive</strong> et l’appareil devient la propriété d’ETS XEPTION, sous réserve des dispositions légales impératives applicables.
              </p>
              <p>
                Le Client garantit qu’il est le propriétaire légitime de l’appareil, qu’il dispose du droit de le céder et que celui-ci n’est ni volé, ni gagé, ni grevé d’un droit quelconque au profit d’un tiers. Le Client pourra être invité à présenter une <strong className="text-white">pièce d’identité valide</strong> et, le cas échéant, tout justificatif utile de propriété (facture d’achat, boîte d’origine, etc.).
              </p>
            </Section>

            {/* 10. Litiges */}
            <Section id="litiges" number="10" icon={<Gavel className="w-5 h-5" />} title="Litiges et juridiction">
              <p>
                Les présentes conditions sont régies par le <strong className="text-white">droit camerounais</strong>, en particulier la loi N°2010/021 du 21 décembre 2010 régissant le commerce électronique.
              </p>
              <p>
                En cas de différend, le Client est invité à contacter en priorité le service client d’ETS XEPTION pour rechercher une solution amiable :
              </p>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-4 py-3 mt-2">
                <Mail className="w-4 h-4 text-xeption-gold" />
                <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline font-mono text-sm">
                  support@xeptionetwork.shop
                </a>
              </div>
              <p>
                À défaut de résolution amiable, le litige sera porté devant les <strong className="text-white">juridictions camerounaises compétentes</strong>, sous réserve des règles impératives applicables.
              </p>
            </Section>

            {/* Footer note */}
            <div className={INSTITUTIONAL_FOOTER_NOTE_CLASS}>
              <p>© {new Date().getFullYear()} ETS XEPTION — Tous droits réservés.</p>
              <p className="mt-1">
                Document complémentaire aux{' '}
                <Link to="/cgv" className={INSTITUTIONAL_FOOTER_LINK_CLASS}>
                  Conditions Générales de Vente
                </Link>.
              </p>
            </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CGVSmartTrocPage;

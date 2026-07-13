import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Scale, FileText, Package, CreditCard, Truck, Undo2, ShieldCheck,
  RefreshCw, Wrench, Gavel, ChevronRight, Mail,
} from 'lucide-react';
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
  INSTITUTIONAL_TOC_CLASS,
  INSTITUTIONAL_TOC_LINK_IDLE,
} from '../constants/institutionalPageStyles';

/**
 * Conditions Générales de Vente — ETS XEPTION
 * Cadre juridique : loi camerounaise N°2010/021 du 21 décembre 2010
 * régissant le commerce électronique.
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
  <nav className={INSTITUTIONAL_TOC_CLASS} aria-label="Sommaire">
    <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest mb-3 xl:mb-4">Sommaire</p>
    <ol className="flex gap-2 overflow-x-auto no-scrollbar text-sm xl:flex-col xl:overflow-visible">
      {items.map((item, idx) => {
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

const SECTIONS = [
  { id: 'objet', label: 'Objet et acceptation' },
  { id: 'vendeur', label: 'Identité du vendeur' },
  { id: 'produits', label: 'Produits et prix' },
  { id: 'commande', label: 'Commande' },
  { id: 'paiement', label: 'Modalités de paiement' },
  { id: 'livraison', label: 'Livraison' },
  { id: 'retractation', label: 'Droit de rétractation' },
  { id: 'garanties', label: 'Garanties et SAV' },
  { id: 'smart-troc', label: 'Service Smart Troc' },
  { id: 'litiges', label: 'Loi applicable et litiges' },
];

const CGVPage: React.FC = () => {
  const lastUpdated = '08 mai 2026';
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
        <title>Conditions Générales de Vente | Xeption Network — ETS XEPTION</title>
        <meta
          name="description"
          content="Conditions Générales de Vente d'ETS XEPTION : commande, paiement Mobile Money, livraison Cameroun, garanties, droit de rétractation, service Smart Troc."
        />
        <link rel="canonical" href="https://www.xeptionetwork.shop/cgv" />
      </Helmet>

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <TOC items={SECTIONS} activeId={activeSection} />

          {/* Header */}
          <div className={`${INSTITUTIONAL_PAGE_HEADER_CLASS} mb-16`}>
            <div className={INSTITUTIONAL_HEADER_BADGE_CLASS}>
              <Scale className="w-3.5 h-3.5" />
              Conditions de vente
            </div>
            <h1 className={INSTITUTIONAL_PAGE_TITLE_CLASS}>
              Conditions <span className="text-xeption-gold">Générales</span> de Vente
            </h1>
            <p className={INSTITUTIONAL_PAGE_LEAD_CLASS}>
              Les présentes CGV régissent l'ensemble des ventes conclues sur xeptionetwork.shop entre ETS XEPTION et ses clients.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-white/75 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <div className="space-y-8 w-full snap-y snap-proximity">

            {/* 1. Objet */}
            <Section id="objet" number="01" icon={<FileText className="w-5 h-5" />} title="Objet et acceptation">
              <p>
                Les présentes Conditions Générales de Vente (ci-après <strong className="text-white">« CGV »</strong>) régissent l'ensemble des transactions conclues sur le site <strong className="text-white">xeptionetwork.shop</strong> entre <strong className="text-white">ETS XEPTION</strong>, entreprise individuelle de droit camerounais, et toute personne physique ou morale procédant à un achat (ci-après <strong className="text-white">« le Client »</strong>).
              </p>
              <p>
                Toute commande passée sur le site implique l'acceptation pleine et entière, sans réserve, des présentes CGV. Le Client reconnaît en avoir pris connaissance avant validation de sa commande.
              </p>
              <p>
                ETS XEPTION se réserve le droit de modifier ses CGV à tout moment. Les CGV applicables sont celles en vigueur à la date de la commande.
              </p>
            </Section>

            {/* 2. Vendeur */}
            <Section id="vendeur" number="02" icon={<ShieldCheck className="w-5 h-5" />} title="Identité du vendeur">
              <p>Les ventes sont effectuées par :</p>
              <div className="bg-black/40 border border-white/10 rounded-lg p-4 mt-2 space-y-2">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Raison sociale</span>
                  <span className="text-white font-medium">ETS XEPTION</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Forme juridique</span>
                  <span className="text-white">Entreprise Individuelle (EI)</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Responsable</span>
                  <span className="text-white">KUETE Ladzou Jordan</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Adresse</span>
                  <span className="text-white">Mfoundi Mall, Boutique 2063, Avenue Mgr Vogt, Marché Mfoundi, Centre-ville, Yaoundé, Cameroun</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Téléphone</span>
                  <a href="tel:+237697686684" className="text-xeption-gold hover:underline">+237 697 686 684</a>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">Email</span>
                  <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">support@xeptionetwork.shop</a>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">RCCM</span>
                  <span className="text-white font-mono text-xs">CM-NSI-01-2025-A10-01892</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <span className="text-white/75 text-xs uppercase tracking-widest sm:w-40 shrink-0">NIU</span>
                  <span className="text-white font-mono text-xs">P039916777543H</span>
                </div>
              </div>
              <p className="text-white text-xs italic mt-3">
                Informations complémentaires (hébergeur, registraire) :{' '}
                <Link to="/mentions-legales" className="text-xeption-gold hover:underline">
                  Mentions légales
                </Link>.
              </p>
            </Section>

            {/* 3. Produits et prix */}
            <Section id="produits" number="03" icon={<Package className="w-5 h-5" />} title="Produits et prix">
              <p>
                Les produits proposés sont décrits avec la plus grande précision possible (caractéristiques, photographies, accessoires inclus). Les visuels n'ont pas de valeur contractuelle ; seules les caractéristiques techniques font foi.
              </p>
              <p>
                Les prix sont exprimés en <strong className="text-white">Francs CFA (XAF)</strong>, toutes taxes comprises (TTC), hors frais de livraison. Les frais de livraison sont calculés et affichés avant la validation de la commande.
              </p>
              <p>
                ETS XEPTION se réserve le droit de modifier ses prix à tout moment. Les produits sont facturés au prix en vigueur au moment de l'enregistrement de la commande.
              </p>
              <p>
                Les offres de produits sont valables tant qu'elles sont visibles sur le site et dans la limite des stocks disponibles. En cas de rupture postérieure à la commande, le Client en est informé sans délai et remboursé intégralement le cas échéant.
              </p>
            </Section>

            {/* 4. Commande */}
            <Section id="commande" number="04" icon={<FileText className="w-5 h-5" />} title="Processus de commande">
              <p>Le Client passe commande en suivant les étapes suivantes :</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-2 text-white/90">
                <li>Sélection des produits et ajout au panier</li>
                <li>Vérification du panier et des frais de livraison</li>
                <li>Saisie des informations de livraison et de contact</li>
                <li>Choix du mode de paiement</li>
                <li>Validation de la commande et choix du mode de règlement</li>
              </ol>
              <p>
                La commande est enregistrée après validation par le Client. Une confirmation peut être envoyée par email ou via WhatsApp selon les informations communiquées lors de la commande.
              </p>
              <p>
                Conformément à la loi N°2010/021 du 21 décembre 2010, le Client peut, sur simple demande adressée à <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">support@xeptionetwork.shop</a>, obtenir dans un délai de <strong className="text-white">dix (10) jours</strong> suivant la conclusion du contrat un document écrit ou électronique récapitulant l'ensemble des données de l'opération (produits, prix, frais, livraison, identité du vendeur).
              </p>
              <p>
                ETS XEPTION se réserve le droit de refuser ou d'annuler toute commande en cas de litige antérieur, de soupçon de fraude, ou en cas d'indisponibilité du produit.
              </p>
            </Section>

            {/* 5. Paiement */}
            <Section id="paiement" number="05" icon={<CreditCard className="w-5 h-5" />} title="Modalités de paiement">
              <p>Les modes de paiement acceptés sont :</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li><strong className="text-white">Orange Money (OM)</strong> — règlement Mobile Money selon les indications communiquées au Client</li>
                <li><strong className="text-white">MTN Mobile Money (MoMo)</strong> — règlement Mobile Money selon les indications communiquées au Client</li>
                <li><strong className="text-white">Espèces</strong> — uniquement à la livraison ou au retrait en boutique</li>
              </ul>
              <p>
                Les paiements Mobile Money sont effectués directement entre le Client et son opérateur via les moyens proposés par la boutique ou affichés lors de la commande. <strong className="text-white">ETS XEPTION ne stocke jamais les codes confidentiels Mobile Money du Client.</strong>
              </p>
              <p>
                Pour les paiements Mobile Money, la préparation ou la remise de la commande peut être subordonnée à une vérification préalable par la boutique. Pour les paiements en espèces, le règlement intervient à la livraison ou au retrait. En cas d'absence de confirmation de règlement lorsqu'elle est requise, ETS XEPTION peut suspendre ou annuler la commande.
              </p>
            </Section>

            {/* 6. Livraison */}
            <Section id="livraison" number="06" icon={<Truck className="w-5 h-5" />} title="Livraison">
              <p>
                ETS XEPTION livre dans les zones suivantes : <strong className="text-white">Yaoundé, Douala</strong> et autres villes du Cameroun selon les zones desservies par nos partenaires logistiques.
              </p>
              <p>
                Les délais de livraison indicatifs sont :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li><strong className="text-white">Yaoundé</strong> — 24 à 48 heures ouvrées</li>
                <li><strong className="text-white">Douala</strong> — 48 à 72 heures ouvrées</li>
                <li><strong className="text-white">Autres villes</strong> — 3 à 7 jours ouvrés selon la destination</li>
              </ul>
              <p>
                Les frais de livraison varient selon la zone et le poids du colis. Ils sont affichés au Client avant validation de la commande.
              </p>
              <p>
                En cas de retard significatif imputable à ETS XEPTION ou au transporteur, le Client est informé et peut demander l'annulation de la commande avec remboursement intégral.
              </p>
              <p>
                Le retrait en boutique au Mfoundi Mall (Boutique 2063) reste possible à tout moment, sans frais.
              </p>
            </Section>

            {/* 7. Rétractation */}
            <Section id="retractation" number="07" icon={<Undo2 className="w-5 h-5" />} title="Droit de rétractation et retours">
              <p>
                Conformément à la <strong className="text-white">loi N°2010/021 du 21 décembre 2010</strong> régissant le commerce électronique au Cameroun, le Client dispose d'un délai de <strong className="text-white">quinze (15) jours</strong> à compter du lendemain de la réception du produit pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
              </p>
              <p>Pour exercer ce droit, le Client doit :</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-2 text-white/90">
                <li>Notifier sa décision par email à <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline">support@xeptionetwork.shop</a></li>
                <li>Retourner le produit dans son état d'origine, complet et non utilisé</li>
                <li>Joindre la facture d'achat ou la confirmation de commande</li>
              </ol>
              <p>
                Les <strong className="text-white">frais de retour sont à la charge du Client</strong>, sauf en cas de défaut de conformité ou de vice caché. Le remboursement intervient dans un délai de <strong className="text-white">quinze (15) jours</strong> à compter de la réception du produit retourné ou de la notification de rétractation pour un service.
              </p>
              <p className="text-white text-xs italic">
                Le droit de rétractation ne s'applique pas aux produits descellés ne pouvant être retournés pour des raisons d'hygiène (écouteurs intra-auriculaires par exemple), ni aux logiciels descellés ou aux biens personnalisés à la demande du Client.
              </p>
            </Section>

            {/* 8. Garanties */}
            <Section id="garanties" number="08" icon={<ShieldCheck className="w-5 h-5" />} title="Garanties et service après-vente">
              <p>
                Tous les produits vendus bénéficient des <strong className="text-white">garanties légales</strong> applicables au Cameroun, notamment la garantie de conformité et la garantie contre les vices cachés.
              </p>
              <p>
                Une garantie commerciale spécifique peut s'ajouter selon les fabricants et les produits. Sa durée et ses modalités sont précisées sur la fiche du produit ou sur la facture.
              </p>
              <p>
                En cas de défaut, panne ou non-conformité, le Client peut faire intervenir notre service après-vente :
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-4 py-3 mt-2">
                <Wrench className="w-5 h-5 text-xeption-gold shrink-0" />
                <div className="flex flex-col gap-0.5 text-sm">
                  <span className="text-white">Service Après-Vente Xeption</span>
                  <Link to="/sav" className="text-xeption-gold hover:underline text-xs">
                    Ouvrir un dossier SAV →
                  </Link>
                </div>
              </div>
              <p className="text-white text-xs italic">
                Les pannes liées à un usage anormal, une chute, un dégât d'eau ou une intervention non autorisée ne sont pas couvertes par la garantie.
              </p>
            </Section>

            {/* 9. Smart Troc */}
            <Section id="smart-troc" number="09" icon={<RefreshCw className="w-5 h-5" />} title="Service Smart Troc — Reprise d'appareils">
              <p>
                La rubrique <strong className="text-white">Smart Troc</strong> propose deux services distincts en ligne : la reprise d’un appareil mobile (bon d’achat en boutique) et la certification IMEI (certificat pour un acheteur). Le Client choisit son besoin et le tarif correspondant dès l’entrée du parcours sur{' '}
                <Link to="/troc" className="text-xeption-gold hover:underline">/troc</Link>.
              </p>
              <p>
                Pour la reprise, le processus comprend une <strong className="text-white">estimation à distance</strong> basée sur les déclarations du Client, les photographies fournies et l'analyse automatisée par intelligence artificielle. Cette estimation est <strong className="text-white">indicative</strong> ; la valeur définitive de reprise est confirmée lors du dépôt physique de l'appareil en boutique.
              </p>
              <p>
                Un <strong className="text-white">frais de service forfaitaire</strong> est demandé avant l’accès au résultat ou au certificat :{' '}
                {formatTrocFee(TROC_TIER_PRICES[TROC_TUNNEL_TIER])} pour « Troquer mon appareil »,{' '}
                {formatTrocFee(TROC_TIER_PRICES.certif)} pour « Certifier mon appareil ». Le détail figure dans les{' '}
                <Link to="/cgv-smart-troc" className="text-xeption-gold hover:underline">
                  conditions Smart Troc
                </Link>
                . Ce montant est non remboursable ; pour une reprise effective, il s&apos;applique en déduction du crédit boutique.
              </p>
              <p>
                Le bon de reprise généré est valable <strong className="text-white">trente (30) jours</strong> à compter de son émission, sous réserve de présentation de l'appareil dans son état déclaré.
              </p>
              <p>
                ETS XEPTION se réserve le droit de refuser ou de réviser la reprise dans les cas suivants :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-white/90">
                <li>Appareil ne s'allumant pas</li>
                <li>Dégâts d'eau avérés</li>
                <li>Compte iCloud ou Google verrouillé non levé en boutique</li>
                <li>IMEI signalé volé ou bloqué</li>
                <li>État physique sensiblement différent de la déclaration et des photos fournies</li>
              </ul>
              <p className="text-white text-xs italic">
                Les photographies transmises dans le cadre du Smart Troc sont utilisées exclusivement pour l'évaluation de l'appareil et ne sont jamais cédées à des tiers.
              </p>
            </Section>

            {/* 10. Litiges */}
            <Section id="litiges" number="10" icon={<Gavel className="w-5 h-5" />} title="Loi applicable et règlement des litiges">
              <p>
                Les présentes CGV sont régies par le <strong className="text-white">droit camerounais</strong>, notamment la loi N°2010/021 du 21 décembre 2010 régissant le commerce électronique au Cameroun.
              </p>
              <p>
                En cas de litige, le Client est invité à contacter en priorité le service client d'ETS XEPTION afin de rechercher une solution amiable :
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
                Pour toute question, contactez-nous à{' '}
                <a href="mailto:support@xeptionetwork.shop" className={INSTITUTIONAL_FOOTER_LINK_CLASS}>
                  support@xeptionetwork.shop
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CGVPage;

import type { ArticleDef } from './types';

/**
 * Espace « Aide & SAV » (/aide, /aide/:slug).
 * Les engagements cités doivent rester alignés sur pages/CGVPage.tsx et pages/CGVSmartTrocPage.tsx.
 */
export const HELP_TOPICS: ArticleDef[] = [
  {
    slug: 'garanties',
    navLabel: 'Garanties et SAV',
    h1: 'Garanties et service après-vente',
    title: 'Garanties et SAV | Aide Xeption',
    metaDescription:
      "Garantie de conformité, vices cachés, garantie commerciale et dossier SAV : comment Xeption prend en charge une panne ou un défaut sur votre appareil.",
    summary: 'Ce qui est couvert, et comment ouvrir un dossier SAV.',
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'couverture',
        heading: 'Ce qui est couvert',
        paragraphs: [
          "Tous les produits vendus bénéficient des garanties légales applicables au Cameroun, notamment la garantie de conformité et la garantie contre les vices cachés.",
          "Une garantie commerciale spécifique peut s'ajouter selon les fabricants et les produits : sa durée et ses modalités sont précisées sur la fiche produit ou sur la facture.",
        ],
      },
      {
        id: 'exclusions',
        heading: "Ce qui n'est pas couvert",
        paragraphs: [
          "Les pannes liées à un usage anormal, une chute, un dégât d'eau ou une intervention non autorisée ne sont pas couvertes.",
        ],
      },
      {
        id: 'dossier',
        heading: 'Ouvrir un dossier SAV',
        paragraphs: ["Décrivez la panne en ligne : notre équipe vous recontacte pour la prise en charge."],
        links: [{ to: '/sav', label: 'Ouvrir un dossier SAV' }],
      },
    ],
    relatedLandings: [],
  },
  {
    slug: 'livraison',
    navLabel: 'Livraison et retrait',
    h1: 'Livraison et retrait en boutique',
    title: 'Livraison au Cameroun et retrait | Aide Xeption',
    metaDescription:
      "Délais et zones de livraison Xeption : Yaoundé 24 à 48 h, Douala 48 à 72 h, autres villes 3 à 7 jours. Retrait gratuit au Mfoundi Mall à Yaoundé.",
    summary: 'Zones, délais, frais et retrait gratuit en boutique.',
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'delais',
        heading: 'Délais indicatifs',
        paragraphs: ['Selon la destination :'],
        bullets: [
          'Yaoundé : 24 à 48 heures ouvrées.',
          'Douala : 48 à 72 heures ouvrées.',
          'Autres villes du Cameroun : 3 à 7 jours ouvrés, selon les zones desservies par nos partenaires logistiques.',
        ],
      },
      {
        id: 'frais',
        heading: 'Frais de livraison',
        paragraphs: [
          "Les frais varient selon la zone et le poids du colis. Ils sont affichés avant la validation de la commande.",
        ],
      },
      {
        id: 'retrait',
        heading: 'Retrait en boutique',
        paragraphs: [
          "Le retrait au Mfoundi Mall (Boutique 2063, Avenue Mgr Vogt, Yaoundé) est possible sans frais.",
        ],
      },
      {
        id: 'suivi',
        heading: 'Suivre sa commande',
        paragraphs: ['Retrouvez l’avancement de votre commande à tout moment.'],
        links: [{ to: '/tracking', label: 'Suivre ma commande' }],
      },
    ],
    relatedLandings: [],
  },
  {
    slug: 'paiement',
    navLabel: 'Moyens de paiement',
    h1: 'Moyens de paiement',
    title: 'Paiement Orange Money, MoMo et espèces | Aide Xeption',
    metaDescription:
      "Payez vos achats Xeption par Orange Money, MTN Mobile Money ou en espèces à la livraison ou au retrait. Vos codes confidentiels ne sont jamais stockés.",
    summary: 'Orange Money, MTN MoMo, espèces : ce qui est accepté.',
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'moyens',
        heading: 'Moyens acceptés',
        paragraphs: ['Vous pouvez régler par :'],
        bullets: [
          'Orange Money (OM).',
          'MTN Mobile Money (MoMo).',
          'Espèces, uniquement à la livraison ou au retrait en boutique.',
        ],
      },
      {
        id: 'securite',
        heading: 'Sécurité',
        paragraphs: [
          "Les paiements Mobile Money se font directement entre vous et votre opérateur. Xeption ne stocke jamais vos codes confidentiels.",
        ],
      },
      {
        id: 'confirmation',
        heading: 'Confirmation de la commande',
        paragraphs: [
          "Pour un paiement Mobile Money, la préparation de la commande peut attendre la confirmation du règlement. Sans confirmation lorsqu'elle est requise, la commande peut être suspendue ou annulée.",
        ],
      },
    ],
    relatedLandings: [],
  },
  {
    slug: 'retours',
    navLabel: 'Retours et remboursements',
    h1: 'Retours, échanges et remboursements',
    title: 'Retours et remboursements | Aide Xeption',
    metaDescription:
      "15 jours pour changer d'avis : conditions de retour, échange ou remboursement chez Xeption, exceptions et délai de remboursement expliqués simplement.",
    summary: '15 jours pour changer d’avis, échange ou remboursement.',
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'delai',
        heading: 'Délai de rétractation',
        paragraphs: [
          "Vous disposez de 15 jours à compter du lendemain de la réception pour exercer votre droit de rétractation, sans justification ni pénalité.",
        ],
      },
      {
        id: 'procedure',
        heading: 'Comment retourner un produit',
        paragraphs: [
          "Rapportez le produit en boutique (Mfoundi Mall, Boutique 2063), dans son état d'origine, complet et non utilisé. Vous choisissez entre un échange et un remboursement, sans frais de remise en stock.",
          "Les frais de retour sont à votre charge, sauf défaut de conformité ou vice caché. Le remboursement intervient sous 15 jours.",
        ],
      },
      {
        id: 'exceptions',
        heading: 'Exceptions',
        paragraphs: [
          "Ne peuvent pas être retournés : les produits descellés pour raison d'hygiène (écouteurs intra-auriculaires par exemple), les logiciels descellés et les biens personnalisés.",
        ],
      },
    ],
    relatedLandings: [],
  },
  {
    slug: 'smart-troc',
    navLabel: 'Smart Troc (reprise)',
    h1: 'Smart Troc : reprise et certification de téléphone',
    title: 'Smart Troc : reprise de téléphone | Aide Xeption',
    metaDescription:
      "Faites estimer votre téléphone en ligne et obtenez un bon d'achat, ou certifiez son IMEI pour le revendre : fonctionnement de Smart Troc chez Xeption.",
    summary: 'Reprise contre bon d’achat, ou certification IMEI.',
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'services',
        heading: 'Deux services',
        paragraphs: ['Smart Troc propose :'],
        bullets: [
          "Troquer mon appareil : estimation indicative du prix de reprise et bon d'achat utilisable en boutique.",
          "Certifier mon appareil : vérification IMEI et certificat pour rassurer un acheteur, sans reprise.",
        ],
      },
      {
        id: 'etapes',
        heading: 'Les étapes de la reprise',
        paragraphs: [
          "Vous décrivez l'appareil, envoyez des photos et l'IMEI, puis réglez les frais de service affichés dans le parcours. L'estimation est indicative : la valeur définitive est confirmée lors du dépôt en boutique, après vérification par un technicien.",
        ],
        links: [
          { to: '/troc', label: 'Lancer une estimation' },
          { to: '/cgv-smart-troc', label: 'Conditions Smart Troc' },
        ],
      },
    ],
    relatedLandings: [],
    relatedGuides: ['preparer-telephone-reprise-smart-troc'],
  },
];

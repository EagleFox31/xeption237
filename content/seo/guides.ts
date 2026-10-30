import { CATEGORY_SLUGS } from '../../constants/dbSchema';
import type { ArticleDef } from './types';

/** Guides d'achat (/guides/:slug), reliés aux landings et aux fiches produit. */
export const GUIDES: ArticleDef[] = [
  {
    slug: 'quel-smartphone-100000-fcfa',
    navLabel: 'Quel smartphone avec 100 000 FCFA ?',
    h1: 'Quel smartphone acheter avec 100 000 FCFA au Cameroun ?',
    title: 'Quel smartphone acheter avec 100 000 FCFA au Cameroun ?',
    metaDescription:
      "Batterie, stockage, appareil photo, neuf ou reconditionné : les critères pour bien choisir un smartphone à 100 000 FCFA au Cameroun, avec notre sélection.",
    summary: "Les critères qui comptent vraiment dans ce budget, et les pièges à éviter.",
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'usage',
        heading: "Partir de votre usage",
        paragraphs: [
          "Avant de comparer les fiches, listez ce que vous faites le plus : appels et WhatsApp, réseaux sociaux, photos, jeux ou travail. Dans ce budget, aucun téléphone n'excelle partout : il faut prioriser.",
        ],
      },
      {
        id: 'criteres',
        heading: 'Les critères prioritaires',
        paragraphs: ["Dans l'ordre, pour la plupart des utilisateurs :"],
        bullets: [
          "Batterie : 5000 mAh ou plus pour tenir une journée complète.",
          "Stockage : 64 Go minimum, 128 Go pour garder photos et applications sans tri permanent.",
          "Mémoire vive : 4 Go minimum pour rester fluide avec WhatsApp, Facebook et TikTok ouverts.",
          "Écran : un écran de 90 Hz ou 120 Hz rend la navigation plus agréable.",
          "Mises à jour : un modèle récent reste sécurisé plus longtemps.",
        ],
      },
      {
        id: 'reconditionne',
        heading: 'Penser au reconditionné',
        paragraphs: [
          "Pour le même prix, un ancien haut de gamme reconditionné offre souvent un meilleur appareil photo et une meilleure finition qu'un neuf d'entrée de gamme. En contrepartie, vérifiez l'état de la batterie et la garantie indiquée.",
        ],
        links: [{ to: '/guides/occasion-reconditionne-ou-neuf', label: 'Occasion, reconditionné ou neuf : les différences' }],
      },
      {
        id: 'troc',
        heading: 'Réduire la facture avec votre ancien téléphone',
        paragraphs: [
          "Votre ancien appareil a encore de la valeur : Smart Troc l'estime en ligne et vous remet un bon d'achat utilisable en boutique.",
        ],
        links: [{ to: '/guides/preparer-telephone-reprise-smart-troc', label: 'Préparer son téléphone pour une reprise' }],
      },
    ],
    faq: [
      {
        q: "Vaut-il mieux un neuf d'entrée de gamme ou un reconditionné ?",
        a: "Si la photo et la fluidité comptent, un reconditionné haut de gamme est souvent meilleur. Si vous voulez la batterie neuve et la plus longue durée de mises à jour, choisissez un neuf récent.",
      },
      {
        q: "32 Go de stockage suffisent-ils ?",
        a: "Rarement : le système et les applications en occupent une grande partie. Visez au moins 64 Go.",
      },
    ],
    relatedLandings: ['telephones-moins-100000-fcfa', 'smartphones-samsung-cameroun'],
    relatedGuides: ['occasion-reconditionne-ou-neuf'],
    products: {
      filter: { categories: [CATEGORY_SLUGS.PHONES], minPrice: 1, maxPrice: 100000, inStockOnly: true },
      limit: 8,
      sort: 'price-asc',
    },
    appliesTo: { categories: [CATEGORY_SLUGS.PHONES], minPrice: 1, maxPrice: 120000 },
  },
  {
    slug: 'occasion-reconditionne-ou-neuf',
    navLabel: 'Occasion, reconditionné ou neuf ?',
    h1: 'Occasion, reconditionné et neuf : quelles différences ?',
    title: 'Occasion, reconditionné ou neuf : quelles différences ?',
    metaDescription:
      "Téléphone ou PC d'occasion, reconditionné ou neuf : contrôle, garantie, prix et risques expliqués simplement pour acheter sereinement au Cameroun.",
    summary: "Trois façons d'acheter, trois niveaux de risque et de prix.",
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'neuf',
        heading: 'Le neuf',
        paragraphs: [
          "Appareil jamais utilisé, dans son emballage d'origine. C'est l'option la plus chère, avec une batterie neuve et la durée de mises à jour logicielles la plus longue.",
        ],
      },
      {
        id: 'occasion',
        heading: "L'occasion entre particuliers",
        paragraphs: [
          "Appareil revendu tel quel par son propriétaire. Le prix est bas, mais rien n'est contrôlé : état de la batterie, pièces remplacées, compte iCloud ou Google encore lié, voire appareil déclaré volé.",
        ],
        links: [{ to: '/guides/verifier-iphone-occasion', label: "Que vérifier avant d'acheter un iPhone d'occasion" }],
      },
      {
        id: 'reconditionne',
        heading: 'Le reconditionné',
        paragraphs: [
          "Appareil d'occasion contrôlé et remis en état de fonctionnement par un professionnel avant la revente. Il coûte moins cher que le neuf, et le vendeur engage sa responsabilité : garanties légales, droit de rétractation et service après-vente.",
        ],
      },
      {
        id: 'choisir',
        heading: 'Comment choisir',
        paragraphs: ['En résumé :'],
        bullets: [
          "Budget serré et besoin de fiabilité : reconditionné.",
          "Usage intensif sur plusieurs années : neuf.",
          "Occasion entre particuliers : seulement si vous pouvez tout vérifier vous-même.",
        ],
      },
    ],
    faq: [
      {
        q: "Un produit reconditionné est-il garanti ?",
        a: "Chez Xeption, tous les produits bénéficient des garanties légales applicables au Cameroun ; une garantie commerciale éventuelle est indiquée sur la fiche et la facture.",
      },
      {
        q: "Puis-je retourner un produit reconditionné ?",
        a: "Oui, dans les 15 jours suivant la réception, produit complet et dans son état d'origine.",
      },
    ],
    relatedLandings: ['pc-portables-reconditionnes-cameroun', 'iphone-cameroun', 'telephones-moins-100000-fcfa'],
    relatedGuides: ['verifier-iphone-occasion', 'quel-smartphone-100000-fcfa'],
    products: {
      filter: { conditions: ['refurbished'], inStockOnly: true },
      limit: 8,
      sort: 'newest',
    },
    appliesTo: { conditions: ['refurbished'] },
  },
  {
    slug: 'verifier-iphone-occasion',
    navLabel: "Vérifier un iPhone d'occasion",
    h1: "Que vérifier avant d'acheter un iPhone d'occasion ?",
    title: "Que vérifier avant d'acheter un iPhone d'occasion ?",
    metaDescription:
      "iCloud, IMEI, batterie, Face ID, écran : la liste des contrôles à faire avant d'acheter un iPhone d'occasion au Cameroun pour éviter les mauvaises surprises.",
    summary: "La liste de contrôle à suivre point par point avant de payer.",
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'icloud',
        heading: 'Compte iCloud déconnecté',
        paragraphs: [
          "Dans Réglages, le nom du vendeur ne doit plus apparaître et « Localiser mon iPhone » doit être désactivé. Un iPhone encore lié à un compte iCloud est inutilisable après réinitialisation.",
        ],
      },
      {
        id: 'imei',
        heading: "Numéro IMEI",
        paragraphs: [
          "Composez *#06# et comparez l'IMEI affiché avec celui du tiroir SIM et de la boîte. Faites-le vérifier pour écarter un appareil déclaré perdu ou volé.",
        ],
        links: [{ to: '/troc', label: 'Certifier un appareil avec Smart Troc' }],
      },
      {
        id: 'batterie',
        heading: 'État de la batterie',
        paragraphs: [
          "Réglages > Batterie > État de la batterie. En dessous de 80 % de capacité maximale, prévoyez un remplacement à court terme.",
        ],
      },
      {
        id: 'fonctions',
        heading: 'Tester les fonctions essentielles',
        paragraphs: ['Prenez cinq minutes pour tester :'],
        bullets: [
          "Face ID ou Touch ID.",
          "Écran : pixels morts, taches, tactile sur toute la surface.",
          "Appareils photo avant et arrière, flash.",
          "Haut-parleurs, micro (appel test) et charge.",
          "Réseau : insérez votre carte SIM et passez un appel.",
        ],
      },
      {
        id: 'pieces',
        heading: 'Pièces d’origine',
        paragraphs: [
          "Dans Réglages > Général > Informations, l'iPhone signale les pièces remplacées (écran, batterie, caméra) par des pièces non authentiques.",
        ],
      },
    ],
    faq: [
      {
        q: "Comment savoir si un iPhone est volé ?",
        a: "Vérifiez que le compte iCloud est déconnecté et faites contrôler l'IMEI. Méfiez-vous d'un vendeur qui refuse ces vérifications.",
      },
      {
        q: "Quel état de batterie accepter ?",
        a: "Au-dessus de 85 %, la batterie est en bon état. Entre 80 et 85 %, l'autonomie est réduite. En dessous de 80 %, un remplacement est à prévoir.",
      },
    ],
    relatedLandings: ['iphone-cameroun'],
    relatedGuides: ['occasion-reconditionne-ou-neuf', 'preparer-telephone-reprise-smart-troc'],
    products: {
      filter: { categories: [CATEGORY_SLUGS.PHONES], brands: ['Apple'], nameIncludes: ['iphone'], inStockOnly: true },
      limit: 8,
      sort: 'newest',
    },
    appliesTo: { brands: ['Apple'], nameIncludes: ['iphone'] },
  },
  {
    slug: 'preparer-telephone-reprise-smart-troc',
    navLabel: 'Préparer une reprise Smart Troc',
    h1: 'Comment préparer son téléphone pour une reprise Smart Troc ?',
    title: 'Préparer son téléphone pour une reprise Smart Troc',
    metaDescription:
      "Sauvegarde, déconnexion iCloud ou Google, photos, IMEI : les étapes pour préparer votre téléphone avant une reprise Smart Troc chez Xeption à Yaoundé.",
    summary: "Les étapes avant l'estimation en ligne et le dépôt en boutique.",
    updatedAt: '2026-10-30',
    sections: [
      {
        id: 'fonctionnement',
        heading: 'Comment fonctionne Smart Troc',
        paragraphs: [
          "Vous décrivez votre appareil et envoyez des photos : une estimation indicative est calculée en ligne. La valeur définitive est confirmée lors du dépôt de l'appareil en boutique, après vérification par un technicien. Vous recevez alors un bon d'achat utilisable en boutique.",
        ],
        links: [{ to: '/aide/smart-troc', label: 'Smart Troc en détail' }],
      },
      {
        id: 'sauvegarde',
        heading: '1. Sauvegarder vos données',
        paragraphs: [
          "Sauvegardez photos, contacts et conversations WhatsApp (iCloud, Google Drive ou ordinateur) : l'appareil sera réinitialisé.",
        ],
      },
      {
        id: 'comptes',
        heading: '2. Déconnecter vos comptes',
        paragraphs: [
          "Sur iPhone, désactivez « Localiser » et déconnectez-vous d'iCloud. Sur Android, supprimez le compte Google dans les paramètres. Sans cela, l'appareil reste verrouillé et ne peut pas être repris.",
        ],
      },
      {
        id: 'photos',
        heading: '3. Prendre de bonnes photos',
        paragraphs: ["Pour une estimation fidèle :"],
        bullets: [
          "Écran allumé, face avant et dos, sous une lumière franche.",
          "Rayures et fissures visibles, sans les masquer.",
          "Pas de coque ni de protection d'écran sur les photos.",
        ],
      },
      {
        id: 'imei',
        heading: "4. Noter l'IMEI",
        paragraphs: ["Composez *#06# pour afficher l'IMEI : il vous sera demandé pendant le parcours."],
      },
      {
        id: 'depot',
        heading: '5. Déposer en boutique',
        paragraphs: [
          "Apportez l'appareil, si possible avec son chargeur et sa boîte, au Mfoundi Mall (Boutique 2063, Yaoundé) pour la validation définitive.",
        ],
      },
    ],
    faq: [
      {
        q: "L'estimation en ligne est-elle définitive ?",
        a: "Non, elle est indicative. La valeur de reprise est confirmée en boutique après vérification de l'appareil.",
      },
      {
        q: "Où utiliser le bon de reprise ?",
        a: "Le bon d'achat s'utilise en boutique Xeption, sur l'achat d'un nouvel appareil.",
      },
    ],
    relatedLandings: ['iphone-cameroun', 'smartphones-samsung-cameroun'],
    relatedGuides: ['verifier-iphone-occasion'],
    appliesTo: { categories: [CATEGORY_SLUGS.PHONES] },
  },
];

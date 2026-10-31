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
  {
    slug: 'quel-pc-portable-200000-fcfa',
    navLabel: 'Quel PC portable avec 200 000 FCFA ?',
    h1: 'Quel PC portable acheter avec 200 000 FCFA au Cameroun ?',
    title: 'Quel PC portable acheter avec 200 000 FCFA au Cameroun ?',
    metaDescription:
      "SSD, mémoire, processeur, Windows 11 : les critères pour choisir un PC portable à 200 000 FCFA au Cameroun pour les études ou le travail, avec notre sélection.",
    summary: 'Études, bureautique ou travail : les critères qui comptent et les compromis à accepter.',
    updatedAt: '2026-10-31',
    sections: [
      {
        id: 'usage',
        heading: 'Partir de votre usage',
        paragraphs: [
          "Pour les études et la bureautique (Word, Excel, navigateur, visioconférence), un ordinateur professionnel reconditionné est le meilleur choix dans ce budget. Les logiciels lourds (montage vidéo, jeux récents, 3D) demandent un budget plus élevé.",
        ],
      },
      {
        id: 'criteres',
        heading: 'Les critères prioritaires',
        paragraphs: ['Dans cet ordre :'],
        bullets: [
          "SSD obligatoire : c'est lui qui rend l'ordinateur rapide au démarrage et à l'ouverture des logiciels. Évitez les disques durs classiques (HDD).",
          "Mémoire vive : 8 Go minimum, 16 Go pour travailler avec de nombreux onglets et logiciels ouverts.",
          "Processeur : un Intel Core i5 ou un AMD Ryzen 5 récent suffit largement. Un Core i5 récent vaut souvent mieux qu'un Core i7 ancien.",
          "Écran : 14 pouces est le bon compromis entre confort et transport.",
          "Batterie : sur un reconditionné, demandez son état avant l'achat.",
        ],
      },
      {
        id: 'windows',
        heading: 'Vérifier la compatibilité Windows 11',
        paragraphs: [
          "Microsoft a arrêté les mises à jour de sécurité de Windows 10 en octobre 2025. Windows 11 exige officiellement un processeur Intel de 8e génération ou un AMD Ryzen 2000 et plus récents : vérifiez ce point sur la fiche avant de choisir un modèle ancien.",
        ],
      },
      {
        id: 'gammes-pro',
        heading: 'Pourquoi les gammes professionnelles',
        paragraphs: [
          "HP EliteBook et ProBook, Lenovo ThinkPad, Dell Latitude : ces gammes sont conçues pour les entreprises. Châssis robuste, clavier confortable et pièces faciles à trouver : reconditionnées, elles offrent plus de fiabilité qu'un PC grand public neuf au même prix.",
        ],
        links: [
          { to: '/categorie/pc-portables-hp-cameroun', label: 'Les PC portables HP' },
          { to: '/categorie/pc-portables-reconditionnes-cameroun', label: 'Tous les PC reconditionnés' },
        ],
      },
      {
        id: 'compromis',
        heading: 'Les compromis à accepter',
        paragraphs: [
          "Dans ce budget, on choisit entre plusieurs avantages. Un modèle 2-en-1 tactile est pratique pour prendre des notes, mais offre souvent moins de puissance au même prix. Un modèle plus récent garantit Windows 11 plus longtemps, parfois avec moins de mémoire : la mémoire peut souvent être augmentée plus tard, pas le processeur.",
        ],
      },
    ],
    faq: [
      {
        q: 'Un PC reconditionné est-il fiable pour les études ?',
        a: "Oui, s'il est contrôlé et garanti. Les gammes professionnelles sont conçues pour durer plusieurs années d'usage quotidien. La garantie applicable est précisée sur la fiche produit et sur la facture.",
      },
      {
        q: '8 Go de RAM suffisent-ils ?',
        a: "Pour la bureautique, la navigation et les cours en ligne, oui. Visez 16 Go si vous gardez beaucoup d'onglets ouverts ou utilisez des logiciels plus exigeants.",
      },
      {
        q: 'Core i5 ou Core i7 ?',
        a: "La génération compte plus que le nom : un Core i5 de 8e génération ou plus récent est plus rapide et compatible Windows 11, contrairement à certains Core i7 plus anciens.",
      },
    ],
    relatedLandings: ['pc-portables-reconditionnes-cameroun', 'pc-portables-hp-cameroun'],
    relatedGuides: ['occasion-reconditionne-ou-neuf'],
    products: {
      filter: { categories: [CATEGORY_SLUGS.ORDINATEURS], minPrice: 1, maxPrice: 200000, inStockOnly: true },
      limit: 8,
      sort: 'price-desc',
    },
    appliesTo: { categories: [CATEGORY_SLUGS.ORDINATEURS], minPrice: 1, maxPrice: 250000 },
  },
  {
    slug: 'telephone-importe-cameroun',
    navLabel: 'Téléphone importé : que vérifier ?',
    h1: 'Téléphone importé : que vérifier pour l’utiliser au Cameroun ?',
    title: 'Téléphone importé : que vérifier pour l’utiliser au Cameroun ?',
    metaDescription:
      "SIM ou eSIM, blocage opérateur, réseau, version régionale et garantie : ce qu'il faut vérifier avant d'acheter un téléphone américain, coréen ou japonais.",
    summary: 'SIM, réseau, version régionale et garantie : les points à vérifier avant de payer.',
    updatedAt: '2026-10-31',
    sections: [
      {
        id: 'origine',
        heading: "Connaître l'origine de l'appareil",
        paragraphs: [
          "Un même modèle existe en plusieurs versions selon le pays de destination (États-Unis, Corée, Japon, Europe…). Chez Xeption, l'origine des appareils importés est indiquée sur la fiche produit, à côté de l'état.",
        ],
      },
      {
        id: 'sim',
        heading: 'SIM physique ou eSIM',
        paragraphs: [
          "Certains modèles n'ont plus de tiroir SIM. Les iPhone vendus aux États-Unis depuis l'iPhone 14 fonctionnent uniquement en eSIM. Une eSIM demande que votre opérateur propose ce service : renseignez-vous auprès de lui avant l'achat.",
          "Vérifiez aussi le nombre d'emplacements si vous utilisez deux lignes.",
        ],
      },
      {
        id: 'blocage',
        heading: 'Blocage opérateur',
        paragraphs: [
          "Un téléphone vendu avec un forfait peut être bloqué sur l'opérateur d'origine, surtout aux États-Unis. Insérez votre SIM avant de payer : l'appareil doit capter le réseau et permettre d'appeler.",
        ],
      },
      {
        id: 'reseau',
        heading: 'Compatibilité réseau',
        paragraphs: [
          "Les fréquences 4G et 5G varient selon les pays. Un modèle conçu pour un autre marché peut ne capter qu'une partie des fréquences de votre opérateur. Testez la 4G avec votre SIM et comparez les bandes prises en charge, listées sur la fiche technique du fabricant.",
        ],
      },
      {
        id: 'particularites',
        heading: 'Particularités régionales',
        paragraphs: ['Quelques exemples à connaître :'],
        bullets: [
          "Japon : le son de l'appareil photo ne peut pas être désactivé, conformément à la réglementation japonaise.",
          "Certains services (paiement mobile, assistant vocal) peuvent dépendre de la région d'origine.",
          "Le chargeur fourni peut avoir une prise étrangère : prévoyez un adaptateur.",
        ],
      },
      {
        id: 'garantie',
        heading: 'Garantie',
        paragraphs: [
          "La garantie du fabricant ne s'applique pas toujours hors du pays d'achat. La garantie applicable chez Xeption est précisée sur la fiche produit et sur la facture : c'est elle qui compte pour le service après-vente.",
        ],
        links: [{ to: '/aide/garanties', label: 'Garanties et SAV' }],
      },
    ],
    faq: [
      {
        q: 'Un iPhone américain fonctionne-t-il au Cameroun ?',
        a: "Oui s'il est débloqué et que votre opérateur prend en charge l'eSIM pour les modèles sans tiroir SIM (iPhone 14 et plus récents vendus aux États-Unis). Testez votre SIM avant de payer.",
      },
      {
        q: "Comment connaître l'origine d'un téléphone chez Xeption ?",
        a: "Elle est indiquée sur la fiche produit pour les appareils importés. En cas de doute, posez la question avant l'achat.",
      },
      {
        q: "Les mises à jour sont-elles différentes selon l'origine ?",
        a: "En général, non : les mises à jour du système arrivent de la même façon. Certains services liés au pays d'origine peuvent toutefois différer.",
      },
    ],
    relatedLandings: ['iphone-cameroun', 'smartphones-samsung-cameroun', 'google-pixel-cameroun'],
    relatedGuides: ['verifier-iphone-occasion', 'occasion-reconditionne-ou-neuf'],
    appliesTo: { categories: [CATEGORY_SLUGS.PHONES], nameIncludes: ['korea', 'japan', 'esim'] },
  },
];

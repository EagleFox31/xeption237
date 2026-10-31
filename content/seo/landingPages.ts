import { CATEGORY_SLUGS } from '../../constants/dbSchema';
import type { LandingPageDef } from './types';

/**
 * Pages catégories / marques permanentes (/categorie/:slug).
 * Ne jamais écrire de prix ni de stock en dur : la sélection produits est dynamique.
 */
export const LANDING_PAGES: LandingPageDef[] = [
  {
    slug: 'iphone-cameroun',
    navLabel: 'iPhone au Cameroun',
    h1: 'iPhone au Cameroun : neufs et reconditionnés',
    title: 'iPhone au Cameroun : prix, neufs et reconditionnés | Xeption',
    metaDescription:
      "Achetez votre iPhone au Cameroun chez Xeption : modèles neufs et reconditionnés vérifiés, paiement Orange Money ou MoMo, livraison Yaoundé et Douala.",
    intro: [
      "Xeption sélectionne des iPhone neufs et reconditionnés, contrôlés en boutique au Mfoundi Mall à Yaoundé avant la vente.",
      "Comparez les modèles disponibles ci-dessous : stockage, état et prix sont indiqués sur chaque fiche.",
    ],
    buyingTips: [
      {
        title: 'Choisir le bon stockage',
        body: "128 Go suffisent pour un usage courant (réseaux sociaux, photos). Visez 256 Go si vous filmez beaucoup en 4K ou gardez de nombreuses applications.",
      },
      {
        title: 'Neuf ou reconditionné',
        body: "Un iPhone reconditionné coûte nettement moins cher qu'un neuf. Vérifiez l'état de la batterie et la garantie indiquée sur la fiche produit.",
      },
      {
        title: 'Penser à la reprise',
        body: "Avec Smart Troc, votre ancien téléphone peut être estimé en ligne et transformé en bon d'achat à utiliser en boutique.",
      },
    ],
    faq: [
      {
        q: "Les iPhone reconditionnés sont-ils vérifiés ?",
        a: "Oui. Chaque appareil est contrôlé en boutique avant la vente. L'état et la garantie applicable sont précisés sur la fiche produit et sur la facture.",
      },
      {
        q: "Comment payer un iPhone chez Xeption ?",
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
      {
        q: "Livrez-vous les iPhone hors de Yaoundé ?",
        a: "Oui : Yaoundé en 24 à 48 h ouvrées, Douala en 48 à 72 h ouvrées et les autres villes du Cameroun en 3 à 7 jours ouvrés selon la destination.",
      },
      {
        q: "Puis-je échanger mon ancien téléphone contre un iPhone ?",
        a: "Oui, via Smart Troc : estimation en ligne, puis validation définitive de la reprise lors du dépôt de l'appareil en boutique.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.PHONES], brands: ['Apple'], nameIncludes: ['iphone'] },
    sort: 'newest',
    limit: 24,
    shopHref: '/shop?cat=phones&brand=apple',
    relatedGuides: ['verifier-iphone-occasion', 'occasion-reconditionne-ou-neuf', 'preparer-telephone-reprise-smart-troc', 'iphone-12-ou-iphone-13'],
    relatedLandings: ['smartphones-samsung-cameroun', 'telephones-moins-100000-fcfa'],
    showInFooter: true,
    updatedAt: '2026-10-30',
  },
  {
    slug: 'smartphones-samsung-cameroun',
    navLabel: 'Smartphones Samsung',
    h1: 'Smartphones Samsung au Cameroun',
    title: 'Smartphones Samsung Galaxy au Cameroun | Xeption',
    metaDescription:
      "Samsung Galaxy A, S et Z au Cameroun : modèles neufs et reconditionnés, paiement Mobile Money, livraison partout au Cameroun et retrait à Yaoundé.",
    intro: [
      "De la gamme Galaxy A abordable aux Galaxy S haut de gamme, retrouvez les smartphones Samsung disponibles chez Xeption.",
      "Chaque fiche précise l'état (neuf ou reconditionné), la mémoire et la garantie applicable.",
    ],
    buyingTips: [
      {
        title: 'Galaxy A ou Galaxy S',
        body: "La gamme A couvre l'essentiel (grande batterie, bon écran) à petit prix. La gamme S apporte un meilleur appareil photo, un processeur plus puissant et un suivi logiciel plus long.",
      },
      {
        title: 'Mémoire vive et stockage',
        body: "Privilégiez au moins 6 Go de RAM pour rester fluide plusieurs années, et 128 Go de stockage si le modèle n'accepte pas de carte microSD.",
      },
      {
        title: 'Vérifier les mises à jour',
        body: "Un modèle récent reçoit plus longtemps les correctifs de sécurité Android : regardez l'année de sortie indiquée sur la fiche.",
      },
    ],
    faq: [
      {
        q: "Vendez-vous des Samsung reconditionnés ?",
        a: "Oui, aux côtés des modèles neufs. L'état de chaque appareil est indiqué sur sa fiche produit.",
      },
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "Orange Money, MTN Mobile Money, et les espèces à la livraison ou au retrait en boutique.",
      },
      {
        q: "Puis-je retirer mon Samsung en boutique ?",
        a: "Oui, le retrait au Mfoundi Mall (Boutique 2063, Yaoundé) est possible sans frais.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.PHONES], brands: ['Samsung'], nameIncludes: ['samsung', 'galaxy'] },
    sort: 'newest',
    limit: 24,
    shopHref: '/shop?cat=phones&brand=samsung',
    relatedGuides: ['quel-smartphone-100000-fcfa', 'occasion-reconditionne-ou-neuf', 'google-pixel-7-ou-samsung-galaxy-a55'],
    relatedLandings: ['iphone-cameroun', 'telephones-moins-100000-fcfa'],
    showInFooter: true,
    updatedAt: '2026-10-30',
  },
  {
    slug: 'pc-portables-reconditionnes-cameroun',
    navLabel: 'PC portables reconditionnés',
    h1: 'PC portables reconditionnés au Cameroun',
    title: 'PC portables reconditionnés au Cameroun | Xeption',
    metaDescription:
      "PC portables reconditionnés HP, Dell, Lenovo et Apple au Cameroun : machines contrôlées, garantie indiquée sur chaque fiche, livraison et retrait à Yaoundé.",
    intro: [
      "Un ordinateur portable reconditionné offre des performances professionnelles pour une fraction du prix du neuf.",
      "Les machines ci-dessous sont contrôlées avant la vente ; processeur, mémoire et stockage figurent sur chaque fiche.",
    ],
    buyingTips: [
      {
        title: 'Processeur',
        body: "Pour la bureautique et la navigation, un Intel Core i5 ou équivalent suffit. Pour le montage vidéo ou les logiciels lourds, visez un Core i7 ou une génération récente.",
      },
      {
        title: 'SSD et mémoire',
        body: "Un SSD rend l'ordinateur beaucoup plus rapide qu'un disque dur classique. 8 Go de RAM est un minimum confortable, 16 Go pour le multitâche intensif.",
      },
      {
        title: 'Autonomie',
        body: "Sur un portable reconditionné, la batterie a déjà servi : demandez son état et prévoyez un usage sur secteur si vous travaillez de longues heures.",
      },
    ],
    faq: [
      {
        q: "Qu'est-ce qu'un PC reconditionné ?",
        a: "Un ordinateur d'occasion contrôlé et remis en état de fonctionnement avant d'être revendu. Il est moins cher qu'un neuf tout en restant fiable.",
      },
      {
        q: "Les PC reconditionnés sont-ils garantis ?",
        a: "Tous les produits bénéficient des garanties légales. La durée de garantie commerciale éventuelle est précisée sur la fiche produit et sur la facture.",
      },
      {
        q: "Puis-je retourner un PC qui ne me convient pas ?",
        a: "Oui : vous disposez de 15 jours après réception pour exercer votre droit de rétractation, produit complet et dans son état d'origine.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.ORDINATEURS], conditions: ['refurbished'] },
    sort: 'price-asc',
    limit: 24,
    shopHref: '/shop?cat=computer&condition=refurbished',
    relatedGuides: ['quel-pc-portable-200000-fcfa', 'occasion-reconditionne-ou-neuf', 'choisir-chargeur-pc-portable'],
    relatedLandings: ['pc-portables-hp-cameroun', 'telephones-moins-100000-fcfa'],
    showInFooter: true,
    updatedAt: '2026-10-30',
  },
  {
    slug: 'telephones-moins-100000-fcfa',
    navLabel: 'Téléphones à moins de 100 000 FCFA',
    h1: 'Téléphones à moins de 100 000 FCFA',
    title: 'Téléphones à moins de 100 000 FCFA au Cameroun | Xeption',
    metaDescription:
      "Smartphones à moins de 100 000 FCFA au Cameroun : sélection Samsung, Xiaomi, Tecno et plus, neufs ou reconditionnés, paiement Orange Money ou MoMo.",
    intro: [
      "Un budget de 100 000 FCFA permet aujourd'hui d'obtenir un smartphone fiable avec un grand écran et une bonne autonomie.",
      "Voici les modèles disponibles dans ce budget, du moins cher au plus cher.",
    ],
    buyingTips: [
      {
        title: 'Autonomie avant tout',
        body: "Dans ce budget, une batterie de 5000 mAh ou plus assure une journée complète d'utilisation.",
      },
      {
        title: 'Stockage suffisant',
        body: "Évitez les modèles à 32 Go : le système en occupe une bonne partie. 64 Go est un minimum, 128 Go est confortable.",
      },
      {
        title: 'Reconditionné haut de gamme',
        body: "Un ancien modèle haut de gamme reconditionné peut offrir un meilleur appareil photo qu'un modèle neuf d'entrée de gamme au même prix.",
      },
    ],
    faq: [
      {
        q: "Quel est le meilleur téléphone à moins de 100 000 FCFA ?",
        a: "Cela dépend de l'usage : autonomie, photo ou jeux. Notre guide détaillé compare les critères à privilégier selon vos besoins.",
      },
      {
        q: "Les prix incluent-ils la livraison ?",
        a: "Les prix sont TTC, hors frais de livraison. Les frais sont affichés avant la validation de la commande, et le retrait en boutique est gratuit.",
      },
      {
        q: "Puis-je réduire le prix avec mon ancien téléphone ?",
        a: "Vous pouvez faire estimer votre ancien téléphone via Smart Troc et utiliser le bon de reprise obtenu pour réduire le prix en boutique.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.PHONES], maxPrice: 100000, minPrice: 1 },
    sort: 'price-asc',
    limit: 36,
    shopHref: '/shop?cat=phones&price_max=100000',
    relatedGuides: ['quel-smartphone-100000-fcfa', 'occasion-reconditionne-ou-neuf'],
    relatedLandings: ['smartphones-samsung-cameroun', 'smartphones-xiaomi-redmi-poco-cameroun', 'iphone-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-30',
  },
  {
    slug: 'smartphones-xiaomi-redmi-poco-cameroun',
    navLabel: 'Xiaomi, Redmi et Poco',
    h1: 'Smartphones Xiaomi, Redmi et Poco au Cameroun',
    title: 'Smartphones Xiaomi, Redmi et Poco au Cameroun | Xeption',
    metaDescription:
      "Xiaomi, Redmi et Poco au Cameroun : différences entre gammes, modèles neufs et reconditionnés, paiement Orange Money ou MoMo, livraison et retrait à Yaoundé.",
    intro: [
      "Redmi et Poco sont des marques de Xiaomi. Elles couvrent tous les budgets, du premier smartphone au modèle haut de gamme.",
      "Les modèles disponibles sont classés ci-dessous du moins cher au plus cher. Chaque fiche précise l'état, la mémoire et la garantie applicable.",
    ],
    buyingTips: [
      {
        title: 'Redmi A et Redmi C : l’essentiel',
        body: "Les gammes d'entrée de gamme pour les appels, WhatsApp et les réseaux sociaux. Préférez les versions 128 Go : le système occupe une bonne partie du stockage.",
      },
      {
        title: 'Redmi Note : le meilleur équilibre',
        body: "Écran plus fluide, meilleur appareil photo et charge rapide : la gamme Redmi Note est le bon compromis pour un usage quotidien intensif.",
      },
      {
        title: 'Poco et Xiaomi : la puissance',
        body: "Poco mise sur la performance pour les jeux à prix contenu. Les Xiaomi numérotés (série T, Pro) visent le haut de gamme, avec les meilleurs appareils photo de la marque.",
      },
    ],
    faq: [
      {
        q: 'Quelle différence entre Xiaomi, Redmi et Poco ?',
        a: "Les trois appartiennent au même groupe. Redmi couvre l'entrée et le milieu de gamme, Poco privilégie la puissance à prix serré, et la gamme Xiaomi regroupe les modèles les plus haut de gamme.",
      },
      {
        q: 'Comment payer un smartphone Xiaomi chez Xeption ?',
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
      {
        q: 'Livrez-vous hors de Yaoundé ?',
        a: "Oui : Yaoundé en 24 à 48 h ouvrées, Douala en 48 à 72 h ouvrées et les autres villes du Cameroun en 3 à 7 jours ouvrés selon la destination.",
      },
      {
        q: 'Puis-je échanger mon ancien téléphone ?',
        a: "Oui, via Smart Troc : estimation en ligne, puis validation définitive de la reprise lors du dépôt de l'appareil en boutique.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.PHONES], brands: ['Xiaomi'], nameIncludes: ['xiaomi', 'redmi', 'poco'] },
    sort: 'price-asc',
    limit: 24,
    shopHref: '/shop?cat=phones&brand=xiaomi',
    relatedGuides: ['quel-smartphone-100000-fcfa', 'occasion-reconditionne-ou-neuf', 'telephone-importe-cameroun'],
    relatedLandings: ['telephones-moins-100000-fcfa', 'smartphones-samsung-cameroun', 'google-pixel-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-31',
  },
  {
    slug: 'google-pixel-cameroun',
    navLabel: 'Google Pixel',
    h1: 'Google Pixel au Cameroun',
    title: 'Google Pixel au Cameroun : neufs et reconditionnés | Xeption',
    metaDescription:
      "Google Pixel au Cameroun : séries a, standard et Pro, versions importées expliquées, paiement Orange Money ou MoMo, livraison et retrait à Yaoundé.",
    intro: [
      "Les Pixel sont les smartphones conçus par Google : Android sans surcouche, mises à jour rapides et appareils photo réputés.",
      "Les modèles disponibles sont présentés du plus récent au plus ancien. L'origine des versions importées est indiquée sur chaque fiche.",
    ],
    buyingTips: [
      {
        title: 'Série a, standard ou Pro',
        body: "Les Pixel « a » reprennent l'essentiel à prix réduit. Les modèles standard ajoutent de meilleures finitions, et les Pro un téléobjectif et un écran plus grand.",
      },
      {
        title: 'Vérifier la durée des mises à jour',
        body: "Google promet 7 ans de mises à jour à partir du Pixel 8. Les Pixel 6 et 7 ont un suivi plus court : vérifiez la date de fin sur la page d'assistance Google avant d'acheter.",
      },
      {
        title: 'Versions importées',
        body: "Un Pixel destiné au marché japonais émet un son à chaque photo, impossible à désactiver. Consultez l'origine sur la fiche et notre guide sur les téléphones importés.",
      },
    ],
    faq: [
      {
        q: 'Un Pixel importé fonctionne-t-il au Cameroun ?',
        a: "Vérifiez la version (origine indiquée sur la fiche), le blocage opérateur et la compatibilité réseau. Notre guide sur les téléphones importés détaille chaque point, et vous pouvez poser la question avant l'achat.",
      },
      {
        q: 'Quelle garantie pour un Pixel reconditionné ?',
        a: "L'état et la garantie applicable sont précisés sur la fiche produit et sur la facture.",
      },
      {
        q: 'Comment payer un Google Pixel chez Xeption ?',
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
      {
        q: 'Puis-je échanger mon ancien téléphone contre un Pixel ?',
        a: "Oui, via Smart Troc : estimation en ligne, puis validation définitive de la reprise lors du dépôt de l'appareil en boutique.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.PHONES], brands: ['Google Pixel'], nameIncludes: ['pixel'] },
    sort: 'newest',
    limit: 24,
    shopHref: '/shop?cat=phones&brand=google-pixel',
    relatedGuides: ['telephone-importe-cameroun', 'occasion-reconditionne-ou-neuf', 'preparer-telephone-reprise-smart-troc', 'google-pixel-7-ou-samsung-galaxy-a55'],
    relatedLandings: ['iphone-cameroun', 'smartphones-samsung-cameroun', 'smartphones-xiaomi-redmi-poco-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-31',
  },
  {
    slug: 'pc-portables-hp-cameroun',
    navLabel: 'PC portables HP',
    h1: 'Ordinateurs portables HP au Cameroun',
    title: 'PC portables HP au Cameroun : EliteBook, ProBook | Xeption',
    metaDescription:
      "PC portables HP reconditionnés au Cameroun : EliteBook, ProBook et 2-en-1 comparés, paiement Orange Money ou MoMo, livraison et retrait à Yaoundé.",
    intro: [
      "HP conçoit ses gammes EliteBook et ProBook pour les entreprises : châssis robustes, claviers confortables et pièces faciles à trouver.",
      "Les modèles disponibles sont classés du moins cher au plus cher. Chaque fiche indique le processeur, la mémoire, le stockage et la garantie.",
    ],
    buyingTips: [
      {
        title: 'EliteBook ou ProBook',
        body: "L'EliteBook est le haut de gamme professionnel de HP : finitions métal, meilleur écran, plus léger. Le ProBook vise le même usage à moindre coût. Les modèles x360 et Elite x2 se transforment en tablette.",
      },
      {
        title: 'Lire la génération',
        body: "Le « G » du nom indique la génération (840 G2, G5, G6…) : plus le chiffre est élevé, plus le modèle est récent. Pour Windows 11, visez un processeur Intel de 8e génération ou un Ryzen 2000 et plus récents.",
      },
      {
        title: 'SSD et mémoire',
        body: "Un SSD rend l'ordinateur nettement plus rapide qu'un disque dur classique (HDD). 8 Go de RAM suffisent pour la bureautique, 16 Go pour garder de nombreux onglets et logiciels ouverts.",
      },
    ],
    faq: [
      {
        q: 'Les PC HP reconditionnés sont-ils garantis ?',
        a: "Oui. La garantie applicable est précisée sur la fiche produit et sur la facture.",
      },
      {
        q: 'Quel HP choisir pour les études ?',
        a: "Un EliteBook ou un ProBook avec SSD et 8 Go de RAM couvre la bureautique et les cours en ligne. Notre guide sur les PC à 200 000 FCFA détaille les compromis.",
      },
      {
        q: 'Comment payer un ordinateur chez Xeption ?',
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.ORDINATEURS], brands: ['HP'], nameIncludes: ['elitebook', 'probook'] },
    sort: 'price-asc',
    limit: 24,
    shopHref: '/shop?cat=computer&brand=hp',
    relatedGuides: ['quel-pc-portable-200000-fcfa', 'occasion-reconditionne-ou-neuf', 'choisir-chargeur-pc-portable'],
    relatedLandings: ['pc-portables-reconditionnes-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-31',
  },
  {
    slug: 'montres-connectees-samsung-cameroun',
    navLabel: 'Montres connectées Samsung',
    h1: 'Montres et bracelets connectés Samsung au Cameroun',
    title: 'Montres connectées Samsung Galaxy Watch au Cameroun | Xeption',
    metaDescription:
      "Galaxy Watch, Watch Ultra ou Galaxy Fit : choisir sa montre Samsung selon son téléphone, l'autonomie, les fonctions santé et le budget. Retrait à Yaoundé.",
    intro: [
      "Samsung propose trois familles : le bracelet Galaxy Fit pour le suivi d'activité, la Galaxy Watch pour les notifications, les applications et la santé, et la Galaxy Watch Ultra pour le sport et l'autonomie.",
      "Avant de choisir, vérifiez la compatibilité avec votre téléphone : c'est le premier critère, avant le design ou le prix.",
    ],
    buyingTips: [
      {
        title: 'Compatibilité avec votre téléphone',
        body: "Les Galaxy Watch récentes (Watch4 et suivantes) et le Galaxy Fit3 fonctionnent avec un smartphone Android, via l'application Galaxy Wearable. Ils ne sont pas compatibles avec l'iPhone. Certaines fonctions santé, comme l'ECG, demandent un smartphone Samsung Galaxy.",
      },
      {
        title: 'Autonomie',
        body: "Le Galaxy Fit tient plusieurs jours entre deux charges. Une Galaxy Watch se recharge en général tous les un à deux jours selon l'usage. La Watch Ultra, avec sa plus grande batterie, tient plus longtemps : c'est le bon choix si vous oubliez souvent de recharger.",
      },
      {
        title: 'Fonctions recherchées',
        body: "Pas, sommeil et fréquence cardiaque : le Galaxy Fit suffit. Réponses aux messages, paiement, applications et GPS intégré : choisissez une Galaxy Watch. Les versions Classic ajoutent une lunette rotative pour naviguer sans toucher l'écran.",
      },
      {
        title: 'Budget et version',
        body: "Une génération récente reste prise en charge plus longtemps. Les versions importées (par exemple Korea) peuvent présenter des différences de langue ou de fonctions santé selon la région : demandez-nous avant l'achat si une fonction précise compte pour vous.",
      },
    ],
    faq: [
      {
        q: 'Une Galaxy Watch fonctionne-t-elle avec un iPhone ?',
        a: "Non. Depuis la Galaxy Watch4, les montres Samsung fonctionnent uniquement avec des smartphones Android.",
      },
      {
        q: 'Que signifie « Scellé » sur une fiche ?',
        a: "L'appareil est vendu neuf dans sa boîte d'origine, jamais ouverte.",
      },
      {
        q: 'Galaxy Fit ou Galaxy Watch : lequel choisir ?',
        a: "Le Galaxy Fit est léger, abordable et tient longtemps sur batterie pour le suivi d'activité. La Galaxy Watch est une vraie montre connectée : applications, réponses aux messages et suivi santé plus complet.",
      },
      {
        q: 'Comment payer une montre chez Xeption ?',
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.ACCESSORIES], nameIncludes: ['galaxy watch', 'galaxy fit'] },
    sort: 'price-asc',
    limit: 24,
    shopHref: '/shop?cat=accessories&brand=samsung',
    relatedGuides: ['telephone-importe-cameroun'],
    relatedLandings: ['smartphones-samsung-cameroun', 'ecouteurs-casques-bluetooth-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-31',
  },
  {
    slug: 'ecouteurs-casques-bluetooth-cameroun',
    navLabel: 'Écouteurs et casques Bluetooth',
    h1: 'Écouteurs et casques Bluetooth au Cameroun',
    title: 'Écouteurs et casques Bluetooth au Cameroun | Xeption',
    metaDescription:
      "Écouteurs sans fil, tour de cou ou casque Bluetooth : choisir selon les appels, la musique, le sport, l'autonomie et votre téléphone. Retrait à Yaoundé.",
    intro: [
      "Écouteurs sans fil, modèles tour de cou ou casques : chaque format répond à un usage. Tous se connectent en Bluetooth à n'importe quel smartphone, Android ou iPhone.",
    ],
    buyingTips: [
      {
        title: 'Appels',
        body: "Pour téléphoner souvent, notamment dans la rue ou en moto-taxi, privilégiez un modèle avec plusieurs micros et réduction du bruit pendant les appels.",
      },
      {
        title: 'Musique et réduction de bruit',
        body: "La réduction de bruit active (ANC) atténue le bruit ambiant : utile dans les transports ou un bureau animé. Un casque offre en général un son plus ample et une meilleure autonomie que des écouteurs.",
      },
      {
        title: 'Sport',
        body: "Pour le sport, choisissez des écouteurs bien maintenus dans l'oreille ou un modèle tour de cou, qui ne se perd pas. Vérifiez sur la fiche la résistance à la transpiration.",
      },
      {
        title: 'Autonomie et compatibilité',
        body: "Comparez l'autonomie des écouteurs seuls et avec leur boîtier de charge. Les Galaxy Buds de Samsung fonctionnent avec tous les téléphones, mais leurs réglages avancés sont plus complets avec un smartphone Samsung Galaxy.",
      },
    ],
    faq: [
      {
        q: 'Des écouteurs Samsung fonctionnent-ils avec un iPhone ?',
        a: "Oui, en Bluetooth : musique et appels fonctionnent. Certains réglages avancés sont réservés aux smartphones Android ou Samsung.",
      },
      {
        q: "Qu'est-ce que la réduction de bruit active (ANC) ?",
        a: "Des micros captent le bruit ambiant et les écouteurs le compensent. Le bruit de fond diminue, ce qui permet d'écouter à un volume plus bas.",
      },
      {
        q: 'Écouteurs ou casque ?',
        a: "Les écouteurs sont discrets et se glissent dans une poche. Le casque est plus confortable pour de longues écoutes et tient souvent plus longtemps sur batterie.",
      },
      {
        q: 'Comment payer chez Xeption ?',
        a: "Par Orange Money, MTN Mobile Money, ou en espèces à la livraison ou au retrait en boutique au Mfoundi Mall.",
      },
    ],
    filter: { categories: [CATEGORY_SLUGS.ACCESSORIES], nameIncludes: ['buds', 'ecouteur', 'casque', 'jbl tune'] },
    sort: 'price-asc',
    limit: 24,
    shopHref: '/shop?cat=accessories',
    relatedGuides: [],
    relatedLandings: ['montres-connectees-samsung-cameroun', 'smartphones-samsung-cameroun'],
    showInFooter: true,
    updatedAt: '2026-10-31',
  },
];

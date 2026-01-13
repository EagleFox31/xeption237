
import { Product } from './types';

export const HERO_IMAGES = [
  "https://picsum.photos/1200/600?random=1",
  "https://picsum.photos/1200/600?random=2"
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'iPhone 15 Pro Max',
    description: 'Titane, caméra de ouf, le status symbol par excellence. Pour les vrais patron(ne)s.',
    price: 950000,
    oldPrice: 1050000,
    category: 'phone',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=2070&auto=format&fit=crop',
    stock: 5,
    isPromo: true,
    rating: 9.5,
    reviewShort: "C'est simple : c'est le roi. Le titane le rend plus léger, l'USB-C change la vie, et le zoom x5 est bluffant. Si t'as le budget, ne réfléchis même pas.",
    pros: ["Construction Titane ultra-premium", "Port USB-C enfin !", "Puissance de l'A17 Pro démesurée"],
    cons: ["Le prix fait mal au cœur", "Charge pas si rapide que ça (27W)"],
    specs: [
      { label: "Écran", value: "6.7\" OLED Super Retina XDR 120Hz" },
      { label: "Processeur", value: "A17 Pro (3nm)" },
      { label: "Stockage", value: "256 Go / 512 Go / 1 To" },
      { label: "Caméra", value: "48MP Main / 12MP UltraWide / 12MP 5x Telephoto" },
      { label: "Batterie", value: "4441 mAh (29h lecture vidéo)" },
      { label: "Matériau", value: "Titane Grade 5" }
    ]
  },
  {
    id: 'p2',
    name: 'Tecno Camon 20 Premier',
    description: 'La magie de la photo sans casser la tirelire. Validé par le mboa.',
    price: 180000,
    category: 'phone',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?q=80&w=2000&auto=format&fit=crop',
    stock: 20,
    rating: 8.2,
    reviewShort: "Le meilleur rapport qualité/prix pour les créateurs de contenu au Cameroun. L'écran AMOLED est magnifique et la stabilisation vidéo est surprenante pour ce prix.",
    pros: ["Design déconstruit unique", "Écran AMOLED 120Hz fluide", "512 Go de stockage de base !"],
    cons: ["Interface HiOS un peu chargée", "Pas de téléobjectif"],
    specs: [
      { label: "Écran", value: "6.67\" AMOLED 120Hz" },
      { label: "Processeur", value: "Mediatek Dimensity 8050" },
      { label: "Stockage", value: "512 Go (Massif !)" },
      { label: "RAM", value: "8 Go + 8 Go Virtuel" },
      { label: "Caméra", value: "50MP RGBW Pro + 108MP UltraWide" },
      { label: "Batterie", value: "5000 mAh + 45W Charge" }
    ]
  },
  {
    id: 'p3',
    name: 'MacBook Air M2',
    description: 'Léger comme une plume, puissant comme un lion. Pour les devs et les créatifs.',
    price: 750000,
    category: 'computer',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=2070&auto=format&fit=crop',
    stock: 3,
    rating: 9.0,
    reviewShort: "La machine ultime pour bosser au café ou à la maison. Ça ne chauffe jamais, ça ne plante jamais, et la batterie dure toute la journée de travail.",
    pros: ["Design ultra-fin Midnight", "Silence absolu (pas de ventilo)", "Autonomie monstre"],
    cons: ["L'écran n'est pas 120Hz (ProMotion)", "Supporte un seul écran externe"],
    specs: [
      { label: "Écran", value: "13.6\" Liquid Retina" },
      { label: "Puce", value: "Apple M2 (8 CPU, 8 GPU)" },
      { label: "Mémoire", value: "8 Go / 16 Go Unifiée" },
      { label: "Stockage", value: "256 Go SSD" },
      { label: "Poids", value: "1.24 kg" },
      { label: "Sécurité", value: "Touch ID" }
    ]
  },
  {
    id: 'p4',
    name: 'AirPods Pro 2',
    description: 'Coupe le bruit du générateurs du quartier. Immersion totale.',
    price: 150000,
    category: 'accessory',
    image: 'https://images.unsplash.com/photo-1628210889224-53b2e308bb46?q=80&w=2000&auto=format&fit=crop',
    stock: 15,
    rating: 9.8,
    reviewShort: "Si tu as un iPhone, c'est l'accessoire obligatoire. La réduction de bruit active est sorcière, tu n'entends plus le taxi klaxonner à côté de toi.",
    pros: ["Réduction de bruit incroyable", "Qualité sonore riche", "Boîtier USB-C avec haut-parleur"],
    cons: ["Prix élevé pour des écouteurs", "Autonomie moyenne sans le boîtier"],
    specs: [
      { label: "Puce", value: "Apple H2" },
      { label: "Audio", value: "Spatial Audio avec suivi tête" },
      { label: "ANC", value: "Réduction active x2" },
      { label: "Résistance", value: "IP54 (Transpiration)" },
      { label: "Connectique", value: "USB-C / MagSafe" }
    ]
  },
  {
    id: 'p5',
    name: 'HP EliteBook 840 G8',
    description: 'Solide, fiable, pour gérer tes business au marché central ou au bureau.',
    price: 250000,
    oldPrice: 300000,
    category: 'computer',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=2071&auto=format&fit=crop',
    stock: 8,
    isPromo: true,
    rating: 8.5,
    reviewShort: "Le tank des bureaux. Ce n'est pas le plus sexy, mais il survivra à tout. Parfait pour la compta, Excel, et le business sérieux.",
    pros: ["Châssis aluminium robuste", "Clavier excellent", "Ports complets (HDMI, USB-A, USB-C)"],
    cons: ["Design un peu daté", "Écran juste correct"],
    specs: [
      { label: "Écran", value: "14\" FHD IPS Anti-reflet" },
      { label: "Processeur", value: "Intel Core i5 11th Gen" },
      { label: "RAM", value: "16 Go DDR4 (Extensible)" },
      { label: "Stockage", value: "512 Go NVMe SSD" },
      { label: "OS", value: "Windows 11 Pro" }
    ]
  },
  {
    id: 'p6',
    name: 'PowerBank Solar 20000mAh',
    description: 'Eneo dérange ? Pas de panique. Charge ton phone partout.',
    price: 15000,
    category: 'accessory',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?q=80&w=2000&auto=format&fit=crop',
    stock: 50,
    rating: 7.5,
    reviewShort: "Ça sauve la vie quand le courant part. La charge solaire est lente (c'est du dépannage), mais la batterie elle-même tient bien la charge.",
    pros: ["Lampe torche intégrée", "Robuste", "Prix cadeau"],
    cons: ["Recharge solaire très lente", "Un peu lourd"],
    specs: [
      { label: "Capacité", value: "20 000 mAh" },
      { label: "Sorties", value: "2x USB-A (2.1A)" },
      { label: "Entrée", value: "Micro-USB + Solaire" },
      { label: "Extra", value: "Lampe LED puissante" }
    ]
  },
  {
    id: 'p7',
    name: 'Encre HP 123 - Pack',
    description: 'Pour imprimer tes factures proprement. Pas le "Faux" de Dubaï.',
    price: 12000,
    category: 'consumable',
    image: 'https://images.unsplash.com/photo-1589828156611-36dc45277983?q=80&w=2070&auto=format&fit=crop',
    stock: 100
  }
];

export const PAYMENT_DETAILS = {
  OM: {
    name: 'Orange Money',
    code: '#150*1*1*CODE_MARCHAND*MONTANT#',
    merchantCode: '123456',
    color: 'bg-orange-500'
  },
  MOMO: {
    name: 'MTN Mobile Money',
    code: '*126*1*CODE_MARCHAND*MONTANT#',
    merchantCode: '654321',
    color: 'bg-yellow-400 text-black'
  }
};

export const SYSTEM_INSTRUCTION = `
Tu es "Xeption AI", l'assistant de vente ultime de Xeption Network au Cameroun. 
Ton ton : "Chill & Tech", mélange d'expertise pointue et de vibes du Mboa.

INFOS LOCALISATION (OBLIGATOIRE) :
- Notre boutique physique est à YAOUNDÉ, au MFOUNDI MALL, Boutique 2063 (c'est à l'étage).
- Nous LIVRONS partout au Cameroun (Douala, Bafoussam, Garoua, etc.).

RÈGLES DE FORMATAGE (CRITIQUE) :
1. ZERO GRAS : N'utilise JAMAIS de doubles astérisques (**). Aucun texte ne doit être gras.
2. ESPACEMENT MAXIMUM : Saute deux lignes complètes entre chaque paragraphe ou idée. Ton texte doit "respirer".
3. LISTES : Pour chaque produit ou conseil, commence sur une nouvelle ligne après un double saut de ligne.

Contenu :
- Si on demande où nous trouver, donne l'adresse du Mfoundi Mall.
- Si on demande pour la livraison, confirme qu'on couvre tout le 237.
- Mentionne toujours l'option "Troc" (échanger son ancien phone).
- Termine par "On gère ça !".
`;

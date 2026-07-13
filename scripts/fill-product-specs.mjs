/**
 * Remplit specs/pros/cons des produits incomplets via données de référence.
 * Usage: node scripts/fill-product-specs.mjs [--dry-run] [--apply]
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tawnusmfyvugqczaydat.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_aVbtIWpNtrLg_GLP7SbhEg_qk_JAa2H';

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

const hasValidSpecs = (specs) =>
  Array.isArray(specs) &&
  specs.length > 0 &&
  specs.some((s) => (s.label || '').trim() && (s.value || '').trim());

/** Données specs/pros/cons par nom normalisé (recherche partielle sur name DB) */
const CATALOG = {
  'chargeur adaptateur secteur dell': {
    specs: [
      { label: 'Puissance', value: '65 W' },
      { label: 'Connecteur', value: 'USB-C (Type-C)' },
      { label: 'Entrée', value: '100-240V AC, 50-60 Hz' },
      { label: 'Sortie', value: '20V / 3.25A (65W PD)' },
      { label: 'Compatibilité', value: 'PC portables Dell USB-C PD' },
      { label: 'Câble', value: 'Câble secteur 2 broches inclus' },
    ],
    pros: ['Charge USB-C PD universelle 65W', 'Compact et fiable pour le bureau', 'Compatible large gamme Dell'],
    cons: ['Vérifier compatibilité PD du PC', 'Un seul port USB-C'],
  },
  'chargeur ordinateur portable lenovo': {
    specs: [
      { label: 'Puissance', value: '45 W' },
      { label: 'Connecteur', value: 'USB-C ou embout Lenovo (selon modèle)' },
      { label: 'Entrée', value: '100-240V AC, 50-60 Hz' },
      { label: 'Sortie', value: '20V / 2.25A (45W)' },
      { label: 'Compatibilité', value: 'PC portables Lenovo IdeaPad / ThinkPad entrée de gamme' },
    ],
    pros: ['Charge stable pour usage quotidien', 'Format compact', 'Remplacement d\'origine ou équivalent certifié'],
    cons: ['45W insuffisant pour PC gaming', 'Vérifier l\'embout exact'],
  },
  'google pixel 10 pro fold': {
    specs: [
      { label: 'Écran intérieur', value: '8 pouces LTPO OLED 120Hz' },
      { label: 'Écran extérieur', value: '6.4 pouces OLED' },
      { label: 'Processeur', value: 'Google Tensor G5' },
      { label: 'RAM', value: '16 Go' },
      { label: 'Stockage', value: '256 Go / 512 Go' },
      { label: 'Appareil photo', value: 'Triple capteur 50 MP + IA' },
      { label: 'Batterie', value: '5050 mAh, charge rapide' },
    ],
    pros: ['Format foldable premium Google', 'IA photo et Android pur', 'Écran intérieur immersif'],
    cons: ['Prix très élevé', 'Épaisseur en mode fermé'],
  },
  'google pixel 7 pro 5g': {
    specs: [
      { label: 'Écran', value: '6.7 pouces LTPO OLED 120Hz' },
      { label: 'Processeur', value: 'Google Tensor G2' },
      { label: 'RAM', value: '12 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go / 512 Go' },
      { label: 'Appareil photo', value: '50 MP + 48 MP téléobjectif + 12 MP ultra-large' },
      { label: 'Batterie', value: '5000 mAh' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['Photos exceptionnelles en basse lumière', 'Android pur avec mises à jour longues', 'Écran 120Hz fluide'],
    cons: ['Charge rapide modeste', 'Pas de carte microSD'],
  },
  'google pixel 8 5g': {
    specs: [
      { label: 'Écran', value: '6.2 pouces OLED Actua 120Hz' },
      { label: 'Processeur', value: 'Google Tensor G3' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go' },
      { label: 'Appareil photo', value: '50 MP principal + 12 MP ultra-large' },
      { label: 'Batterie', value: '4575 mAh' },
      { label: 'OS', value: 'Android 14 (7 ans de mises à jour)' },
    ],
    pros: ['Tensor G3 efficace', 'Photos IA de référence', 'Compact et élégant'],
    cons: ['Autonomie moyenne en gaming', 'Charge sans fil lente'],
  },
  'google pixel 9 pro xl': {
    specs: [
      { label: 'Écran', value: '6.8 pouces LTPO OLED 120Hz' },
      { label: 'Processeur', value: 'Google Tensor G4' },
      { label: 'RAM', value: '16 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go / 512 Go / 1 To' },
      { label: 'Appareil photo', value: '50 MP + 48 MP + 48 MP (triple capteur)' },
      { label: 'Batterie', value: '5060 mAh' },
      { label: 'Selfie', value: '42 MP' },
    ],
    pros: ['Grand écran premium', 'IA Gemini intégrée', 'Photos et vidéo pro'],
    cons: ['Format imposant', 'Tarif premium'],
  },
  'infinix hot 60 pro': {
    specs: [
      { label: 'Écran', value: '6.78 pouces AMOLED 120Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G100' },
      { label: 'RAM', value: '8 Go (+ extension virtuelle)' },
      { label: 'Stockage', value: '256 Go extensible microSD' },
      { label: 'Appareil photo', value: '108 MP principal + capteurs IA' },
      { label: 'Batterie', value: '5160 mAh, charge 45W' },
      { label: 'OS', value: 'Android 15' },
    ],
    pros: ['AMOLED 120Hz à prix accessible', 'Batterie longue durée', 'Charge rapide 45W'],
    cons: ['Performances gaming limitées', 'UI avec publicités Infinix'],
  },
  'infinix hot 60i': {
    specs: [
      { label: 'Écran', value: '6.7 pouces HD+ 120Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G81' },
      { label: 'RAM', value: '4 Go' },
      { label: 'Stockage', value: '128 Go extensible microSD' },
      { label: 'Appareil photo', value: '50 MP arrière / 8 MP selfie' },
      { label: 'Batterie', value: '5160 mAh' },
      { label: 'SIM', value: 'Double nano SIM' },
    ],
    pros: ['Grand écran 120Hz', 'Autonomie 5160 mAh', 'Bon rapport qualité-prix'],
    cons: ['Résolution HD+ seulement', '4 Go RAM limite le multitâche'],
  },
  'infinix note edge': {
    specs: [
      { label: 'Écran', value: '6.78 pouces AMOLED 120Hz' },
      { label: 'Processeur', value: 'MediaTek Dimensity 7300' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '256 Go' },
      { label: 'Appareil photo', value: '50 MP + 13 MP' },
      { label: 'Batterie', value: '6500 mAh' },
      { label: 'Réseau', value: '5G, double SIM' },
    ],
    pros: ['Batterie record 6500 mAh', 'Écran AMOLED lumineux', 'Connectivité 5G'],
    cons: ['Poids important', 'Châssis plastique'],
  },
  'infinix smart 20': {
    specs: [
      { label: 'Écran', value: '6.7 pouces HD+ 120Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G81' },
      { label: 'RAM', value: '4 Go / 6 Go' },
      { label: 'Stockage', value: '128 Go extensible' },
      { label: 'Appareil photo', value: '50 MP principal' },
      { label: 'Batterie', value: '5000 mAh' },
      { label: 'OS', value: 'Android 14 Go' },
    ],
    pros: ['128 Go de stockage', 'Écran 120Hz', 'Prix très accessible'],
    cons: ['HD+ pas Full HD', 'Performances modestes'],
  },
  'iphone 12 pro': {
    specs: [
      { label: 'Écran', value: '6.1 pouces Super Retina XDR OLED' },
      { label: 'Processeur', value: 'Apple A14 Bionic' },
      { label: 'RAM', value: '6 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go / 512 Go' },
      { label: 'Appareil photo', value: 'Triple 12 MP (grand-angle, ultra-large, télé)' },
      { label: 'Batterie', value: '2815 mAh' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['Design premium acier inoxydable', 'Vidéo Dolby Vision HDR', 'Écosystème Apple fluide'],
    cons: ['Autonomie limitée', 'Pas de 120Hz'],
  },
  'iphone 12 pro max': {
    specs: [
      { label: 'Écran', value: '6.7 pouces Super Retina XDR OLED' },
      { label: 'Processeur', value: 'Apple A14 Bionic' },
      { label: 'RAM', value: '6 Go' },
      { label: 'Stockage', value: '128 Go à 512 Go' },
      { label: 'Appareil photo', value: 'Triple 12 MP + LiDAR' },
      { label: 'Batterie', value: '3687 mAh' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['Grand écran immersif', 'Autonomie meilleure que le 12 Pro', 'Stabilisation optique avancée'],
    cons: ['Format imposant', 'Charge rapide lente (20W)'],
  },
  'iphone 13': {
    specs: [
      { label: 'Écran', value: '6.1 pouces Super Retina XDR OLED' },
      { label: 'Processeur', value: 'Apple A15 Bionic' },
      { label: 'RAM', value: '4 Go' },
      { label: 'Stockage', value: '128 Go minimum' },
      { label: 'Appareil photo', value: 'Double 12 MP (grand-angle + ultra-large)' },
      { label: 'Batterie', value: '3227 mAh' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['A15 encore très performant', 'Mode Cinématique vidéo', 'Excellent rapport qualité-prix reconditionné'],
    cons: ['4 Go RAM limite à long terme', 'Pas de ProMotion 120Hz'],
  },
  'iphone 14 pro max': {
    specs: [
      { label: 'Écran', value: '6.7 pouces Super Retina XDR 120Hz ProMotion' },
      { label: 'Processeur', value: 'Apple A16 Bionic' },
      { label: 'RAM', value: '6 Go' },
      { label: 'Stockage', value: '128 Go à 1 To' },
      { label: 'Appareil photo', value: '48 MP principal + triple capteur' },
      { label: 'Batterie', value: '4323 mAh' },
      { label: 'Sécurité', value: 'Dynamic Island, Ceramic Shield' },
    ],
    pros: ['Dynamic Island utile', 'Capteur 48 MP détaillé', 'Écran toujours actif'],
    cons: ['Prix reconditionné encore élevé', 'Poids notable'],
  },
  'iphone 15 pro max': {
    specs: [
      { label: 'Écran', value: '6.7 pouces Super Retina XDR 120Hz' },
      { label: 'Processeur', value: 'Apple A17 Pro' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '256 Go à 1 To' },
      { label: 'Appareil photo', value: '48 MP + téléobjectif 5x' },
      { label: 'Batterie', value: '4422 mAh' },
      { label: 'Connectique', value: 'USB-C 3.0' },
    ],
    pros: ['Titanium léger et robuste', 'Zoom optique 5x', 'A17 Pro pour gaming et montage'],
    cons: ['Surchauffe possible en charge rapide', 'Prix premium'],
  },
  'iphone 16 plus': {
    specs: [
      { label: 'Écran', value: '6.7 pouces Super Retina XDR OLED' },
      { label: 'Processeur', value: 'Apple A18' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '128 Go à 512 Go' },
      { label: 'Appareil photo', value: '48 MP Fusion + 12 MP ultra-large' },
      { label: 'Batterie', value: 'Autonomie record (jusqu\'à 27h vidéo)' },
      { label: 'Connectique', value: 'USB-C' },
    ],
    pros: ['Grande autonomie', 'Puce A18 récente', 'Apple Intelligence compatible'],
    cons: ['Pas de téléobjectif', '60Hz seulement (pas ProMotion)'],
  },
  'iphone 16 pro max reconditionné': {
    specs: [
      { label: 'Écran', value: '6.9 pouces Super Retina XDR 120Hz' },
      { label: 'Processeur', value: 'Apple A18 Pro' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '256 Go à 1 To' },
      { label: 'Appareil photo', value: 'Triple 48 MP + téléobjectif 5x' },
      { label: 'Batterie', value: 'Charge rapide USB-C' },
      { label: 'Garantie', value: 'Reconditionné par Apple' },
    ],
    pros: ['Reconditionné Apple certifié', 'Écran 6.9" ProMotion', 'Capteurs photo pro'],
    cons: ['Prix élevé même reconditionné', 'Format très grand'],
  },
  'iphone xr': {
    specs: [
      { label: 'Écran', value: '6.1 pouces Liquid Retina LCD' },
      { label: 'Processeur', value: 'Apple A12 Bionic' },
      { label: 'RAM', value: '3 Go' },
      { label: 'Stockage', value: '64 Go / 128 Go / 256 Go' },
      { label: 'Appareil photo', value: '12 MP avec Portrait' },
      { label: 'Batterie', value: '2942 mAh' },
      { label: 'Réseau', value: '4G LTE' },
    ],
    pros: ['Prix seconde main attractif', 'Face ID fiable', 'iOS fluide au quotidien'],
    cons: ['Écran LCD pas OLED', 'Pas de 5G', '3 Go RAM limitant'],
  },
  'moniteur pc hp m27f': {
    specs: [
      { label: 'Taille', value: '27 pouces' },
      { label: 'Résolution', value: '1920 x 1080 Full HD' },
      { label: 'Dalle', value: 'IPS, angle 178°' },
      { label: 'Fréquence', value: '75 Hz' },
      { label: 'Connectique', value: 'HDMI x2, VGA' },
      { label: 'Fonctions', value: 'Filtre lumière bleue, sans scintillement' },
      { label: 'Poids', value: '3,2 kg' },
    ],
    pros: ['Dalle IPS couleurs fidèles', '75Hz plus fluide que 60Hz', 'Connectique double HDMI'],
    cons: ['Full HD seulement sur 27"', 'Pas USB-C'],
  },
  'oppo a31': {
    specs: [
      { label: 'Écran', value: '6.5 pouces HD+ LCD' },
      { label: 'Processeur', value: 'MediaTek Helio P35' },
      { label: 'RAM', value: '4 Go' },
      { label: 'Stockage', value: '128 Go extensible' },
      { label: 'Appareil photo', value: 'Triple 12 MP + 2 MP + 2 MP' },
      { label: 'Batterie', value: '4230 mAh' },
      { label: 'OS', value: 'Android 9, ColorOS' },
    ],
    pros: ['128 Go de stockage', 'Triple capteur polyvalent', 'Prix accessible'],
    cons: ['Helio P35 daté', 'HD+ pas Full HD'],
  },
  'samsung galaxy a07': {
    specs: [
      { label: 'Écran', value: '6.7 pouces PLS LCD 90Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G85' },
      { label: 'RAM', value: '4 Go / 6 Go' },
      { label: 'Stockage', value: '64 Go / 128 Go extensible' },
      { label: 'Appareil photo', value: '50 MP + 2 MP profondeur' },
      { label: 'Batterie', value: '5000 mAh' },
      { label: 'OS', value: 'Android 14, One UI' },
    ],
    pros: ['Écran 90Hz grand format', 'Batterie 5000 mAh', 'Double SIM pratique'],
    cons: ['Performances entrée de gamme', 'Pas de 5G'],
  },
  'samsung galaxy a26 5g': {
    specs: [
      { label: 'Écran', value: '6.7 pouces Super AMOLED 120Hz' },
      { label: 'Processeur', value: 'Exynos 1380' },
      { label: 'RAM', value: '6 Go / 8 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go' },
      { label: 'Appareil photo', value: '50 MP OIS + 8 MP + 2 MP' },
      { label: 'Batterie', value: '5000 mAh, charge 25W' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['AMOLED 120Hz premium', '5G et OIS sur capteur principal', 'IP67 étanche'],
    cons: ['Charge 25W moyenne', 'Exynos moins performant que Snapdragon'],
  },
  'samsung galaxy z flip6': {
    specs: [
      { label: 'Écran intérieur', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
      { label: 'Écran extérieur', value: '3.4 pouces Super AMOLED' },
      { label: 'Processeur', value: 'Snapdragon 8 Gen 3 for Galaxy' },
      { label: 'RAM', value: '12 Go' },
      { label: 'Stockage', value: '256 Go / 512 Go' },
      { label: 'Appareil photo', value: '50 MP + 12 MP ultra-large' },
      { label: 'Batterie', value: '4000 mAh' },
    ],
    pros: ['Format compact unique', 'Snapdragon 8 Gen 3 puissant', 'Écran couverture utile'],
    cons: ['Autonomie limitée', 'Prix foldable élevé'],
  },
  'samsung galaxy z fold7': {
    specs: [
      { label: 'Écran intérieur', value: '7.6 pouces Dynamic AMOLED 120Hz' },
      { label: 'Écran extérieur', value: '6.4 pouces Dynamic AMOLED 120Hz' },
      { label: 'Processeur', value: 'Snapdragon 8 Gen 3 for Galaxy' },
      { label: 'RAM', value: '12 Go' },
      { label: 'Stockage', value: '256 Go / 512 Go / 1 To' },
      { label: 'Appareil photo', value: '200 MP + ultra-large + téléobjectif' },
      { label: 'Batterie', value: '4400 mAh' },
    ],
    pros: ['Tablette + téléphone en un', 'Écran intérieur 7.6"', 'Multitâche professionnel'],
    cons: ['Très cher', 'Épaisseur et poids en mode fermé'],
  },
  'itel a100c': {
    specs: [
      { label: 'Écran', value: '6.6 pouces HD+ IPS' },
      { label: 'Processeur', value: 'Unisoc T603' },
      { label: 'RAM', value: '4 Go' },
      { label: 'Stockage', value: '128 Go extensible microSD' },
      { label: 'Appareil photo', value: '13 MP arrière / 8 MP selfie' },
      { label: 'Batterie', value: '5000 mAh' },
      { label: 'OS', value: 'Android 13 Go' },
    ],
    pros: ['5000 mAh autonomie', '128 Go stockage', 'Prix ultra bas'],
    cons: ['Performances très basiques', 'HD+ seulement'],
  },
  'tablette tecno megapad se': {
    specs: [
      { label: 'Écran', value: '11 pouces IPS LCD' },
      { label: 'Processeur', value: 'MediaTek Helio G80' },
      { label: 'RAM', value: '4 Go / 6 Go' },
      { label: 'Stockage', value: '128 Go extensible' },
      { label: 'Batterie', value: '8000 mAh' },
      { label: 'Audio', value: 'Quad haut-parleurs' },
      { label: 'OS', value: 'Android 13' },
    ],
    pros: ['Grande batterie 8000 mAh', 'Écran 11 pouces multimédia', 'Quad speakers'],
    cons: ['Pas 4G/5G (Wi-Fi)', 'Helio G80 limité pour jeux'],
  },
  'tecno camon 50': {
    specs: [
      { label: 'Écran', value: '6.78 pouces AMOLED 120Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G100' },
      { label: 'RAM', value: '8 Go' },
      { label: 'Stockage', value: '256 Go' },
      { label: 'Appareil photo', value: '50 MP OIS + ultra-large' },
      { label: 'Batterie', value: '5200 mAh, charge 45W' },
      { label: 'OS', value: 'Android 15, HiOS' },
    ],
    pros: ['AMOLED 120Hz', 'Charge rapide 45W', 'Capteur 50 MP OIS'],
    cons: ['UI Tecno chargée', 'Pas 5G sur certains variantes'],
  },
  'tecno camon 50 pro': {
    specs: [
      { label: 'Écran', value: '6.78 pouces AMOLED 144Hz' },
      { label: 'Processeur', value: 'MediaTek Dimensity 7300' },
      { label: 'RAM', value: '8 Go / 12 Go' },
      { label: 'Stockage', value: '256 Go / 512 Go' },
      { label: 'Appareil photo', value: '50 MP OIS + 50 MP ultra-large' },
      { label: 'Batterie', value: '5200 mAh, charge 70W' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['Écran 144Hz unique', 'Charge ultra rapide 70W', '5G Dimensity 7300'],
    cons: ['Prix plus élevé que Camon 50', 'Logiciel encore perfectible'],
  },
  'tecno pop 20': {
    specs: [
      { label: 'Écran', value: '6.6 pouces IPS LCD' },
      { label: 'Processeur', value: 'Unisoc T606' },
      { label: 'RAM', value: '4 Go' },
      { label: 'Stockage', value: '64 Go / 128 Go extensible' },
      { label: 'Appareil photo', value: '13 MP + AI caméra' },
      { label: 'Batterie', value: '5000 mAh' },
      { label: 'OS', value: 'Android 13 Go' },
    ],
    pros: ['5000 mAh', 'Double SIM', 'Entrée de gamme abordable'],
    cons: ['Performances limitées', 'Écran HD+'],
  },
  'xiaomi mi 15t pro': {
    specs: [
      { label: 'Écran', value: '6.67 pouces AMOLED 144Hz' },
      { label: 'Processeur', value: 'MediaTek Dimensity 9300+' },
      { label: 'RAM', value: '12 Go' },
      { label: 'Stockage', value: '512 Go' },
      { label: 'Appareil photo', value: '50 MP Leica triple capteur' },
      { label: 'Batterie', value: '5500 mAh, charge 90W' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['Dimensity 9300+ très puissant', 'Leica photo signature', 'Charge 90W express'],
    cons: ['Pas de slot microSD', 'Prix milieu-haut de gamme'],
  },
  'xiaomi poco x7 pro': {
    specs: [
      { label: 'Écran', value: '6.67 pouces AMOLED 120Hz' },
      { label: 'Processeur', value: 'MediaTek Dimensity 8400 Ultra' },
      { label: 'RAM', value: '8 Go / 12 Go' },
      { label: 'Stockage', value: '256 Go / 512 Go' },
      { label: 'Appareil photo', value: '50 MP OIS + 8 MP ultra-large' },
      { label: 'Batterie', value: '6000 mAh, charge 90W' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['6000 mAh monstre', 'Gaming Dimensity 8400', 'IP68 étanche'],
    cons: ['Design Poco massif', 'UI MIUI/HyperOS avec bloat'],
  },
  'xiaomi redmi 15': {
    specs: [
      { label: 'Écran', value: '6.79 pouces LCD 120Hz' },
      { label: 'Processeur', value: 'MediaTek Helio G100-Ultra' },
      { label: 'RAM', value: '6 Go / 8 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go' },
      { label: 'Appareil photo', value: '108 MP principal' },
      { label: 'Batterie', value: '6000 mAh, charge 33W' },
      { label: 'OS', value: 'HyperOS, Android 15' },
    ],
    pros: ['Batterie 6000 mAh', 'Capteur 108 MP', 'Écran 120Hz grand format'],
    cons: ['LCD pas AMOLED', 'Charge 33W moyenne'],
  },
  'xiaomi redmi note 13 5g': {
    specs: [
      { label: 'Écran', value: '6.67 pouces AMOLED 120Hz' },
      { label: 'Processeur', value: 'MediaTek Dimensity 6080' },
      { label: 'RAM', value: '6 Go / 8 Go' },
      { label: 'Stockage', value: '128 Go / 256 Go' },
      { label: 'Appareil photo', value: '108 MP + 2 MP' },
      { label: 'Batterie', value: '5000 mAh, charge 33W' },
      { label: 'Réseau', value: '5G' },
    ],
    pros: ['AMOLED 120Hz', '5G accessible', 'Capteur 108 MP détaillé'],
    cons: ['Dimensity 6080 milieu de gamme', 'Pas téléobjectif'],
  },
};

function normalizeKey(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchCatalog(name) {
  const key = normalizeKey(name);
  if (CATALOG[key]) return CATALOG[key];

  const entries = Object.entries(CATALOG).map(([pattern, data]) => ({
    pattern: normalizeKey(pattern),
    data,
  }));

  for (const { pattern, data } of entries) {
    if (key.includes(pattern) || pattern.includes(key)) return data;
  }

  let best = null;
  let bestLen = 0;
  for (const { pattern, data } of entries) {
    if (key.includes(pattern) && pattern.length > bestLen) {
      best = data;
      bestLen = pattern.length;
    }
  }
  return best;
}

async function fetchProducts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,category,description,specs,pros,cons`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateProduct(id, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PATCH ${id} failed: ${res.status} ${await res.text()}`);
}

async function main() {
  const products = await fetchProducts();
  const targets = products.filter((p) => !hasValidSpecs(p.specs));

  console.log(`Produits sans specs valides: ${targets.length}`);

  const report = { updated: [], skipped: [], failed: [] };

  for (const product of targets) {
    const data = matchCatalog(product.name);
    if (!data) {
      report.skipped.push(product.name);
      continue;
    }

    const payload = {
      specs: data.specs,
      pros: data.pros,
      cons: data.cons,
    };

    if (dryRun) {
      console.log(`[dry-run] ${product.name}`);
      report.updated.push(product.name);
      continue;
    }

    try {
      await updateProduct(product.id, payload);
      console.log(`✓ ${product.name}`);
      report.updated.push(product.name);
    } catch (e) {
      console.error(`✗ ${product.name}:`, e.message);
      report.failed.push({ name: product.name, error: e.message });
    }
  }

  const outPath = join(__dir, 'fill-product-specs-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\nReport:', outPath);
  console.log(`Updated: ${report.updated.length}, Skipped: ${report.skipped.length}, Failed: ${report.failed.length}`);
  if (dryRun) console.log('Mode dry-run — relancer avec --apply pour écrire en BD');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

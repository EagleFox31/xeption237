/** Familles produits → specs/pros/cons (fusion avec specs commerciales existantes). */

export function normalizeKey(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

export function extractStorageGb(name) {
  const n = normalizeKey(name);
  const m = n.match(/(\d+)\s*(go|gb|giga)/) || n.match(/(\d+)(go|gb)/);
  return m ? `${m[1]} Go` : null;
}

export function extractRamGb(name) {
  const n = normalizeKey(name);
  const m = n.match(/(\d+)\s*gb\s*ram/);
  return m ? `${m[1]} Go` : null;
}

/** Ordre important : motifs les plus spécifiques en premier */
export const FAMILIES = [
  {
    id: 'iphone13pro',
    patterns: ['iphone 13 pro'],
    exclude: ['pro max'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces Super Retina XDR OLED 120Hz ProMotion' },
        { label: 'Processeur', value: 'Apple A15 Bionic' },
        { label: 'RAM', value: '6 Go' },
        { label: 'Appareil photo', value: 'Triple 12 MP + LiDAR' },
        { label: 'Batterie', value: '3095 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['ProMotion 120Hz fluide', 'Triple capteur pro + LiDAR', 'A15 encore très performant'],
      cons: ['Prix reconditionné élevé', 'Pas de USB-C (Lightning)'],
    },
  },
  {
    id: 'iphone12promax',
    patterns: ['iphone 12 pro max', '12 pro max'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Super Retina XDR OLED' },
        { label: 'Processeur', value: 'Apple A14 Bionic' },
        { label: 'RAM', value: '6 Go' },
        { label: 'Appareil photo', value: 'Triple 12 MP + LiDAR' },
        { label: 'Batterie', value: '3687 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Grand écran 6.7"', 'Autonomie supérieure au 12 Pro', 'Vidéo Dolby Vision HDR'],
      cons: ['Format imposant', 'Charge rapide 20W seulement'],
    },
  },
  {
    id: 'pixel6pro',
    patterns: ['pixel 6 pro'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces LTPO OLED 120Hz' },
        { label: 'Processeur', value: 'Google Tensor' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP + 48 MP téléobjectif + 12 MP ultra-large' },
        { label: 'Batterie', value: '5003 mAh' },
        { label: 'OS', value: 'Android (mises à jour Google)' },
      ],
      pros: ['Photos Google Tensor IA', 'Écran 120Hz premium', 'Android pur long terme'],
      cons: ['Tensor moins fluide que Snapdragon', 'Format large'],
    },
  },
  {
    id: 'pixel6a',
    patterns: ['pixel 6a'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces OLED' },
        { label: 'Processeur', value: 'Google Tensor' },
        { label: 'RAM', value: '6 Go' },
        { label: 'Appareil photo', value: '12.2 MP + 12 MP ultra-large' },
        { label: 'Batterie', value: '4410 mAh' },
        { label: 'OS', value: 'Android (mises à jour Google)' },
      ],
      pros: ['Capteur principal du Pixel 6', 'Prix accessible reconditionné', 'Android pur'],
      cons: ['Écran 60Hz', 'Charge 18W modeste'],
    },
  },
  {
    id: 'pixel7',
    patterns: ['pixel 7 pro'],
    exclude: ['pixel 7a'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces LTPO OLED 120Hz' },
        { label: 'Processeur', value: 'Google Tensor G2' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP + 48 MP téléobjectif + 12 MP ultra-large' },
        { label: 'Batterie', value: '5000 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Tensor G2 efficace', 'Zoom optique 5x', 'Photos nuit excellentes'],
      cons: ['Prix encore élevé', 'Pas microSD'],
    },
  },
  {
    id: 'pixel7base',
    patterns: ['pixel 7'],
    exclude: ['pro', '7a'],
    data: {
      specs: [
        { label: 'Écran', value: '6.3 pouces OLED 90Hz' },
        { label: 'Processeur', value: 'Google Tensor G2' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP + 12 MP ultra-large' },
        { label: 'Batterie', value: '4355 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Format compact', 'Tensor G2 fluide', 'Mises à jour longues'],
      cons: ['90Hz seulement', 'Pas téléobjectif'],
    },
  },
  {
    id: 'pixel7a',
    patterns: ['pixel 7a'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces OLED 90Hz' },
        { label: 'Processeur', value: 'Google Tensor G2' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '64 MP + 13 MP ultra-large' },
        { label: 'Batterie', value: '4385 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Excellent milieu de gamme Pixel', 'Tensor G2', 'IP67'],
      cons: ['Plastique', 'Charge sans fil lente'],
    },
  },
  {
    id: 'pixel8pro',
    patterns: ['pixel 8 pro'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces LTPO OLED 120Hz' },
        { label: 'Processeur', value: 'Google Tensor G3' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP + 48 MP + 48 MP triple capteur' },
        { label: 'Batterie', value: '5050 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Tensor G3 + IA Gemini', 'Écran 120Hz lumineux', 'Photos pro'],
      cons: ['Prix premium', 'Grand format'],
    },
  },
  {
    id: 'pixel8a',
    patterns: ['pixel 8a'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces OLED 120Hz' },
        { label: 'Processeur', value: 'Google Tensor G3' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '64 MP + 13 MP ultra-large' },
        { label: 'Batterie', value: '4492 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['120Hz à prix Pixel A', 'Tensor G3', 'IP67'],
      cons: ['Châssis plastique', 'Pas téléobjectif'],
    },
  },
  {
    id: 'pixel9pro',
    patterns: ['pixel 9 pro'],
    exclude: ['xl'],
    data: {
      specs: [
        { label: 'Écran', value: '6.3 pouces LTPO OLED 120Hz' },
        { label: 'Processeur', value: 'Google Tensor G4' },
        { label: 'RAM', value: '16 Go' },
        { label: 'Appareil photo', value: '50 MP triple capteur + IA' },
        { label: 'Batterie', value: '4700 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Tensor G4 récent', 'IA Gemini avancée', 'Compact pro'],
      cons: ['Prix élevé', 'Autonomie moyenne'],
    },
  },
  {
    id: 'pixel9',
    patterns: ['pixel 9'],
    exclude: ['pro', 'xl'],
    data: {
      specs: [
        { label: 'Écran', value: '6.3 pouces OLED 120Hz Actua' },
        { label: 'Processeur', value: 'Google Tensor G4' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP + 48 MP ultra-large' },
        { label: 'Batterie', value: '4575 mAh' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Tensor G4', 'Android 15 + IA', 'Écran 120Hz'],
      cons: ['Pas zoom optique', 'Prix milieu-haut'],
    },
  },
  {
    id: 's25edge',
    patterns: ['s25 edge'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Elite for Galaxy' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '200 MP + ultra-large + téléobjectif' },
        { label: 'Batterie', value: '3900 mAh, charge rapide' },
        { label: 'Réseau', value: '5G, dual SIM' },
      ],
      pros: ['Snapdragon 8 Elite', 'Design ultra-fin', 'Écran AMOLED 120Hz'],
      cons: ['Batterie limitée (finesse)', 'Prix flagship'],
    },
  },
  {
    id: 's24ultra',
    patterns: ['s24 ultra', 'galaxy s24 ultra'],
    data: {
      specs: [
        { label: 'Écran', value: '6.8 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 3 for Galaxy' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '200 MP + ultra-large + téléobjectif 5x' },
        { label: 'Batterie', value: '5000 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Capteur 200 MP', 'Zoom 5x optique', 'S Pen intégré'],
      cons: ['Très grand et lourd', 'Prix premium'],
    },
  },
  {
    id: 's24plus',
    patterns: ['s24+', 's24 plus', 'galaxy s24+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 3 for Galaxy' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 10 MP téléobjectif' },
        { label: 'Batterie', value: '4900 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Grand écran 120Hz', 'Snapdragon 8 Gen 3', 'Autonomie solide'],
      cons: ['Pas S Pen', 'Prix élevé'],
    },
  },
  {
    id: 's23ultra',
    patterns: ['s23 ultra', 'galaxy s23 ultra'],
    data: {
      specs: [
        { label: 'Écran', value: '6.8 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 2 for Galaxy' },
        { label: 'RAM', value: '8 Go / 12 Go' },
        { label: 'Appareil photo', value: '200 MP + ultra-large + téléobjectif 10x' },
        { label: 'Batterie', value: '5000 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Zoom 10x unique', 'S Pen', '200 MP détaillé'],
      cons: ['Format imposant', 'Prix encore haut reconditionné'],
    },
  },
  {
    id: 's23fe',
    patterns: ['s23 fe', 's 23 fe'],
    data: {
      specs: [
        { label: 'Écran', value: '6.4 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Exynos 2200 / Snapdragon 8 Gen 1' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 8 MP téléobjectif' },
        { label: 'Batterie', value: '4500 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['AMOLED 120Hz', 'IP68', 'Bon rapport qualité-prix S23'],
      cons: ['Charge 25W', 'Exynos selon version'],
    },
  },
  {
    id: 's23plus',
    patterns: ['s23+', 's23 plus', 'galaxy s23+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.6 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 2 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 10 MP téléobjectif' },
        { label: 'Batterie', value: '4700 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Snapdragon 8 Gen 2', 'Écran 120Hz', 'Autonomie correcte'],
      cons: ['Pas S Pen', 'Prix milieu-haut'],
    },
  },
  {
    id: 's23base',
    patterns: ['s23'],
    exclude: ['ultra', 'fe', '+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 2 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 10 MP téléobjectif' },
        { label: 'Batterie', value: '3900 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Compact flagship', 'Snapdragon 8 Gen 2', '120Hz fluide'],
      cons: ['Autonomie moyenne', 'Charge 25W'],
    },
  },
  {
    id: 's22ultra',
    patterns: ['s22 ultra'],
    data: {
      specs: [
        { label: 'Écran', value: '6.8 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 1 for Galaxy' },
        { label: 'RAM', value: '8 Go / 12 Go' },
        { label: 'Appareil photo', value: '108 MP + ultra-large + téléobjectif 10x' },
        { label: 'Batterie', value: '5000 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['S Pen intégré', 'Zoom 10x', 'Grand écran premium'],
      cons: ['Snapdragon 8 Gen 1 chauffe', 'Lourd'],
    },
  },
  {
    id: 's22plus',
    patterns: ['s22+', 's22 plus', 'galaxy s22+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.6 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 1 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 10 MP téléobjectif' },
        { label: 'Batterie', value: '4500 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Écran 120Hz', 'Design premium', '5G'],
      cons: ['Autonomie moyenne', '8 Gen 1 moins efficace'],
    },
  },
  {
    id: 's22base',
    patterns: ['s22'],
    exclude: ['ultra', '+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.1 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 1 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + 12 MP + 10 MP téléobjectif' },
        { label: 'Batterie', value: '3700 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Format compact', '120Hz', 'IP68'],
      cons: ['Autonomie limitée', 'Charge lente'],
    },
  },
  {
    id: 's21ultra',
    patterns: ['s21 ultra', 'galaxy s21 ultra'],
    data: {
      specs: [
        { label: 'Écran', value: '6.8 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Exynos 2100 / Snapdragon 888' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '108 MP + ultra-large + téléobjectif 10x' },
        { label: 'Batterie', value: '5000 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['S Pen compatible', 'Zoom 10x', 'Écran premium'],
      cons: ['Exynos 2100 moins fluide', 'Charge 25W'],
    },
  },
  {
    id: 's21plus',
    patterns: ['s21+', 's21 plus', 'galaxy s21+'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Exynos 2100 / Snapdragon 888' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '64 MP + 12 MP + 8 MP téléobjectif' },
        { label: 'Batterie', value: '4800 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Grand écran 120Hz', '5G', 'Bon prix reconditionné'],
      cons: ['Pas S Pen', 'Charge 25W'],
    },
  },
  {
    id: 's21base',
    patterns: ['s21'],
    exclude: ['ultra', '+', 'fe'],
    data: {
      specs: [
        { label: 'Écran', value: '6.2 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Exynos 2100 / Snapdragon 888' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '64 MP + 12 MP + 8 MP téléobjectif' },
        { label: 'Batterie', value: '4000 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Compact 5G', '120Hz', 'Prix attractif seconde main'],
      cons: ['Autonomie moyenne', 'Exynos selon version'],
    },
  },
  {
    id: 'zflip6',
    patterns: ['z flip6', 'flip 6', 'flip6'],
    data: {
      specs: [
        { label: 'Écran intérieur', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Écran extérieur', value: '3.4 pouces Super AMOLED' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 3 for Galaxy' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP + 12 MP ultra-large' },
        { label: 'Batterie', value: '4000 mAh' },
      ],
      pros: ['Format fold compact', 'Snapdragon 8 Gen 3', 'Écran couverture utile'],
      cons: ['Autonomie limitée', 'Prix foldable élevé'],
    },
  },
  {
    id: 'zflip5',
    patterns: ['z flip5', 'flip 5', 'flip5'],
    data: {
      specs: [
        { label: 'Écran intérieur', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Écran extérieur', value: '3.4 pouces Super AMOLED' },
        { label: 'Processeur', value: 'Snapdragon 8 Gen 2 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '12 MP dual' },
        { label: 'Batterie', value: '3700 mAh' },
      ],
      pros: ['Design fold unique', '120Hz intérieur', 'IPX8'],
      cons: ['Batterie modeste', 'Prix encore élevé'],
    },
  },
  {
    id: 'zflip4',
    patterns: ['z flip4', 'flip4', 'flip 4'],
    data: {
      specs: [
        { label: 'Écran intérieur', value: '6.7 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Écran extérieur', value: '1.9 pouces Super AMOLED' },
        { label: 'Processeur', value: 'Snapdragon 8+ Gen 1 for Galaxy' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '12 MP dual' },
        { label: 'Batterie', value: '3700 mAh' },
      ],
      pros: ['Fold compact', '120Hz', 'Bon prix reconditionné'],
      cons: ['Petit écran couverture', 'Autonomie limitée'],
    },
  },
  {
    id: 'zfold4',
    patterns: ['z fold4', 'fold4', 'fold 4'],
    data: {
      specs: [
        { label: 'Écran intérieur', value: '7.6 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Écran extérieur', value: '6.2 pouces Dynamic AMOLED 120Hz' },
        { label: 'Processeur', value: 'Snapdragon 8+ Gen 1 for Galaxy' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '50 MP + ultra-large + téléobjectif' },
        { label: 'Batterie', value: '4400 mAh, charge 25W' },
      ],
      pros: ['Tablette + téléphone', 'Multitâche pro', 'S Pen compatible'],
      cons: ['Très cher', 'Épais en mode fermé'],
    },
  },
  {
    id: 'note20',
    patterns: ['note20', 'note 20'],
    exclude: ['note10'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Dynamic AMOLED 2X' },
        { label: 'Processeur', value: 'Exynos 990 / Snapdragon 865+' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '64 MP + 12 MP + 12 MP téléobjectif' },
        { label: 'Batterie', value: '4300 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['S Pen intégré', 'Écran premium', '5G'],
      cons: ['Modèle daté', 'Pas 120Hz'],
    },
  },
  {
    id: 'note10plus',
    patterns: ['note10+', 'note 10+', 'note10 plus'],
    data: {
      specs: [
        { label: 'Écran', value: '6.8 pouces Dynamic AMOLED' },
        { label: 'Processeur', value: 'Exynos 9825 / Snapdragon 855+' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: 'Triple capteur 12 MP + téléobjectif' },
        { label: 'Batterie', value: '4300 mAh, charge 25W' },
        { label: 'Réseau', value: '4G LTE' },
      ],
      pros: ['S Pen', 'Grand écran', 'Prix seconde main bas'],
      cons: ['Pas 5G', 'Modèle ancien'],
    },
  },
  {
    id: 's105g',
    patterns: ['s10 5g'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Dynamic AMOLED' },
        { label: 'Processeur', value: 'Exynos 9820 / Snapdragon 855' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: 'Quad capteur 12 MP + 3D depth' },
        { label: 'Batterie', value: '4500 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Grand écran 5G early', 'Quad capteur', 'Prix bas reconditionné'],
      cons: ['Très ancien', 'Pas 120Hz'],
    },
  },
  {
    id: 's20ultra',
    patterns: ['s20 ultra'],
    data: {
      specs: [
        { label: 'Écran', value: '6.9 pouces Dynamic AMOLED 2X 120Hz' },
        { label: 'Processeur', value: 'Exynos 990 / Snapdragon 865' },
        { label: 'RAM', value: '12 Go' },
        { label: 'Appareil photo', value: '108 MP + ultra-large + téléobjectif 10x' },
        { label: 'Batterie', value: '5000 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['Zoom 100x marketing', 'Grand écran 120Hz', '5000 mAh'],
      cons: ['Modèle 2020', 'Poids important'],
    },
  },
  {
    id: 'galaxyA56',
    patterns: ['galaxy a56', 'a56'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Super AMOLED 120Hz' },
        { label: 'Processeur', value: 'Exynos 1580' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + ultra-large + macro' },
        { label: 'Batterie', value: '5000 mAh, charge 45W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['AMOLED 120Hz', 'IP67', 'Charge 45W'],
      cons: ['Exynos milieu de gamme', 'Pas téléobjectif'],
    },
  },
  {
    id: 'galaxyA36',
    patterns: ['galaxy a36', 'a36'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Super AMOLED 120Hz' },
        { label: 'Processeur', value: 'Exynos 1380' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + ultra-large' },
        { label: 'Batterie', value: '5000 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['AMOLED 120Hz accessible', '5G', 'IP67'],
      cons: ['Charge 25W', 'Pas zoom optique'],
    },
  },
  {
    id: 'galaxyA55',
    patterns: ['galaxy a55', 'a55'],
    data: {
      specs: [
        { label: 'Écran', value: '6.6 pouces Super AMOLED 120Hz' },
        { label: 'Processeur', value: 'Exynos 1480' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP OIS + ultra-large + macro' },
        { label: 'Batterie', value: '5000 mAh, charge 25W' },
        { label: 'Réseau', value: '5G' },
      ],
      pros: ['AMOLED 120Hz', 'IP67', 'Autonomie 5000 mAh'],
      cons: ['Charge 25W', 'Exynos milieu de gamme'],
    },
  },
  {
    id: 'galaxyA16',
    patterns: ['galaxy a16', 'a16'],
    exclude: ['a165'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces Super AMOLED 90Hz' },
        { label: 'Processeur', value: 'MediaTek Helio G99' },
        { label: 'RAM', value: '4 Go / 6 Go / 8 Go' },
        { label: 'Appareil photo', value: '50 MP + 2 MP macro' },
        { label: 'Batterie', value: '5000 mAh, charge 25W' },
        { label: 'Réseau', value: '4G / 5G selon variante' },
      ],
      pros: ['Grand écran AMOLED', '5000 mAh', 'Prix accessible'],
      cons: ['Performances entrée de gamme', 'Charge modeste'],
    },
  },
  {
    id: 'galaxyAmid',
    patterns: [
      'galaxy a32', 'galaxy a33', 'galaxy a53', 'galaxy a54', 'galaxy a24',
      'galaxy a25', 'galaxy a23', 'galaxy a82',
    ],
    data: {
      specs: [
        { label: 'Écran', value: '6.4 à 6.7 pouces AMOLED / LCD 90-120Hz' },
        { label: 'Processeur', value: 'Snapdragon / Exynos milieu de gamme' },
        { label: 'RAM', value: '4 à 8 Go' },
        { label: 'Appareil photo', value: '50 MP principal + capteurs secondaires' },
        { label: 'Batterie', value: '5000 mAh' },
        { label: 'Réseau', value: '4G / 5G selon modèle' },
      ],
      pros: ['Bon rapport qualité-prix', 'Batterie longue durée', 'Double SIM'],
      cons: ['Pas flagship', 'Charge souvent 25W max'],
    },
  },
  {
    id: 'galaxyM',
    patterns: ['galaxy m33', 'galaxy m44', 'galaxy m53'],
    data: {
      specs: [
        { label: 'Écran', value: '6.6 à 6.7 pouces LCD / AMOLED 120Hz' },
        { label: 'Processeur', value: 'MediaTek Dimensity / Exynos' },
        { label: 'RAM', value: '6 à 8 Go' },
        { label: 'Appareil photo', value: '50 à 108 MP principal' },
        { label: 'Batterie', value: '5000 à 6000 mAh' },
        { label: 'Réseau', value: '4G / 5G' },
      ],
      pros: ['Grande batterie', 'Prix compétitif', 'Double SIM'],
      cons: ['Châssis plastique', 'UI avec bloat Samsung'],
    },
  },
  {
    id: 'galaxyWatch',
    patterns: ['galaxy watch', 'watch ultra', 'watch fit'],
    data: {
      specs: [
        { label: 'Type', value: 'Montre connectée Samsung' },
        { label: 'Écran', value: 'AMOLED (taille selon modèle)' },
        { label: 'Connectivité', value: 'Bluetooth, Wi-Fi, GPS' },
        { label: 'Capteurs', value: 'HR, SpO2, accéléromètre' },
        { label: 'Étanchéité', value: '5 ATM / IP68 selon modèle' },
        { label: 'Compatibilité', value: 'Android (Samsung Galaxy recommandé)' },
      ],
      pros: ['Écosystème Samsung Health', 'Design premium', 'Autonomie correcte'],
      cons: ['Fonctions limitées hors Galaxy', 'Prix accessoires Samsung'],
    },
  },
  {
    id: 'galaxyBuds',
    patterns: ['galaxy buds'],
    data: {
      specs: [
        { label: 'Type', value: 'Écouteurs sans fil Samsung' },
        { label: 'Autonomie', value: '5-8 h écoute + boîtier' },
        { label: 'Connectivité', value: 'Bluetooth 5.x' },
        { label: 'Réduction de bruit', value: 'ANC selon modèle' },
        { label: 'Étanchéité', value: 'IPX2 à IP57 selon modèle' },
      ],
      pros: ['Son équilibré', 'Intégration Galaxy', 'Compact'],
      cons: ['ANC moyen vs premium', 'Meilleur avec app Samsung'],
    },
  },
  {
    id: 'redmiNote',
    patterns: ['redmi note 9', 'redmi note 14', 'redmi note 15'],
    data: {
      specs: [
        { label: 'Écran', value: '6.6 à 6.79 pouces AMOLED / LCD 120Hz' },
        { label: 'Processeur', value: 'MediaTek Helio / Dimensity' },
        { label: 'RAM', value: '4 à 8 Go' },
        { label: 'Appareil photo', value: '50 à 108 MP principal' },
        { label: 'Batterie', value: '5000 mAh, charge rapide' },
        { label: 'OS', value: 'HyperOS / MIUI, Android' },
      ],
      pros: ['Grand écran 120Hz', 'Batterie 5000 mAh', 'Prix très accessible'],
      cons: ['UI Xiaomi chargée', 'Pas flagship'],
    },
  },
  {
    id: 'redmiMid',
    patterns: ['redmi 13', 'redmi 14c', 'redmi 15', 'redmi 15c', 'redmi a5'],
    data: {
      specs: [
        { label: 'Écran', value: '6.5 à 6.79 pouces LCD / AMOLED 90-120Hz' },
        { label: 'Processeur', value: 'MediaTek Helio / Snapdragon' },
        { label: 'RAM', value: '4 à 8 Go' },
        { label: 'Appareil photo', value: '50 à 108 MP' },
        { label: 'Batterie', value: '5000 à 6000 mAh' },
        { label: 'OS', value: 'HyperOS, Android' },
      ],
      pros: ['Autonomie longue', 'Stockage généreux', 'Prix bas'],
      cons: ['LCD sur entrée de gamme', 'Publicités HyperOS'],
    },
  },
  {
    id: 'infinixSmart10',
    patterns: ['infinix smart 10'],
    data: {
      specs: [
        { label: 'Écran', value: '6.7 pouces HD+ IPS 120Hz' },
        { label: 'Processeur', value: 'MediaTek Helio G81' },
        { label: 'RAM', value: '4 Go / 6 Go' },
        { label: 'Appareil photo', value: '50 MP principal' },
        { label: 'Batterie', value: '5000 mAh' },
        { label: 'OS', value: 'Android 14 Go / 15' },
      ],
      pros: ['Écran 120Hz entrée de gamme', '5000 mAh', 'Prix très bas'],
      cons: ['HD+ pas Full HD', 'Performances modestes'],
    },
  },
  {
    id: 'infinixHot50',
    patterns: ['hot 50 pro', 'hot 50'],
    data: {
      specs: [
        { label: 'Écran', value: '6.78 pouces AMOLED 120Hz' },
        { label: 'Processeur', value: 'MediaTek Helio G100' },
        { label: 'RAM', value: '8 Go' },
        { label: 'Appareil photo', value: '50 MP + ultra-large' },
        { label: 'Batterie', value: '5160 mAh, charge 45W' },
        { label: 'OS', value: 'Android 15' },
      ],
      pros: ['AMOLED 120Hz', 'Charge 45W', 'Batterie grande'],
      cons: ['UI Infinix avec pubs', 'Pas 5G'],
    },
  },
];

export function matchFamily(name) {
  const key = normalizeKey(name);
  for (const fam of FAMILIES) {
    const hit = fam.patterns.some((p) => key.includes(normalizeKey(p)));
    if (!hit) continue;
    if (fam.exclude?.some((e) => key.includes(normalizeKey(e)))) continue;
    return fam;
  }
  return null;
}

export function buildPayload(product, fam) {
  const storage = extractStorageGb(product.name);
  const ram = extractRamGb(product.name);
  const specs = fam.data.specs.map((s) => ({ ...s }));
  if (storage) {
    const idx = specs.findIndex((s) => normalizeKey(s.label).includes('stockage'));
    if (idx >= 0) specs[idx] = { label: 'Stockage', value: storage };
    else specs.unshift({ label: 'Stockage', value: storage });
  }
  if (ram) {
    const idx = specs.findIndex((s) => normalizeKey(s.label) === 'ram');
    if (idx >= 0) specs[idx] = { label: 'RAM', value: ram };
  }
  return {
    specs,
    pros: [...fam.data.pros],
    cons: [...fam.data.cons],
  };
}

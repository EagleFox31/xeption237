/** Projection equirectangulaire (bounds ≈ carte admin CM, Wikimedia / Simplemaps). */

export const CAMEROON_MAP_BOUNDS = {
  left: 8.2,
  right: 16.6,
  top: 13.5,
  bottom: 1.4,
} as const;

export const CAMEROON_MAP_SIZE = { width: 400, height: 520 } as const;

export type CameroonMapCity = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isHub?: boolean;
  /** Courbure de la liaison vers le hub (−1…1, perpendiculaire à la corde). */
  routeBend?: number;
};

/** Contour simplifié du Cameroun (lat, lng) — usage SVG interne Xeption. */
export const CAMEROON_OUTLINE_LATLNG: ReadonlyArray<readonly [number, number]> = [
  [2.35, 9.45],
  [1.65, 9.55],
  [1.72, 10.85],
  [2.05, 12.55],
  [2.35, 14.15],
  [3.85, 15.85],
  [5.55, 16.45],
  [7.55, 16.55],
  [9.85, 15.75],
  [11.45, 14.75],
  [13.15, 13.45],
  [13.45, 11.05],
  [12.75, 9.15],
  [10.95, 8.45],
  [9.05, 8.25],
  [7.05, 8.55],
  [5.15, 8.85],
  [3.75, 9.15],
  [2.35, 9.45],
];

/** Hub logistique + villes couvertes (aligné site / checkout). Coordonnées WGS84. */
export const CAMEROON_DELIVERY_CITIES: CameroonMapCity[] = [
  { id: 'yaounde', name: 'Yaoundé', lat: 3.848, lng: 11.502, isHub: true },
  { id: 'douala', name: 'Douala', lat: 4.051, lng: 9.768, routeBend: 0.28 },
  { id: 'bafoussam', name: 'Bafoussam', lat: 5.481, lng: 10.428, routeBend: -0.22 },
  { id: 'bamenda', name: 'Bamenda', lat: 5.963, lng: 10.159, routeBend: 0.32 },
  { id: 'kribi', name: 'Kribi', lat: 2.94, lng: 9.91, routeBend: -0.35 },
  { id: 'garoua', name: 'Garoua', lat: 9.323, lng: 13.393, routeBend: 0.25 },
  { id: 'maroua', name: 'Maroua', lat: 10.593, lng: 14.321, routeBend: -0.2 },
  { id: 'ngaoundere', name: 'Ngaoundéré', lat: 7.338, lng: 13.567, routeBend: 0.18 },
];

export const projectCameroonLatLng = (
  lat: number,
  lng: number,
  width = CAMEROON_MAP_SIZE.width,
  height = CAMEROON_MAP_SIZE.height,
): { x: number; y: number } => {
  const { left, right, top, bottom } = CAMEROON_MAP_BOUNDS;
  return {
    x: ((lng - left) / (right - left)) * width,
    y: ((top - lat) / (top - bottom)) * height,
  };
};

export const buildCameroonOutlinePath = (
  width = CAMEROON_MAP_SIZE.width,
  height = CAMEROON_MAP_SIZE.height,
): string => {
  const pts = CAMEROON_OUTLINE_LATLNG.map(([lat, lng]) => projectCameroonLatLng(lat, lng, width, height));
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
};

/** Courbe quadratique elliptique vers le hub (trait interrompu côté SVG). */
export const hubRoutePath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  bend = 0.3,
): string => {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * len * bend;
  const cy = my + (dx / len) * len * bend;
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
};

/** Normalise le nom ville commande → id carte. */
export const matchCameroonMapCityId = (cityLabel?: string | null): string | null => {
  if (!cityLabel?.trim()) return null;
  const norm = cityLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split('(')[0]
    ?.trim();
  const hit = CAMEROON_DELIVERY_CITIES.find((c) => {
    const cn = c.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return norm.includes(cn) || cn.includes(norm);
  });
  return hit?.id ?? null;
};

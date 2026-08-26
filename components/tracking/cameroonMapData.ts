import {
  CAMEROON_GEO_BOUNDS,
  CAMEROON_SVG_SIZE,
} from './cameroonRegions.generated';

export { CAMEROON_REGION_PATHS } from './cameroonRegions.generated';

export const CAMEROON_MAP_BOUNDS = CAMEROON_GEO_BOUNDS;
export const CAMEROON_MAP_SIZE = CAMEROON_SVG_SIZE;

export type CameroonMapCity = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isHub?: boolean;
  /** Courbure de la liaison vers le hub (−1 … 1). */
  bend?: number;
  /** Décalage label (px SVG). */
  labelDx?: number;
  labelDy?: number;
};

/** Villes desservies — hub logistique Yaoundé (aligné site / checkout). */
export const CAMEROON_DELIVERY_CITIES: CameroonMapCity[] = [
  {
    id: 'yaounde',
    name: 'Yaoundé',
    lat: 3.848,
    lng: 11.502,
    isHub: true,
    labelDx: 14,
    labelDy: 5,
  },
  {
    id: 'douala',
    name: 'Douala',
    lat: 4.051,
    lng: 9.768,
    bend: 0.22,
    labelDx: -52,
    labelDy: -4,
  },
  {
    id: 'bafoussam',
    name: 'Bafoussam',
    lat: 5.481,
    lng: 10.428,
    bend: -0.18,
    labelDx: 12,
    labelDy: -10,
  },
  {
    id: 'bamenda',
    name: 'Bamenda',
    lat: 5.963,
    lng: 10.159,
    bend: 0.28,
    labelDx: -58,
    labelDy: 0,
  },
  {
    id: 'kribi',
    name: 'Kribi',
    lat: 2.94,
    lng: 9.91,
    bend: -0.3,
    labelDx: 12,
    labelDy: 8,
  },
  {
    id: 'garoua',
    name: 'Garoua',
    lat: 9.323,
    lng: 13.393,
    bend: 0.2,
    labelDx: 12,
    labelDy: -6,
  },
  {
    id: 'maroua',
    name: 'Maroua',
    lat: 10.593,
    lng: 14.321,
    bend: -0.15,
    labelDx: 12,
    labelDy: -8,
  },
  {
    id: 'ngaoundere',
    name: 'Ngaoundéré',
    lat: 7.338,
    lng: 13.567,
    bend: 0.16,
    labelDx: 12,
    labelDy: 6,
  },
];

/** Région admin (path SVG) par ville desservie. */
export const CITY_REGION_IDS: Record<string, string> = {
  yaounde: 'CM-CE',
  douala: 'CM-LT',
  bafoussam: 'CM-OU',
  bamenda: 'CM-NW',
  kribi: 'CM-SU',
  garoua: 'CM-NO',
  maroua: 'CM-EN',
  ngaoundere: 'CM-AD',
};

export const SERVED_REGION_IDS = new Set(Object.values(CITY_REGION_IDS));

export const projectCameroonLatLng = (
  lat: number,
  lng: number,
  width = CAMEROON_MAP_SIZE.width,
  height = CAMEROON_MAP_SIZE.height,
): { x: number; y: number } => {
  const { left, right, top, bottom } = CAMEROON_GEO_BOUNDS;
  return {
    x: ((lng - left) / (right - left)) * width,
    y: ((top - lat) / (top - bottom)) * height,
  };
};

export const normalizeCityToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const matchDeliveryCity = (customerCity?: string | null): string | null => {
  if (!customerCity?.trim()) return null;
  const token = normalizeCityToken(customerCity);
  const hit = CAMEROON_DELIVERY_CITIES.find((c) => token.includes(normalizeCityToken(c.name)));
  return hit?.id ?? null;
};

export const hubCity = (): CameroonMapCity =>
  CAMEROON_DELIVERY_CITIES.find((c) => c.isHub) ?? CAMEROON_DELIVERY_CITIES[0];

export const curvedRoutePath = (
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

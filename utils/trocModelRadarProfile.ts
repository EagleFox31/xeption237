import { compactModelName } from './trocPricing';

export type RadarAxisKey =
  | 'design'
  | 'ecran'
  | 'performances'
  | 'photo'
  | 'os'
  | 'batterie'
  | 'audio'
  | 'stockage'
  | 'connectivite';

export interface RadarAxis {
  key: RadarAxisKey;
  label: string;
  value: number;
}

export interface ModelRadarProfile {
  modelLabel: string;
  axes: RadarAxis[];
  source: 'reference' | 'estimate';
}

const AXIS_LABELS: Record<RadarAxisKey, string> = {
  design: 'Design',
  ecran: 'Écran',
  performances: 'Perf.',
  photo: 'Photo',
  os: 'OS',
  batterie: 'Batterie',
  audio: 'Audio',
  stockage: 'Stock.',
  connectivite: 'Connect.',
};

const AXIS_FULL_LABELS: Record<RadarAxisKey, string> = {
  design: 'Design',
  ecran: 'Écran',
  performances: 'Performance',
  photo: 'Appareil photo',
  os: "Système d'exploitation",
  batterie: 'Batterie',
  audio: 'Audio',
  stockage: 'Stockage',
  connectivite: 'Connectivité & fonctionnalité',
};

export const RADAR_AXIS_ORDER: RadarAxisKey[] = [
  'design',
  'ecran',
  'performances',
  'photo',
  'os',
  'batterie',
  'audio',
  'stockage',
  'connectivite',
];

type ProfileValues = Record<RadarAxisKey, number>;

/** Profils référence (échelle 0–100, style Versus). Clé = brand_model compact. */
const REFERENCE_PROFILES: Record<string, ProfileValues> = {
  xiaomi_14t: {
    design: 74,
    ecran: 84,
    performances: 82,
    photo: 76,
    os: 70,
    batterie: 78,
    audio: 72,
    stockage: 72,
    connectivite: 88,
  },
  xiaomi_14tpro: {
    design: 78,
    ecran: 86,
    performances: 88,
    photo: 82,
    os: 72,
    batterie: 76,
    audio: 74,
    stockage: 78,
    connectivite: 90,
  },
  apple_iphoneair: {
    design: 92,
    ecran: 88,
    performances: 90,
    photo: 80,
    os: 96,
    batterie: 72,
    audio: 88,
    stockage: 70,
    connectivite: 92,
  },
  apple_iphone15: {
    design: 88,
    ecran: 86,
    performances: 88,
    photo: 84,
    os: 96,
    batterie: 78,
    audio: 86,
    stockage: 68,
    connectivite: 92,
  },
  apple_iphone15pro: {
    design: 92,
    ecran: 90,
    performances: 94,
    photo: 90,
    os: 96,
    batterie: 80,
    audio: 90,
    stockage: 72,
    connectivite: 94,
  },
  samsung_galaxys24ultra: {
    design: 90,
    ecran: 92,
    performances: 94,
    photo: 94,
    os: 82,
    batterie: 82,
    audio: 88,
    stockage: 80,
    connectivite: 92,
  },
  samsung_galaxys24: {
    design: 86,
    ecran: 88,
    performances: 90,
    photo: 86,
    os: 82,
    batterie: 80,
    audio: 84,
    stockage: 74,
    connectivite: 92,
  },
};

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const parseStorageGb = (raw?: string): number | null => {
  if (!raw?.trim()) return null;
  const m = raw.toLowerCase().match(/(\d+)\s*(to|tb|go|gb)/i);
  if (!m) return null;
  let n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  if (/to|tb/.test(m[2])) n *= 1024;
  return n;
};

const parseRamGb = (raw?: string): number | null => {
  if (!raw?.trim()) return null;
  const m = raw.toLowerCase().match(/(\d+)\s*(go|gb)/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};

const storageScore = (gb: number | null): number => {
  if (gb === null) return 55;
  if (gb >= 1024) return 92;
  if (gb >= 512) return 82;
  if (gb >= 256) return 72;
  if (gb >= 128) return 62;
  if (gb >= 64) return 50;
  return 38;
};

const ramScore = (gb: number | null): number => {
  if (gb === null) return 55;
  if (gb >= 16) return 90;
  if (gb >= 12) return 84;
  if (gb >= 8) return 74;
  if (gb >= 6) return 64;
  if (gb >= 4) return 52;
  return 40;
};

const osScoreByBrand = (brand: string): number => {
  const b = (brand || '').toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return 96;
  if (b.includes('google') || b.includes('pixel')) return 88;
  if (b.includes('samsung')) return 82;
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 72;
  if (b.includes('oneplus')) return 78;
  return 65;
};

const profileKey = (brand: string, model: string): string => {
  const b = compactModelName(brand);
  const m = compactModelName(model);
  return `${b}_${m}`.replace(/^_+|_+$/g, '');
};

const tierFallback = (brand: string, model: string): ProfileValues => {
  const b = (brand || '').toLowerCase();
  const m = compactModelName(model);
  const isApple = b.includes('apple') || b.includes('iphone');
  const isSamsung = b.includes('samsung');
  const isXiaomi = b.includes('xiaomi') || b.includes('redmi') || b.includes('poco');

  let base = 58;
  if (isApple && /1[4-9]/.test(m)) base = 82;
  else if (isSamsung && /s2[3-9]|s[3-9]\d/.test(m)) base = 84;
  else if (isXiaomi && /1[4-9]/.test(m)) base = 78;
  else if (isApple || isSamsung || isXiaomi) base = 68;

  const designBoost = isApple ? 12 : isSamsung ? 8 : isXiaomi ? 4 : 0;
  const audioBoost = isApple ? 10 : isSamsung ? 6 : 4;

  return {
    design: base + designBoost,
    ecran: base,
    performances: base - 2,
    photo: base - 6,
    os: osScoreByBrand(brand),
    batterie: base - 4,
    audio: base + audioBoost - 6,
    stockage: base - 8,
    connectivite: base + 4,
  };
};

const buildAxes = (values: ProfileValues): RadarAxis[] =>
  RADAR_AXIS_ORDER.map((key) => ({
    key,
    label: AXIS_LABELS[key],
    value: clamp(values[key]),
  }));

export const getRadarAxisFullLabel = (key: RadarAxisKey): string => AXIS_FULL_LABELS[key];

export const buildModelRadarProfile = (
  brand: string,
  model: string,
  opts?: { storage?: string; ram?: string },
): ModelRadarProfile => {
  const key = profileKey(brand, model);
  const ref = REFERENCE_PROFILES[key];
  const storageGb = parseStorageGb(opts?.storage);
  const ramGb = parseRamGb(opts?.ram);

  const values: ProfileValues = ref
    ? { ...ref }
    : tierFallback(brand, model);

  if (storageGb !== null) {
    values.stockage = Math.round((values.stockage + storageScore(storageGb)) / 2);
  }
  if (ramGb !== null) {
    values.performances = Math.round((values.performances + ramScore(ramGb)) / 2);
  }

  const label = [brand, model].filter(Boolean).join(' ').trim() || 'Modèle';

  return {
    modelLabel: label,
    axes: buildAxes(values),
    source: ref ? 'reference' : 'estimate',
  };
};

/** Scores d'état client mappés sur les mêmes axes (polygone secondaire). */
export const buildUnitConditionRadar = (
  form: {
    screenCondition?: string;
    bodyCondition?: string;
    batteryHealth?: number;
    cameraCondition?: string;
    chargesNormally?: boolean;
    biometricsWork?: boolean;
    accountUnlocked?: boolean;
    powersOn?: boolean;
    previousRepairs?: string;
  },
): RadarAxis[] => {
  const screen =
    form.screenCondition === 'parfait' ? 100
      : form.screenCondition === 'micro_rayures' ? 82
        : form.screenCondition === 'rayures' ? 55
          : form.screenCondition === 'fissuré' ? 8 : 70;

  const body =
    form.bodyCondition === 'parfait' ? 100
      : form.bodyCondition === 'micro_rayures' ? 85
        : form.bodyCondition === 'rayures' ? 58
          : form.bodyCondition === 'bosses' ? 28 : 70;

  const battery = clamp(form.batteryHealth ?? 80);
  const camera =
    form.cameraCondition === 'bon' ? 100
      : form.cameraCondition === 'rayures' ? 68
        : form.cameraCondition === 'défectueuse' ? 5 : 90;

  const functional = clamp(
    ((form.chargesNormally ?? true) ? 90 : 35) * 0.35
    + ((form.biometricsWork ?? true) ? 90 : 55) * 0.35
    + ((form.accountUnlocked ?? true) ? 95 : 60) * 0.30,
  );

  const repairPenalty =
    form.previousRepairs === 'aucune' ? 0
      : form.previousRepairs === 'écran' ? 12
        : form.previousRepairs === 'batterie' ? 8
          : form.previousRepairs === 'autre' ? 15
            : 0;

  const perf = clamp(functional - repairPenalty);

  return buildAxes({
    design: body,
    ecran: screen,
    performances: perf,
    photo: camera,
    os: (form.powersOn ?? true) ? 96 : 20,
    batterie: battery,
    audio: clamp(Math.round(body * 0.55 + functional * 0.45) - Math.round(repairPenalty * 0.5)),
    stockage: Math.round((screen + body) / 2),
    connectivite: functional,
  });
};

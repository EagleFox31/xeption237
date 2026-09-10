export type BandwidthTier = 'fast' | 'medium' | 'slow';
export type BandwidthSource = 'cached' | 'connection-api' | 'speed-test' | 'default';

export interface BandwidthProfile {
  tier: BandwidthTier;
  downlinkMbps: number | null;
  effectiveType: string | null;
  source: BandwidthSource;
  measuredAt: number;
}

interface NetworkInformationLike {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

const CACHE_KEY = 'xeption_bandwidth_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Asset local ~50–100 KB — test léger, pas de requête externe */
const SPEED_TEST_URL = '/icons/icon-512x512.png';

/** Pessimiste par défaut (237) — le cache session ou l’API réseau peut relever avant le 1er paint. */
let activeTier: BandwidthTier = 'slow';

export const getBandwidthTier = (): BandwidthTier => activeTier;

export const setBandwidthTier = (tier: BandwidthTier): void => {
  activeTier = tier;
};

const getConnection = (): NetworkInformationLike | null => {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { connection?: NetworkInformationLike };
  return nav.connection ?? null;
};

const classifyTier = (
  downlinkMbps: number | null,
  effectiveType: string | null,
): BandwidthTier => {
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
  if (effectiveType === '4g' && downlinkMbps != null && downlinkMbps >= 5) return 'fast';

  if (downlinkMbps == null) return 'medium';
  if (downlinkMbps < 1.5) return 'slow';
  if (downlinkMbps < 4) return 'medium';
  return 'fast';
};

const readCache = (): BandwidthProfile | null => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BandwidthProfile;
    if (Date.now() - parsed.measuredAt > CACHE_TTL_MS) return null;
    setBandwidthTier(parsed.tier);
    return { ...parsed, source: 'cached' };
  } catch {
    return null;
  }
};

const writeCache = (profile: BandwidthProfile): void => {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* quota / mode privé */
  }
};

const measureDownloadMbps = async (url: string): Promise<number | null> => {
  try {
    const start = performance.now();
    const response = await fetch(`${url}?bw=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const seconds = (performance.now() - start) / 1000;
    if (seconds <= 0 || blob.size <= 0) return null;
    const bits = blob.size * 8;
    return bits / seconds / 1_000_000;
  } catch {
    return null;
  }
};

/**
 * Estime la bande passante du client :
 * 1. Cache session (10 min)
 * 2. Network Information API (Chrome, Edge, etc.)
 * 3. Micro test de téléchargement sur un asset local
 */
export const detectBandwidth = async (): Promise<BandwidthProfile> => {
  const cached = readCache();
  if (cached) return cached;

  const connection = getConnection();
  let source: BandwidthSource = 'default';
  let downlinkMbps: number | null = connection?.downlink ?? null;
  const effectiveType = connection?.effectiveType ?? null;

  if (connection?.saveData) {
    const profile: BandwidthProfile = {
      tier: 'slow',
      downlinkMbps: downlinkMbps ?? 0.5,
      effectiveType,
      source: 'connection-api',
      measuredAt: Date.now(),
    };
    setBandwidthTier(profile.tier);
    writeCache(profile);
    return profile;
  }

  if (downlinkMbps != null && downlinkMbps > 0) {
    source = 'connection-api';
  } else {
    downlinkMbps = await measureDownloadMbps(SPEED_TEST_URL);
    source = downlinkMbps != null ? 'speed-test' : 'default';
  }

  const tier = classifyTier(downlinkMbps, effectiveType);
  const profile: BandwidthProfile = {
    tier,
    downlinkMbps,
    effectiveType,
    source,
    measuredAt: Date.now(),
  };

  setBandwidthTier(tier);
  writeCache(profile);
  return profile;
};

/**
 * Hydrate le tier **avant** le premier render React (appel depuis index.tsx).
 * 1. Cache session (10 min) — visite récente
 * 2. Network Information API — synchrone si dispo (Chrome / Edge mobile)
 * 3. Sinon reste `slow`
 */
export const hydrateBandwidthTier = (): BandwidthTier => {
  const cached = readCache();
  if (cached) return cached.tier;

  const connection = getConnection();
  if (connection?.saveData) {
    setBandwidthTier('slow');
    return 'slow';
  }

  const downlink = connection?.downlink ?? null;
  const effectiveType = connection?.effectiveType ?? null;
  if (downlink != null || effectiveType != null) {
    const tier = classifyTier(downlink, effectiveType);
    setBandwidthTier(tier);
    return tier;
  }

  return activeTier;
};

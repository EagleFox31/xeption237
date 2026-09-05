import { useEffect, useState } from 'react';
import {
  detectBandwidth,
  getBandwidthTier,
  type BandwidthProfile,
  type BandwidthTier,
} from '../utils/bandwidthDetector';

export const useBandwidthDetector = () => {
  const [profile, setProfile] = useState<BandwidthProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectBandwidth().then((result) => {
      if (!cancelled) setProfile(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tier: BandwidthTier = profile?.tier ?? getBandwidthTier();

  return {
    profile,
    tier,
    isSlow: tier === 'slow',
    isFast: tier === 'fast',
    isLoading: profile == null,
  };
};

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

    const updateProfile = (forceFresh = false) => {
      detectBandwidth(forceFresh).then((result) => {
        if (!cancelled) setProfile(result);
      });
    };

    updateProfile(false);

    // Écoute en temps réel des changements réseau (passage 4G -> 3G -> 2G ou activation saveData)
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

    if (conn && typeof conn.addEventListener === 'function') {
      const handleConnectionChange = () => {
        updateProfile(true);
      };
      conn.addEventListener('change', handleConnectionChange);
      return () => {
        cancelled = true;
        conn.removeEventListener('change', handleConnectionChange);
      };
    }

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
    isVideoAllowed: profile?.isVideoAllowed ?? (tier === 'fast' && typeof window !== 'undefined' && window.innerWidth >= 768),
    isLoading: profile == null,
    effectiveType: profile?.effectiveType ?? null,
  };
};

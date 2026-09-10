const CREDIBILITY_PREFIX = 'troc_photos_credibility:';

const sessionKey = (): string => sessionStorage.getItem('troc_session_key') ?? '';

export const markTrocPhotosCredibilityVerified = (photoUrls: string[]): void => {
  const key = sessionKey();
  if (!key || photoUrls.length === 0) return;
  sessionStorage.setItem(
    `${CREDIBILITY_PREFIX}${key}`,
    JSON.stringify({
      fingerprint: photoUrls.slice().sort().join('|'),
      verifiedAt: Date.now(),
    }),
  );
};

export const isTrocPhotosCredibilityVerified = (photoUrls: string[]): boolean => {
  const key = sessionKey();
  if (!key || photoUrls.length === 0) return false;
  const raw = sessionStorage.getItem(`${CREDIBILITY_PREFIX}${key}`);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { fingerprint?: string };
    return parsed.fingerprint === photoUrls.slice().sort().join('|');
  } catch {
    return false;
  }
};

export const clearTrocPhotosCredibilityVerified = (): void => {
  const key = sessionKey();
  if (key) sessionStorage.removeItem(`${CREDIBILITY_PREFIX}${key}`);
};

import { safeRandomUUID } from './uuid';

const TROC_SESSION_STORAGE_KEY = 'troc_session_key';

/** Clé de session Smart Troc — persistée en localStorage (survit à fermeture/réouverture d'onglet) et sessionStorage. */
export function getTrocSessionKey(): string {
  let key: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      key = localStorage.getItem(TROC_SESSION_STORAGE_KEY);
    }
  } catch {}

  if (!key) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        key = sessionStorage.getItem(TROC_SESSION_STORAGE_KEY);
      }
    } catch {}
  }

  if (!key) {
    key = safeRandomUUID();
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TROC_SESSION_STORAGE_KEY, key);
    }
  } catch {}
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TROC_SESSION_STORAGE_KEY, key);
    }
  } catch {}

  return key;
}

/** Génère une nouvelle clé de session vierge lors d'une nouvelle estimation. */
export function resetTrocSessionKey(): string {
  const newKey = safeRandomUUID();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TROC_SESSION_STORAGE_KEY, newKey);
    }
  } catch {}
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TROC_SESSION_STORAGE_KEY, newKey);
    }
  } catch {}

  return newKey;
}

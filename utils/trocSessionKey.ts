const TROC_SESSION_STORAGE_KEY = 'troc_session_key';

/** Clé de session Smart Troc — une par onglet, pour paiement, IMEI et quotas IA. */
export function getTrocSessionKey(): string {
  let key = sessionStorage.getItem(TROC_SESSION_STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(TROC_SESSION_STORAGE_KEY, key);
  }
  return key;
}

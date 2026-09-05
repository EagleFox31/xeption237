const SW_URL = '/sw-admin.js';

export async function registerAdminServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('Service worker admin non enregistré', err);
    return null;
  }
}

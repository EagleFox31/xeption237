declare global {
  interface Window { dataLayer?: object[]; }
}

export const pushEvent = (event: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...(params ?? {}) });
};

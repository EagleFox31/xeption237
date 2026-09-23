/**
 * Couche unique d'événements analytics — passe par le dataLayer de Google Tag Manager.
 * GTM redistribue ensuite vers GA4 (funnel, audience) et Meta Pixel (retargeting FB/IG).
 *
 * IMPORTANT : on ne touche PAS directement à ga('send') ou fbq('track') ici. Toute la
 * configuration des tags (GA4 measurement id, Meta Pixel id, mapping des event names,
 * paramètres custom) se fait dans l'UI GTM — donc pas de redéploiement pour ajuster.
 *
 * Structure de payload : GA4 standard ecommerce (items[], value, currency) + params custom
 * (troc_step, imei_status, grade, etc.). Meta Pixel reçoit les mêmes events via GTM et
 * on mappe côté GTM vers les events standards (`Purchase`, `Lead`, `ViewContent`).
 *
 * Silencieux en dev sans VITE_GTM_ID : log console + no-op.
 */

type DataLayerEvent = Record<string, unknown> & { event: string };

const GTM_ID = (import.meta.env?.VITE_GTM_ID as string | undefined)?.trim();
const IS_DEV = import.meta.env?.DEV === true;
const IS_ENABLED = Boolean(GTM_ID);

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

/** Pousse un event brut au dataLayer. Ne pas appeler directement — utiliser les helpers typés. */
const push = (payload: DataLayerEvent): void => {
  if (typeof window === 'undefined') return;
  if (IS_DEV) console.info('[analytics]', payload.event, payload);
  if (!IS_ENABLED) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
};

// ─── SMART TROC funnel ─────────────────────────────────────────────────────────

export type TrocStep = 'form' | 'photos' | 'diagnostic' | 'imei' | 'payment' | 'result' | 'voucher';

export const trackTrocStart = (): void => {
  push({ event: 'troc_start' });
};

export const trackTrocStepView = (step: TrocStep): void => {
  push({ event: 'troc_step_view', troc_step: step });
};

export const trackTrocPhotosUploaded = (count: number): void => {
  push({ event: 'troc_photos_uploaded', photos_count: count });
};

export const trackTrocImeiChecked = (status: 'valid' | 'invalid' | 'blacklisted' | 'failed'): void => {
  push({ event: 'troc_imei_checked', imei_status: status });
};

export const trackTrocPaymentInitiated = (amount: number, tier: string): void => {
  push({ event: 'troc_payment_initiated', value: amount, currency: 'XAF', troc_tier: tier });
};

export const trackTrocPaymentPaid = (amount: number, tier: string): void => {
  push({ event: 'troc_payment_paid', value: amount, currency: 'XAF', troc_tier: tier });
};

export const trackTrocResultShown = (grade: string, tradeInValue: number): void => {
  push({ event: 'troc_result_shown', grade, value: tradeInValue, currency: 'XAF' });
};

export const trackTrocOfferAccepted = (grade: string, value: number): void => {
  push({ event: 'troc_offer_accepted', grade, value, currency: 'XAF' });
};

export const trackTrocOfferRefused = (reason?: string): void => {
  push({ event: 'troc_offer_refused', reason: reason ?? 'unknown' });
};

export const trackTrocVoucherGenerated = (reference: string): void => {
  push({ event: 'troc_voucher_generated', voucher_ref: reference });
};

/** Choix final après voucher : vendre à Xeption / marketplace / échanger */
export const trackTrocChoice = (choice: 'sell_to_xeption' | 'marketplace' | 'exchange'): void => {
  push({ event: 'troc_choice', troc_choice: choice });
};

// ─── Marketplace ───────────────────────────────────────────────────────────────

export const trackMarketplaceBrowseView = (listingsCount: number): void => {
  push({ event: 'marketplace_browse_view', listings_count: listingsCount });
};

export const trackMarketplaceListingClick = (listingId: string, priceMax: number): void => {
  push({ event: 'marketplace_listing_click', listing_id: listingId, value: priceMax, currency: 'XAF' });
};

export const trackMarketplaceContactSeller = (listingId: string, priceMax: number): void => {
  push({ event: 'marketplace_contact_seller', listing_id: listingId, value: priceMax, currency: 'XAF' });
};

export const trackMarketplaceListingStepView = (step: 1 | 2 | 3): void => {
  push({ event: 'marketplace_listing_step', listing_step: step });
};

export const trackMarketplacePaymentInitiated = (fee: number, priceMax: number): void => {
  push({ event: 'marketplace_payment_initiated', value: fee, price_max: priceMax, currency: 'XAF' });
};

export const trackMarketplaceListingPublished = (fee: number, priceMax: number): void => {
  push({ event: 'marketplace_listing_published', value: fee, price_max: priceMax, currency: 'XAF' });
};

// ─── Ecommerce GA4 standard (issue #16) ────────────────────────────────────────

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price: number;
  quantity?: number;
}

export const trackViewItem = (item: EcommerceItem): void => {
  push({
    event: 'view_item',
    ecommerce: { currency: 'XAF', value: item.price, items: [item] },
  });
};

export const trackAddToCart = (item: EcommerceItem): void => {
  push({
    event: 'add_to_cart',
    ecommerce: { currency: 'XAF', value: item.price * (item.quantity ?? 1), items: [item] },
  });
};

export const trackRemoveFromCart = (item: EcommerceItem): void => {
  push({
    event: 'remove_from_cart',
    ecommerce: { currency: 'XAF', value: item.price * (item.quantity ?? 1), items: [item] },
  });
};

export const trackBeginCheckout = (items: EcommerceItem[], total: number): void => {
  push({
    event: 'begin_checkout',
    ecommerce: { currency: 'XAF', value: total, items },
  });
};

export const trackPurchase = (orderId: string, items: EcommerceItem[], total: number): void => {
  push({
    event: 'purchase',
    ecommerce: {
      transaction_id: orderId,
      currency: 'XAF',
      value: total,
      items,
    },
  });
};

// ─── Générique (page views custom, clics importants) ───────────────────────────

export const trackEvent = (name: string, params?: Record<string, unknown>): void => {
  push({ event: name, ...(params ?? {}) });
};

import type { TradeInRequest } from '../types';
import { buildPublicSiteUrl } from './publicSiteUrl';

/**
 * Référence canonique affichée / imprimée / QR (TRC-…, jamais TR-TRC-…).
 */
export const resolveVoucherReference = (
  request: Pick<TradeInRequest, 'id' | 'voucher_reference'>,
): string => normalizeVoucherLookupRef(request.voucher_reference?.trim() || request.id);

/**
 * Normalise la saisie client (/bon, recherche, anciens PDF) :
 * TR-TRC-178… → TRC-178…
 */
export const normalizeVoucherLookupRef = (raw: string): string => {
  let ref = raw.trim().toUpperCase().replace(/\s/g, '');
  if (ref.startsWith('TR-TRC-')) ref = ref.slice(3);
  else if (ref.startsWith('TR-TRC')) ref = ref.slice(3);
  return ref;
};

/** URL de consultation du bon (/bon?ref=…) — local en dev, prod en ligne. */
export const buildBonPortalUrl = (voucherRef: string): string =>
  buildPublicSiteUrl(`/bon?ref=${encodeURIComponent(normalizeVoucherLookupRef(voucherRef))}`);

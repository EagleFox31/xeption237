import { supabase } from './supabaseClient';
import type { TradeInRequest } from '../types';
import type { TrocTargetSummary } from './trocCheckoutService';
import { readEdgeFunctionErrorMessage } from '../utils/edgeFunctionError';
import { normalizeVoucherLookupRef } from '../utils/trocVoucherRef';

export type PublicTrocVoucher = {
  id: string;
  voucher_reference: string | null;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  trade_in_value: number;
  status: TradeInRequest['status'];
  created_at: string;
  voucher_expires_at: string | null;
  target_product_id: string | null;
  target_product_name: string | null;
  tier: TradeInRequest['tier'];
  imei: string | null;
  target: TrocTargetSummary | null;
  canChangeTarget: boolean;
};

type LookupBody = {
  action?: 'lookup' | 'set-target';
  voucherReference: string;
  phoneSuffix: string;
  productId?: string;
  productName?: string;
};

const invoke = async (body: LookupBody): Promise<PublicTrocVoucher> => {
  const normalizedBody = {
    ...body,
    voucherReference: normalizeVoucherLookupRef(body.voucherReference),
  };
  const { data, error } = await supabase.functions.invoke('troc-voucher-lookup', { body: normalizedBody });
  if (error) {
    throw new Error(
      await readEdgeFunctionErrorMessage(error, 'Consultation impossible pour le moment.'),
    );
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error('Réponse serveur invalide.');
  }
  return data as PublicTrocVoucher;
};

export const lookupTrocVoucher = (
  voucherReference: string,
  phoneSuffix: string,
): Promise<PublicTrocVoucher> =>
  invoke({ action: 'lookup', voucherReference, phoneSuffix });

export const updateTrocVoucherTarget = (
  voucherReference: string,
  phoneSuffix: string,
  productId: string,
  productName: string,
): Promise<PublicTrocVoucher> =>
  invoke({
    action: 'set-target',
    voucherReference,
    phoneSuffix,
    productId,
    productName,
  });

/** Convertit la réponse publique en TradeInRequest minimal pour TrocVoucher / PDF. */
export const toTradeInRequestView = (voucher: PublicTrocVoucher): TradeInRequest =>
  ({
    id: voucher.id,
    voucher_reference: voucher.voucher_reference ?? voucher.id,
    customer_name: voucher.customer_name,
    customer_phone: voucher.customer_phone,
    device_brand: voucher.device_brand,
    device_model: voucher.device_model,
    trade_in_value: voucher.trade_in_value,
    status: voucher.status,
    created_at: voucher.created_at,
    voucher_expires_at: voucher.voucher_expires_at,
    target_product_id: voucher.target_product_id,
    target_product_name: voucher.target_product_name,
    tier: voucher.tier,
    imei: voucher.imei ?? undefined,
    photo_urls: [],
    imei_status: 'not_checked',
    imei_blacklist_status: 'unknown',
    imei_assurance_level: 'basic',
  }) as TradeInRequest;

export const targetSummaryFromPublic = (
  voucher: PublicTrocVoucher,
): TrocTargetSummary | null => voucher.target;

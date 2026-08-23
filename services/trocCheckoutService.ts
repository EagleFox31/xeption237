import { supabase } from './supabaseClient';
import type { TradeInRequest, Product } from '../types';
import { DB_TABLES, DB_SCHEMA } from '../constants/dbSchema';
import { assertRpcSuccess } from '../utils/rpcResult';

/**
 * Reste à payer = prix cible − crédit, plancher 0.
 * Le crédit est un PLAFOND : jamais de cash rendu (surplus → upsell, cf. décisions troc).
 */
export const resteAPayer = (targetPrice: number, credit: number): number =>
  Math.max(0, Math.round(targetPrice - credit));

export interface TrocCheckoutResult {
  orderId: string;
  targetName: string;
  targetPrice: number;
  credit: number;
  reste: number;
}

/** Prix + stock courants de l'appareil cible (pour afficher le reste à payer avant clôture). */
export const getTargetPricing = async (
  productId: string,
): Promise<{ price: number; stock: number; name: string } | null> => {
  const { data, error } = await supabase
    .from(DB_TABLES.PRODUCTS)
    .select('price, stock, name')
    .eq('id', productId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { price?: number; stock?: number; name?: string };
  return { price: Number(row.price ?? 0), stock: Number(row.stock ?? 0), name: row.name ?? '' };
};

/**
 * Clôture d'un dossier troc AVEC vente de l'appareil cible (couplage POS, tranche 3.2).
 * Transaction serveur : commande + décrément stock + clôture dossier en une RPC atomique.
 *
 * Les garde-fous d'expiration/machine à états sont vérifiés en amont (UI + trocRedemption).
 */
export const completeTrocWithSale = async (
  request: TradeInRequest,
  opts: { paymentMethod: 'CASH' | 'OM' | 'MOMO'; reason?: string },
): Promise<TrocCheckoutResult> => {
  if (!request.target_product_id) {
    throw new Error('Aucun appareil cible sur ce dossier (bon générique).');
  }

  const orderId = `TRC-POS-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const { data: rpcData, error: rpcError } = await supabase.rpc('complete_troc_with_sale_atomic', {
    p_trade_in_request_id: request.id,
    p_order_id: orderId,
    p_payment_method: opts.paymentMethod,
    p_date: nowIso,
    p_redemption_reason: opts.reason?.trim() || null,
  });

  if (rpcError) {
    throw new Error(rpcError.message || 'Erreur lors de la clôture troc.');
  }
  assertRpcSuccess(rpcData, 'Impossible de finaliser la vente troc.');

  const payload = rpcData as {
    order_id?: string;
    target_name?: string;
    target_price?: number;
    credit?: number;
    reste?: number;
  };

  return {
    orderId: payload.order_id ?? orderId,
    targetName: payload.target_name ?? request.target_product_name ?? '',
    targetPrice: Number(payload.target_price ?? 0),
    credit: Number(payload.credit ?? request.trade_in_value ?? 0),
    reste: Number(payload.reste ?? 0),
  };
};

/**
 * Pure helpers for Smart Troc vouchers in Telegram bot & Edge Functions.
 * No Deno / npm imports: runnable in Vitest and Edge Functions.
 */

/**
 * Normalise la référence d'un bon de reprise :
 *   - suppression des espaces
 *   - mise en majuscules
 *   - TR-TRC-... -> TRC-...
 *   - TR-TRC...  -> TRC...
 *
 * Strictement identique à utils/trocVoucherRef.ts et à la fonction SQL
 * public.normalize_voucher_lookup_ref(text).
 */
export function normalizeVoucherLookupRef(raw: string | null | undefined): string {
  if (!raw) return "";
  let ref = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (ref.startsWith("TR-TRC-")) {
    ref = ref.slice(3);
  } else if (ref.startsWith("TR-TRC")) {
    ref = ref.slice(3);
  }
  return ref;
}

export interface TrocVoucherCheckResult {
  valid: boolean;
  reason?: "not_found" | "already_used" | "not_validated" | "expired" | "zero_value" | "unauthorized";
  trade_in_id?: string;
  voucher_reference?: string;
  device_name?: string;
  trade_in_value?: number;
  customer_name?: string;
  customer_phone?: string;
  target_product_id?: string | null;
  target_product_name?: string | null;
  voucher_expires_at?: string | null;
  order_id?: string | null;
  status?: string;
}

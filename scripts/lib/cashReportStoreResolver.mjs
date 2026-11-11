/**
 * Compatibilité Node : la résolution boutique / vendeur vit désormais dans
 * `supabase/functions/_shared/whatsappCashReport/storeResolver.ts` (partagé avec l'Edge Function).
 */
export { MIN_TOKEN_LENGTH, createStoreResolver } from '../../supabase/functions/_shared/whatsappCashReport/storeResolver.ts';

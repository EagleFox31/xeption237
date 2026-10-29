-- 20261029_002_revoke_bot_rpc_authenticated.sql
-- Lot 4 : les fonctions créées par 20261029_001 ont hérité de l'EXECUTE accordé par défaut
-- à `authenticated` (default ACL Supabase). `REVOKE … FROM PUBLIC, anon` ne le retire pas :
-- un client connecté (lien magique du formulaire troc) pouvait les appeler. Réservées au bot.
-- Contrôle : npm run db:inventory → « RPC service_role exécutables par anon/authenticated ».

BEGIN;

REVOKE ALL ON FUNCTION public.normalize_voucher_lookup_ref(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_troc_voucher_check(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.normalize_voucher_lookup_ref(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_troc_voucher_check(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb, text) TO service_role;

COMMIT;

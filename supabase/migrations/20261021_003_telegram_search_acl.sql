-- 20261021_002 a ouvert la recherche Telegram à PUBLIC/anon/authenticated : n'importe qui muni de
-- la clé anon (publique, embarquée dans le site) lisait prix et stock par boutique, et tout compte
-- client pouvait appeler telegram_staff_product_lookup en se faisant passer pour un telegram_user_id
-- (non secret). Seul le bot (service_role) doit les exécuter. Rejouable.

BEGIN;

REVOKE ALL ON FUNCTION public.telegram_search_products_fuzzy(text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_search_products_fuzzy(text, text, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_product_lookup(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_lookup(text, text) TO service_role;

COMMIT;

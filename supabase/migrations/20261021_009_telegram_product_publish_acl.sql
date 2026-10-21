-- Sécurité des RPC de publication Telegram (20261021_008_telegram_product_direction_publish).
-- 008 accordait EXECUTE à PUBLIC (défaut Postgres) et à authenticated : n'importe quel
-- visiteur muni de l'identifiant Telegram (non secret) d'un membre de la direction pouvait
-- publier un produit ou changer le prix (>= 500) d'un produit déjà en ligne.
-- 1. Seul le bot (service_role) exécute ces fonctions.
-- 2. La publication ne s'applique qu'à un produit encore masqué : elle ne sert plus à
--    modifier le prix d'un produit en ligne.
BEGIN;

CREATE OR REPLACE FUNCTION public.telegram_staff_product_publish(
  p_telegram_user_id text,
  p_product_id text,
  p_public_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_product record;
  v_final_price numeric;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank IS NULL OR v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF v_product.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'product_not_found');
  END IF;
  IF v_product.is_published THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_published');
  END IF;

  v_final_price := CASE
    WHEN p_public_price IS NOT NULL AND p_public_price >= 500 THEN p_public_price
    ELSE v_product.price
  END;

  UPDATE public.products
  SET is_published = true, price = v_final_price, updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'name', v_product.name,
    'price', v_final_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_pending_products_count(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_product_publish(text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_product_reject(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_pending_products_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_publish(text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_reject(text, text) TO service_role;

COMMIT;

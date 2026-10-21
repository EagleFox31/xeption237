-- Refus d'un produit créé depuis Telegram : traçable, sans suppression.
-- La version 008 supprimait dans store_stock_movements (table inexistante : l'appel échouait
-- toujours) et aurait effacé l'historique de stock ; stock_movements.product_id bloque de toute
-- façon le DELETE du produit. Désormais :
--   - le stock restant est sorti par _store_stock_delta (mouvement inventory_adjust tracé) ;
--   - le produit reste masqué et reçoit rejected_at (il quitte la file « en attente ») ;
--   - un produit déjà vendu ou avec du stock réservé ne peut pas être refusé.
BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

CREATE OR REPLACE FUNCTION public.telegram_staff_pending_products_count(
  p_telegram_user_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank IS NULL OR v_actor.o_rank < 2 THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.products
  WHERE is_published = false AND rejected_at IS NULL;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_product_reject(
  p_telegram_user_id text,
  p_product_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_product record;
  v_row record;
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
    RETURN jsonb_build_object('success', false, 'reason', 'cannot_reject_published_product');
  END IF;
  -- Replayed tap: already refused, nothing to do.
  IF v_product.rejected_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'name', v_product.name, 'already_done', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = p_product_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'has_sales');
  END IF;
  IF EXISTS (SELECT 1 FROM public.store_stock WHERE product_id = p_product_id AND reserved > 0) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'stock_reserved');
  END IF;

  FOR v_row IN
    SELECT store_id, quantity FROM public.store_stock
    WHERE product_id = p_product_id AND quantity > 0
    ORDER BY store_id
  LOOP
    PERFORM public._store_stock_delta(
      v_row.store_id, p_product_id, -v_row.quantity,
      'inventory_adjust'::public.stock_movement_reason,
      'telegram_product_reject', p_product_id, v_actor.o_staff_id,
      'Produit refusé par la direction (Telegram)'
    );
  END LOOP;

  UPDATE public.products SET rejected_at = now(), updated_at = now() WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'name', v_product.name);
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_pending_products_count(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_product_reject(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_pending_products_count(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_reject(text, text) TO service_role;

COMMIT;

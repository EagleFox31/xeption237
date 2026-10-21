-- ============================================================================
-- 20261021_008_telegram_product_direction_publish.sql
-- Validation, publication sur le site web et rejet de produits (Direction rank >= 2)
-- ============================================================================

-- 1. Compter les produits en attente de publication (rank >= 2)
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
  IF v_actor.o_rank < 2 THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.products
  WHERE is_published = false;

  RETURN v_count;
END;
$$;

-- 2. Publier un produit sur le site web (rank >= 2 uniquement)
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
  IF v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF v_product.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'product_not_found');
  END IF;

  v_final_price := CASE
    WHEN p_public_price IS NOT NULL AND p_public_price >= 500 THEN p_public_price
    ELSE v_product.price
  END;

  UPDATE public.products
  SET
    is_published = true,
    price = v_final_price,
    updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'name', v_product.name,
    'price', v_final_price
  );
END;
$$;

-- 3. Rejeter et supprimer un produit en attente (rank >= 2 uniquement)
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
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF v_product.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'product_not_found');
  END IF;

  IF v_product.is_published = true THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cannot_reject_published_product');
  END IF;

  -- Supprimer mouvements de stock et stock boutique associés
  DELETE FROM public.store_stock_movements WHERE product_id = p_product_id;
  DELETE FROM public.store_stock WHERE product_id = p_product_id;
  DELETE FROM public.products WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'name', v_product.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_staff_pending_products_count(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_publish(text, text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_reject(text, text) TO authenticated, service_role;

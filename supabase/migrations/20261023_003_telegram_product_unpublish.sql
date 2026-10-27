-- ============================================================================
-- 20261023_003_telegram_product_unpublish.sql
-- Dépublier / masquer un produit du site web (Direction rank >= 2 uniquement)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.telegram_staff_product_unpublish(
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

  UPDATE public.products
  SET
    is_published = false,
    updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'name', v_product.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_product_unpublish(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_unpublish(text, text) TO service_role;

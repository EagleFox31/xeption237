-- Migration 20260910_003: RPC get_order_troc_voucher et get_orders_troc_vouchers
-- Permet de récupérer de manière sécurisée et universelle les informations du bon Smart Troc lié à une commande (ref, appareil, IMEI, valeur)

CREATE OR REPLACE FUNCTION public.get_order_troc_voucher(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := upper(trim(coalesce(p_order_id, '')));
  o    public.orders%ROWTYPE;
  t    public.trade_in_requests%ROWTYPE;
BEGIN
  IF v_id = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO o FROM public.orders WHERE upper(id) = v_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Par completed_order_id
  SELECT * INTO t
  FROM public.trade_in_requests
  WHERE completed_order_id = o.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Fallback par téléphone si remise
  IF t.id IS NULL AND (coalesce(o.discount_amount, 0) > 0 OR (SELECT coalesce(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0) FROM jsonb_array_elements(o.items) item) > o.total) THEN
    SELECT * INTO t
    FROM public.trade_in_requests
    WHERE right(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), 8) = right(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g'), 8)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF t.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ref', coalesce(t.voucher_reference, t.id),
      'device_brand', t.device_brand,
      'device_model', t.device_model,
      'device_storage', t.device_storage,
      'imei', t.imei,
      'trade_in_value', coalesce(t.trade_in_value, o.discount_amount::integer)
    );
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_order_troc_voucher(text) IS
  'Renvoie les détails du bon Smart Troc (réf, appareil, IMEI, valeur) lié à une commande, par completed_order_id ou déduction par téléphone.';

REVOKE ALL ON FUNCTION public.get_order_troc_voucher(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_troc_voucher(text) TO anon, authenticated, service_role;

-- Batch function pour l'ERP
CREATE OR REPLACE FUNCTION public.get_orders_troc_vouchers(p_order_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res jsonb := '{}'::jsonb;
  oid text;
  v jsonb;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN res;
  END IF;

  FOREACH oid IN ARRAY p_order_ids LOOP
    v := public.get_order_troc_voucher(oid);
    IF v IS NOT NULL THEN
      res := jsonb_set(res, ARRAY[oid], v);
    END IF;
  END LOOP;

  RETURN res;
END;
$$;

COMMENT ON FUNCTION public.get_orders_troc_vouchers(text[]) IS
  'Renvoie en une seule requête un dictionnaire { [order_id]: troc_voucher } pour une liste de commandes.';

REVOKE ALL ON FUNCTION public.get_orders_troc_vouchers(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_troc_vouchers(text[]) TO anon, authenticated, service_role;

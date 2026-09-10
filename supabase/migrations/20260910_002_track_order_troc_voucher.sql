-- Migration 20260910_002: Renvoyer les informations du bon Smart Troc dans track_order (ref, appareil, IMEI)
CREATE OR REPLACE FUNCTION public.track_order(p_reference text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_tel text := right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 8);
  o     public.orders%ROWTYPE;
  t     public.trade_in_requests%ROWTYPE;
  v_troc jsonb := NULL;
BEGIN
  IF v_ref = '' OR length(v_tel) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO o
  FROM public.orders
  WHERE upper(id) = v_ref
    AND right(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), 8) = v_tel
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Recherche par completed_order_id
  SELECT * INTO t
  FROM public.trade_in_requests
  WHERE completed_order_id = o.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. Fallback pour commandes historiques avec remise et même téléphone
  IF t.id IS NULL AND (coalesce(o.discount_amount, 0) > 0 OR (SELECT coalesce(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0) FROM jsonb_array_elements(o.items) item) > o.total) THEN
    SELECT * INTO t
    FROM public.trade_in_requests
    WHERE right(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), 8) = v_tel
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF t.id IS NOT NULL THEN
    v_troc := jsonb_build_object(
      'ref', coalesce(t.voucher_reference, t.id),
      'device_brand', t.device_brand,
      'device_model', t.device_model,
      'device_storage', t.device_storage,
      'imei', t.imei,
      'trade_in_value', coalesce(t.trade_in_value, o.discount_amount::integer)
    );
  END IF;

  RETURN jsonb_build_object(
    'id', o.id,
    'items', o.items,
    'total', o.total,
    'discount_amount', coalesce(o.discount_amount, 0),
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'customer_city', o.customer_city,
    'delivery_mode', o.delivery_mode,
    'date', o.date,
    'troc_voucher', v_troc
  );
END;
$fn$;

COMMENT ON FUNCTION public.track_order(text, text) IS
  'Suivi public d''une commande : exige la reference ET le telephone. Renvoie les infos publiques de suivi, discount_amount et le bon Smart Troc lié.';

REVOKE ALL ON FUNCTION public.track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated, service_role;

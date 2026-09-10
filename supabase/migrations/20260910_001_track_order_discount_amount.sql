-- Migration 20260910_001: Ajout de discount_amount dans la RPC track_order pour le suivi public et la réimpression de facture
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
    'date', o.date
  );
END;
$fn$;

COMMENT ON FUNCTION public.track_order(text, text) IS
  'Suivi public d''une commande : exige la reference ET le telephone. Renvoie les infos publiques de suivi et discount_amount.';

REVOKE ALL ON FUNCTION public.track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated, service_role;

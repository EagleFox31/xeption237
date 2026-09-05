-- TTL réservations par statut commande + visibilité staff
-- pending : 48 h · confirmée / expédiée / prête : 7 jours (prolongation à la validation)

BEGIN;

CREATE OR REPLACE FUNCTION public._extend_order_stock_reservations(
  p_order_id text,
  p_expires_at timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.stock_reservations
  SET expires_at = p_expires_at
  WHERE order_id = p_order_id AND status = 'active';

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_order_stock_on_status(
  p_order_id text,
  p_new_status text,
  p_old_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extended integer;
BEGIN
  IF p_new_status = 'cancelled' AND p_old_status IS DISTINCT FROM 'cancelled' THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready')
     AND COALESCE(p_old_status, 'pending') = 'pending' THEN
    extended := public._extend_order_stock_reservations(
      p_order_id,
      now() + interval '7 days'
    );
    RETURN jsonb_build_object('success', true, 'extended', extended);
  END IF;

  RETURN jsonb_build_object('success', true, 'skipped', true);
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_order_atomic'
  LOOP
    EXECUTE format('DROP FUNCTION public.create_order_atomic(%s)', r.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_city text,
  p_delivery_mode text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb,
  p_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id text;
  qty integer;
  order_date timestamptz;
  store_id uuid;
  expires_at timestamptz;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());
  expires_at := order_date + interval '48 hours';

  store_id := public._pick_store_for_cart(p_items, p_customer_city);
  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuffisant pour cette commande');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    IF product_id IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Article de panier invalide');
    END IF;
    PERFORM public._store_reserve_line(store_id, product_id, qty, p_order_id, expires_at);
  END LOOP;

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id,
    payment_status
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, p_total, p_items, 'pending', order_date, store_id,
    'pending'
  );

  PERFORM public._insert_order_items(p_order_id, p_items);

  RETURN jsonb_build_object('success', true, 'store_id', store_id);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.release_order_stock_reservations(p_order_id);
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  text, text, text, text, text, text, text, numeric, jsonb, text
) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_stock_reservations_overview()
RETURNS TABLE (
  product_id text,
  product_name text,
  reserved_qty bigint,
  oldest_since timestamptz,
  order_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sr.product_id,
    p.name AS product_name,
    SUM(sr.qty)::bigint AS reserved_qty,
    MIN(sr.created_at) AS oldest_since,
    COUNT(DISTINCT sr.order_id)::bigint AS order_count
  FROM public.stock_reservations sr
  JOIN public.products p ON p.id = sr.product_id
  WHERE sr.status = 'active'
  GROUP BY sr.product_id, p.name
  HAVING SUM(sr.qty) > 0
  ORDER BY MIN(sr.created_at) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_reservations_overview()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_pending_orders_with_reservations()
RETURNS TABLE (
  order_id text,
  customer_name text,
  customer_phone text,
  order_total numeric,
  reserved_since timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    o.customer_name,
    o.customer_phone,
    o.total AS order_total,
    MIN(sr.created_at) AS reserved_since,
    MAX(sr.expires_at) AS expires_at
  FROM public.orders o
  JOIN public.stock_reservations sr
    ON sr.order_id = o.id AND sr.status = 'active'
  WHERE o.status = 'pending'
    AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
  GROUP BY o.id, o.customer_name, o.customer_phone, o.total
  ORDER BY MIN(sr.created_at) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_orders_with_reservations()
  TO authenticated, service_role;

COMMIT;

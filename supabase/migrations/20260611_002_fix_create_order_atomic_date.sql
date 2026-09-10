-- Fix: orders.date is timestamptz but create_order_atomic inserted p_date as text.
-- Recreate RPC with explicit cast and version the function in repo.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
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
  current_stock integer;
  order_date timestamptz;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := COALESCE((item->>'quantity')::integer, 1);

    IF product_id IS NULL OR qty IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Article de panier invalide'
      );
    END IF;

    SELECT stock
    INTO current_stock
    FROM products
    WHERE id = product_id
    FOR UPDATE;

    IF current_stock IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Produit introuvable: ' || product_id
      );
    END IF;

    IF current_stock < qty THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Stock insuffisant pour ' || COALESCE(item->>'name', product_id)
      );
    END IF;

    UPDATE products
    SET stock = stock - qty
    WHERE id = product_id;
  END LOOP;

  INSERT INTO orders (
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_city,
    delivery_mode,
    payment_method,
    total,
    items,
    status,
    date
  ) VALUES (
    p_order_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_city,
    p_delivery_mode,
    p_payment_method,
    p_total,
    p_items,
    'pending',
    order_date
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic(
  text, text, text, text, text, text, text, numeric, jsonb, text
) TO anon, authenticated, service_role;

-- Étape 5 ERP : remise POS, ventes par vendeur (UC-V-02)
-- Spec : ROADMAP_ERP.md §5

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_discount_amount_nonneg;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_discount_amount_nonneg
  CHECK (discount_amount >= 0);

-- ---------------------------------------------------------------------------
-- complete_pos_sale_atomic — remise + total validé
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_pos_sale_atomic'
  LOOP
    EXECUTE format('DROP FUNCTION public.complete_pos_sale_atomic(%s)', r.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.complete_pos_sale_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_city text,
  p_delivery_mode text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb,
  p_date text,
  p_status text DEFAULT 'delivered',
  p_store_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0
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
  order_status text;
  store_id uuid;
  staff_id uuid;
  subtotal numeric := 0;
  discount numeric := GREATEST(COALESCE(p_discount_amount, 0), 0);
  expected_total numeric;
  line_price numeric;
  line_qty integer;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());
  order_status := COALESCE(NULLIF(trim(p_status), ''), 'delivered');

  SELECT s.staff_id, COALESCE(p_store_id, s.store_id, public._default_store_id())
  INTO staff_id, store_id
  FROM public._staff_from_jwt() s;

  store_id := COALESCE(p_store_id, store_id, public._default_store_id());
  staff_id := COALESCE(p_staff_id, staff_id);

  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique assignée au vendeur');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    line_price := COALESCE((item->>'price')::numeric, 0);
    line_qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    subtotal := subtotal + (line_price * line_qty);
  END LOOP;

  IF discount > subtotal THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remise supérieure au sous-total');
  END IF;

  expected_total := subtotal - discount;
  IF ABS(COALESCE(p_total, 0) - expected_total) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Total incohérent avec la remise (attendu ' || expected_total::text || ')'
    );
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    IF product_id IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Article de panier invalide');
    END IF;
    PERFORM public._store_sale_line(store_id, product_id, qty, p_order_id, staff_id, 'sale');
  END LOOP;

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id, staff_id,
    discount_amount
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, expected_total, p_items, order_status, order_date,
    store_id, staff_id, discount
  );

  PERFORM public._insert_order_items(p_order_id, p_items);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'store_id', store_id,
    'subtotal', subtotal,
    'discount_amount', discount,
    'total', expected_total
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pos_sale_atomic(
  text, text, text, text, text, text, text, numeric, jsonb, text, text, uuid, uuid, numeric
) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_staff_sales_summary(
  p_staff_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sale_count', COUNT(*)::integer,
    'total_amount', COALESCE(SUM(o.total), 0),
    'discount_total', COALESCE(SUM(o.discount_amount), 0),
    'subtotal_amount', COALESCE(SUM(o.total + o.discount_amount), 0)
  )
  FROM public.orders o
  WHERE o.staff_id = p_staff_id
    AND o.status NOT IN ('cancelled', 'returned')
    AND o.date >= COALESCE(p_from, date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala')
    AND o.date < COALESCE(
      p_to,
      date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' + interval '1 day'
    );
$$;

CREATE OR REPLACE FUNCTION public.list_staff_sales(
  p_staff_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE (
  order_id text,
  customer_name text,
  customer_phone text,
  payment_method text,
  total numeric,
  discount_amount numeric,
  status text,
  sale_date timestamptz,
  store_id uuid,
  items jsonb,
  item_count bigint
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
    o.payment_method,
    o.total,
    o.discount_amount,
    o.status,
    o.date AS sale_date,
    o.store_id,
    o.items,
    COALESCE(
      (SELECT SUM(GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1))::bigint
       FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) AS elem),
      0
    ) AS item_count
  FROM public.orders o
  WHERE o.staff_id = p_staff_id
    AND o.status NOT IN ('cancelled', 'returned')
    AND o.date >= COALESCE(p_from, date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala')
    AND o.date < COALESCE(
      p_to,
      date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' + interval '1 day'
    )
  ORDER BY o.date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_sales_summary(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.list_staff_sales(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

COMMIT;

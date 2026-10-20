-- Extrait le cœur de complete_pos_sale_atomic dans _pos_sale_core, pour que le bot Telegram
-- (service_role, auth.jwt() NULL) réutilise la même vente atomique sans la dupliquer.
--
-- Corps repris de la prod (pg_get_functiondef), pas des migrations 20260823_* : seule la
-- résolution de l'appelant (contrôle JWT, boutique, vendeur) reste dans le wrapper ERP.
-- Signature, DEFAULT, messages d'erreur et ACL de complete_pos_sale_atomic inchangés.
-- Additif et rejouable.

BEGIN;

-- Boutique et vendeur déjà résolus par l'appelant. Jamais exposé (aucun GRANT).
CREATE OR REPLACE FUNCTION public._pos_sale_core(
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
  p_status text,
  p_store_id uuid,
  p_staff_id uuid,
  p_discount_amount numeric
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
  store_id uuid := p_store_id;
  staff_id uuid := p_staff_id;
  subtotal numeric := 0;
  discount numeric := GREATEST(COALESCE(p_discount_amount, 0), 0);
  expected_total numeric;
  line_price numeric;
  line_qty integer;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());
  order_status := COALESCE(NULLIF(trim(p_status), ''), 'delivered');

  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique assignée au vendeur');
  END IF;

  IF staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendeur non identifié');
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
  store_id uuid;
  staff_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  SELECT s.staff_id, COALESCE(p_store_id, s.store_id, public._default_store_id())
  INTO staff_id, store_id
  FROM public._staff_from_jwt() s;

  store_id := COALESCE(p_store_id, store_id, public._default_store_id());
  staff_id := COALESCE(p_staff_id, staff_id);

  RETURN public._pos_sale_core(
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, p_total, p_items, p_date, p_status,
    store_id, staff_id, p_discount_amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public._pos_sale_core(text, text, text, text, text, text, text, numeric, jsonb, text, text, uuid, uuid, numeric)
  FROM PUBLIC, anon, authenticated;

-- CREATE OR REPLACE conserve l'ACL ; rejoué pour rester explicite.
GRANT EXECUTE ON FUNCTION public.complete_pos_sale_atomic(text, text, text, text, text, text, text, numeric, jsonb, text, text, uuid, uuid, numeric)
  TO authenticated, service_role;

COMMIT;

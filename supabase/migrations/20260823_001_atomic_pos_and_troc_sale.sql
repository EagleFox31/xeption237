-- Vente POS et clôture troc couplée : décrément stock + commande (+ dossier troc) en une transaction.
-- Calqué sur create_order_atomic (SELECT … FOR UPDATE, refus si stock insuffisant).

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_pos_sale_atomic'
  LOOP
    EXECUTE format('DROP FUNCTION public.complete_pos_sale_atomic(%s)', r.args);
  END LOOP;

  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_troc_with_sale_atomic'
  LOOP
    EXECUTE format('DROP FUNCTION public.complete_troc_with_sale_atomic(%s)', r.args);
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
  p_status text DEFAULT 'delivered'
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
  order_status text;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());
  order_status := COALESCE(NULLIF(trim(p_status), ''), 'delivered');

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
    order_status,
    order_date
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_troc_with_sale_atomic(
  p_trade_in_request_id text,
  p_order_id text,
  p_payment_method text,
  p_date text DEFAULT NULL,
  p_redemption_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dossier record;
  target record;
  credit numeric;
  reste numeric;
  order_date timestamptz;
  order_item jsonb;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());

  SELECT
    id,
    status,
    target_product_id,
    target_product_name,
    trade_in_value,
    customer_name,
    customer_email,
    customer_phone,
    completed_order_id
  INTO dossier
  FROM trade_in_requests
  WHERE id = p_trade_in_request_id
  FOR UPDATE;

  IF dossier.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier troc introuvable.');
  END IF;

  IF dossier.completed_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Dossier déjà clôturé.',
      'order_id', dossier.completed_order_id
    );
  END IF;

  IF dossier.status IS DISTINCT FROM 'validated' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le dossier doit être en statut validated pour finaliser la vente.'
    );
  END IF;

  IF dossier.target_product_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Aucun appareil cible sur ce dossier.'
    );
  END IF;

  SELECT id, name, price, stock, image
  INTO target
  FROM products
  WHERE id = dossier.target_product_id
  FOR UPDATE;

  IF target.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appareil cible introuvable au catalogue.');
  END IF;

  IF COALESCE(target.stock, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Appareil cible en rupture de stock — impossible de finaliser la vente.'
    );
  END IF;

  credit := COALESCE(dossier.trade_in_value, 0);
  reste := GREATEST(0, ROUND(COALESCE(target.price, 0) - credit));

  order_item := jsonb_build_array(
    jsonb_build_object(
      'id', target.id,
      'name', target.name,
      'price', target.price,
      'quantity', 1,
      'image', target.image
    )
  );

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
    dossier.customer_name,
    dossier.customer_email,
    dossier.customer_phone,
    'Retrait Boutique (Troc)',
    'pickup',
    p_payment_method,
    reste,
    order_item,
    'delivered',
    order_date
  );

  UPDATE products
  SET stock = stock - 1
  WHERE id = target.id;

  UPDATE trade_in_requests
  SET
    status = 'completed',
    completed_at = order_date,
    completed_order_id = p_order_id,
    credit_applied = credit,
    redemption_reason = NULLIF(trim(p_redemption_reason), '')
  WHERE id = dossier.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'target_name', COALESCE(target.name, dossier.target_product_name, ''),
    'target_price', COALESCE(target.price, 0),
    'credit', credit,
    'reste', reste
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pos_sale_atomic(
  text, text, text, text, text, text, text, numeric, jsonb, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.complete_troc_with_sale_atomic(
  text, text, text, text, text
) TO anon, authenticated, service_role;

COMMIT;

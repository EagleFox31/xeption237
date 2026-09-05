-- ERP étape 4 : bascule vérité stock multi-boutiques
-- store_stock devient source ; products.stock = miroir (trigger).
-- Spec : docs/next-step/ROADMAP_ERP.md § étape 4

BEGIN;

-- ---------------------------------------------------------------------------
-- stock_reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id     uuid NOT NULL REFERENCES public.stores(id),
  product_id   text NOT NULL REFERENCES public.products(id),
  qty          integer NOT NULL CHECK (qty > 0),
  expires_at   timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_reservations_order_idx
  ON public.stock_reservations (order_id);
CREATE INDEX IF NOT EXISTS stock_reservations_expires_idx
  ON public.stock_reservations (expires_at)
  WHERE status = 'active';

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_reservations_staff_all ON public.stock_reservations;
CREATE POLICY stock_reservations_staff_all ON public.stock_reservations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- Helpers internes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._staff_from_jwt()
RETURNS TABLE (staff_id uuid, store_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.store_id
  FROM public.staff s
  WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._default_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.stores WHERE is_default = true AND active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._pick_store_for_cart(
  p_items jsonb,
  p_customer_city text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen uuid;
  city_norm text := lower(trim(COALESCE(p_customer_city, '')));
BEGIN
  SELECT s.id INTO chosen
  FROM public.stores s
  WHERE s.active = true
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) item
      WHERE COALESCE((
        SELECT ss.quantity - ss.reserved
        FROM public.store_stock ss
        WHERE ss.store_id = s.id
          AND ss.product_id = NULLIF(trim(item->>'id'), '')
      ), 0) < GREATEST(COALESCE((item->>'quantity')::integer, 1), 1)
    )
  ORDER BY
    CASE
      WHEN city_norm <> ''
       AND lower(trim(COALESCE(s.city, ''))) = city_norm THEN 0
      WHEN city_norm LIKE '%retrait%' AND s.is_default THEN 0
      ELSE 1
    END,
    (
      SELECT COALESCE(SUM(ss.quantity - ss.reserved), 0)
      FROM public.store_stock ss
      WHERE ss.store_id = s.id
    ) DESC
  LIMIT 1;

  RETURN chosen;
END;
$$;

CREATE OR REPLACE FUNCTION public._insert_order_items(p_order_id text, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  idx integer := 0;
BEGIN
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.order_items (
      order_id, line_index, product_id, product_name, unit_price, quantity, line_total
    ) VALUES (
      p_order_id,
      idx,
      NULLIF(trim(item->>'id'), ''),
      COALESCE(NULLIF(trim(item->>'name'), ''), NULLIF(trim(item->>'id'), ''), 'Article'),
      GREATEST(COALESCE((item->>'price')::numeric, 0), 0),
      GREATEST(COALESCE((item->>'quantity')::integer, 1), 1),
      GREATEST(COALESCE((item->>'price')::numeric, 0), 0)
        * GREATEST(COALESCE((item->>'quantity')::integer, 1), 1)
    );
    idx := idx + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._store_reserve_line(
  p_store_id uuid,
  p_product_id text,
  p_qty integer,
  p_order_id text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.store_stock
  SET reserved = reserved + p_qty,
      updated_at = now()
  WHERE store_id = p_store_id
    AND product_id = p_product_id
    AND quantity - reserved >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuffisant (réservation) pour %', p_product_id;
  END IF;

  INSERT INTO public.stock_reservations (
    order_id, store_id, product_id, qty, expires_at, status
  ) VALUES (
    p_order_id, p_store_id, p_product_id, p_qty, p_expires_at, 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._store_sale_line(
  p_store_id uuid,
  p_product_id text,
  p_qty integer,
  p_order_id text,
  p_staff_id uuid,
  p_reason public.stock_movement_reason DEFAULT 'sale'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.store_stock
  SET quantity = quantity - p_qty,
      updated_at = now()
  WHERE store_id = p_store_id
    AND product_id = p_product_id
    AND quantity - reserved >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuffisant pour %', p_product_id;
  END IF;

  INSERT INTO public.stock_movements (
    store_id, product_id, delta, reason, ref_type, ref_id, staff_id
  ) VALUES (
    p_store_id, p_product_id, -p_qty, p_reason, 'order', p_order_id, p_staff_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger miroir products.stock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_sync_product_stock_from_stores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid text := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products p
  SET stock = COALESCE((
    SELECT SUM(GREATEST(ss.quantity - ss.reserved, 0))::integer
    FROM public.store_stock ss
    WHERE ss.product_id = pid
  ), 0)
  WHERE p.id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock_from_stores ON public.store_stock;
CREATE TRIGGER trg_sync_product_stock_from_stores
  AFTER INSERT OR UPDATE OR DELETE ON public.store_stock
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_product_stock_from_stores();

-- Sync initial depuis store_stock existant
UPDATE public.products p
SET stock = COALESCE((
  SELECT SUM(GREATEST(ss.quantity - ss.reserved, 0))::integer
  FROM public.store_stock ss
  WHERE ss.product_id = p.id
), 0);

-- ---------------------------------------------------------------------------
-- Inventaire : stock catalogue → boutique default (ou cible staff)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_product_catalog_stock(
  p_product_id text,
  p_quantity integer,
  p_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_store uuid;
  qty integer := GREATEST(COALESCE(p_quantity, 0), 0);
BEGIN
  IF auth.jwt() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  target_store := COALESCE(
    p_store_id,
    (SELECT store_id FROM public._staff_from_jwt() LIMIT 1),
    public._default_store_id()
  );

  IF target_store IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique active');
  END IF;

  DELETE FROM public.store_stock WHERE product_id = p_product_id;

  IF qty > 0 THEN
    INSERT INTO public.store_stock (store_id, product_id, quantity, reserved)
    VALUES (target_store, p_product_id, qty, 0);
  END IF;

  RETURN jsonb_build_object('success', true, 'store_id', target_store, 'quantity', qty);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_product_catalog_stock(text, integer, uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Réservations commande web
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_order_stock_reservations(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, store_id, product_id, qty
    FROM public.stock_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE public.store_stock
    SET reserved = GREATEST(reserved - r.qty, 0),
        updated_at = now()
    WHERE store_id = r.store_id AND product_id = r.product_id;

    UPDATE public.stock_reservations
    SET status = 'released'
    WHERE id = r.id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_order_stock_reservations(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, store_id, product_id, qty
    FROM public.stock_reservations
    WHERE order_id = p_order_id AND status = 'active'
    FOR UPDATE
  LOOP
    UPDATE public.store_stock
    SET quantity = quantity - r.qty,
        reserved = GREATEST(reserved - r.qty, 0),
        updated_at = now()
    WHERE store_id = r.store_id
      AND product_id = r.product_id
      AND quantity >= r.qty;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Stock insuffisant à la consommation');
    END IF;

    UPDATE public.stock_reservations SET status = 'consumed' WHERE id = r.id;

    INSERT INTO public.stock_movements (
      store_id, product_id, delta, reason, ref_type, ref_id
    ) VALUES (
      r.store_id, r.product_id, -r.qty, 'online_sale', 'order', p_order_id
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_order_stock_reservations(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_order_stock_reservations(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_stock_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id, store_id, product_id, qty
    FROM public.stock_reservations
    WHERE status = 'active' AND expires_at <= now()
    FOR UPDATE
  LOOP
    UPDATE public.store_stock
    SET reserved = GREATEST(reserved - r.qty, 0),
        updated_at = now()
    WHERE store_id = r.store_id AND product_id = r.product_id;

    UPDATE public.stock_reservations
    SET status = 'expired'
    WHERE id = r.id;

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_order_atomic — réservation + store_id
-- ---------------------------------------------------------------------------
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
  expires_at := order_date + interval '30 minutes';

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
    delivery_mode, payment_method, total, items, status, date, store_id
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, p_total, p_items, 'pending', order_date, store_id
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

-- ---------------------------------------------------------------------------
-- complete_pos_sale_atomic — store_stock + staff_id
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
  p_staff_id uuid DEFAULT NULL
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
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    IF product_id IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Article de panier invalide');
    END IF;
    PERFORM public._store_sale_line(store_id, product_id, qty, p_order_id, staff_id, 'sale');
  END LOOP;

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id, staff_id
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, p_total, p_items, order_status, order_date,
    store_id, staff_id
  );

  PERFORM public._insert_order_items(p_order_id, p_items);

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'store_id', store_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pos_sale_atomic(
  text, text, text, text, text, text, text, numeric, jsonb, text, text, uuid, uuid
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- complete_troc_with_sale_atomic
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_troc_with_sale_atomic'
  LOOP
    EXECUTE format('DROP FUNCTION public.complete_troc_with_sale_atomic(%s)', r.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.complete_troc_with_sale_atomic(
  p_trade_in_request_id text,
  p_order_id text,
  p_payment_method text,
  p_date text DEFAULT NULL,
  p_redemption_reason text DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
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
  store_id uuid;
  staff_id uuid;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());

  SELECT s.staff_id, COALESCE(p_store_id, s.store_id, public._default_store_id())
  INTO staff_id, store_id
  FROM public._staff_from_jwt() s;

  store_id := COALESCE(p_store_id, store_id, public._default_store_id());
  staff_id := COALESCE(p_staff_id, staff_id);

  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique assignée');
  END IF;

  SELECT id, status, target_product_id, target_product_name, trade_in_value,
         customer_name, customer_email, customer_phone, completed_order_id
  INTO dossier
  FROM trade_in_requests
  WHERE id = p_trade_in_request_id
  FOR UPDATE;

  IF dossier.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier troc introuvable.');
  END IF;
  IF dossier.completed_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier déjà clôturé.', 'order_id', dossier.completed_order_id);
  END IF;
  IF dossier.status IS DISTINCT FROM 'validated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le dossier doit être en statut validated pour finaliser la vente.');
  END IF;
  IF dossier.target_product_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun appareil cible sur ce dossier.');
  END IF;

  SELECT id, name, price, stock, image INTO target
  FROM products WHERE id = dossier.target_product_id FOR UPDATE;

  IF target.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appareil cible introuvable au catalogue.');
  END IF;

  credit := COALESCE(dossier.trade_in_value, 0);
  reste := GREATEST(0, ROUND(COALESCE(target.price, 0) - credit));

  order_item := jsonb_build_array(jsonb_build_object(
    'id', target.id, 'name', target.name, 'price', target.price, 'quantity', 1, 'image', target.image
  ));

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id, staff_id
  ) VALUES (
    p_order_id, dossier.customer_name, dossier.customer_email, dossier.customer_phone,
    'Retrait Boutique (Troc)', 'pickup', p_payment_method, reste, order_item,
    'delivered', order_date, store_id, staff_id
  );

  PERFORM public._store_sale_line(store_id, target.id, 1, p_order_id, staff_id, 'sale');
  PERFORM public._insert_order_items(p_order_id, order_item);

  UPDATE trade_in_requests SET
    status = 'completed',
    completed_at = order_date,
    completed_order_id = p_order_id,
    credit_applied = credit,
    redemption_reason = NULLIF(trim(p_redemption_reason), '')
  WHERE id = dossier.id;

  RETURN jsonb_build_object(
    'success', true, 'order_id', p_order_id,
    'target_name', COALESCE(target.name, dossier.target_product_name, ''),
    'target_price', COALESCE(target.price, 0),
    'credit', credit, 'reste', reste
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_troc_with_sale_atomic(
  text, text, text, text, text, uuid, uuid
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Transition statut commande (consommation / libération stock)
-- ---------------------------------------------------------------------------
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
BEGIN
  IF p_new_status = 'cancelled' AND p_old_status IS DISTINCT FROM 'cancelled' THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready', 'delivered')
     AND COALESCE(p_old_status, 'pending') = 'pending' THEN
    RETURN public.consume_order_stock_reservations(p_order_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'skipped', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_order_stock_on_status(text, text, text)
  TO authenticated, service_role;

-- Cron expiration réservations (lundi 3h job existe déjà — ajout horaire)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'expire-stock-reservations-hourly';

    PERFORM cron.schedule(
      'expire-stock-reservations-hourly',
      '15 * * * *',
      $cron$SELECT public.expire_stock_reservations();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMIT;

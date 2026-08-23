-- Commandes web : paiement Campay à la livraison + consommation stock au règlement
-- 1. orders.payment_status + order_payments
-- 2. confirm_order_payment_and_consume_stock (webhook / espèces)
-- 3. expire_stock_reservations ignore les commandes payées
-- 4. Réservations web : TTL 7 jours (plus 30 min)

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_status_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.order_payments (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id         text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reference        text NOT NULL UNIQUE,
  amount           integer NOT NULL CHECK (amount > 0),
  currency         text NOT NULL DEFAULT 'XAF',
  channel          text CHECK (channel IN ('om', 'momo', 'card', 'cash')),
  phone            text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  campay_reference text,
  staff_id         uuid REFERENCES public.staff(id),
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON public.order_payments (order_id);
CREATE INDEX IF NOT EXISTS order_payments_status_idx ON public.order_payments (status);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_payments_staff_all ON public.order_payments;
CREATE POLICY order_payments_staff_all ON public.order_payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ));

-- Consommation idempotente au règlement
CREATE OR REPLACE FUNCTION public.confirm_order_payment_and_consume_stock(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consume_result jsonb;
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande invalide');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      paid_at = COALESCE(paid_at, now())
  WHERE id = p_order_id
    AND payment_status IS DISTINCT FROM 'paid';

  consume_result := public.consume_order_stock_reservations(p_order_id);

  IF COALESCE((consume_result->>'success')::boolean, false) THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'consumed', true);
  END IF;

  IF consume_result->>'error' IS NOT NULL THEN
    RETURN consume_result;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'consumed', false, 'skipped', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment_and_consume_stock(text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_order_cash_paid(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND payment_status = 'paid'
  ) THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true);
  END IF;

  INSERT INTO public.order_payments (
    order_id, reference, amount, currency, channel, status, paid_at, staff_id
  )
  SELECT
    o.id,
    'CASH-' || o.id || '-' || floor(extract(epoch FROM now()))::bigint,
    GREATEST(o.total::integer, 0),
    'XAF',
    'cash',
    'paid',
    now(),
    (SELECT s.id FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email') LIMIT 1)
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.payment_method = 'CASH';

  RETURN public.confirm_order_payment_and_consume_stock(p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_cash_paid(text)
  TO authenticated, service_role;

-- Expiration : ne jamais libérer le stock d'une commande déjà payée
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
    SELECT sr.id, sr.store_id, sr.product_id, sr.qty
    FROM public.stock_reservations sr
    JOIN public.orders o ON o.id = sr.order_id
    WHERE sr.status = 'active'
      AND sr.expires_at <= now()
      AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
    FOR UPDATE OF sr
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

-- Statut commande : libération seule (consommation = paiement confirmé)
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

  RETURN jsonb_build_object('success', true, 'skipped', true);
END;
$$;

-- Checkout web : réservation 7 jours + payment_status pending
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
  expires_at := order_date + interval '7 days';

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

COMMIT;

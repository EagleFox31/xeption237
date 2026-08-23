-- Cycle physique réservations : TTL pending seulement, refused/returned, perte 30j
-- Spec : docs/next-step/MODELE_STOCK_MULTI_BOUTIQUES.md §5, §7

BEGIN;

-- expires_at NULL = pas de minuteur (confirmed+)
ALTER TABLE public.stock_reservations
  ALTER COLUMN expires_at DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'stock_movement_reason' AND e.enumlabel = 'loss'
  ) THEN
    ALTER TYPE public.stock_movement_reason ADD VALUE 'loss';
  END IF;
END $$;

-- Statuts commande : refused, returned
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'confirmed', 'shipped', 'ready', 'delivered',
    'cancelled', 'refused', 'returned'
  ));

CREATE OR REPLACE FUNCTION public._extend_order_stock_reservations(
  p_order_id text,
  p_expires_at timestamptz DEFAULT NULL
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
  old_st text := COALESCE(p_old_status, 'pending');
BEGIN
  IF p_new_status = old_st THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;

  IF p_new_status = 'cancelled' AND old_st IN ('shipped', 'refused', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Impossible d''annuler : le colis est déjà parti. Passe par « Refus livraison » puis « Retour reçu ».'
    );
  END IF;

  IF p_new_status = 'cancelled' AND old_st NOT IN ('shipped', 'refused', 'delivered', 'cancelled') THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready') AND old_st = 'pending' THEN
    PERFORM public._extend_order_stock_reservations(p_order_id, NULL);
    RETURN jsonb_build_object('success', true, 'extended', true, 'expires_at', NULL);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready', 'refused') THEN
    PERFORM public._extend_order_stock_reservations(p_order_id, NULL);
  END IF;

  IF p_new_status = 'returned' THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'skipped', true);
END;
$$;

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
      AND sr.expires_at IS NOT NULL
      AND sr.expires_at <= now()
      AND o.status = 'pending'
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

CREATE OR REPLACE FUNCTION public.process_shipped_reservation_losses()
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
    SELECT sr.id, sr.store_id, sr.product_id, sr.qty, sr.order_id
    FROM public.stock_reservations sr
    JOIN public.orders o ON o.id = sr.order_id
    WHERE sr.status = 'active'
      AND o.status IN ('shipped', 'refused')
      AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
      AND sr.created_at <= now() - interval '30 days'
    FOR UPDATE OF sr
  LOOP
    UPDATE public.store_stock
    SET quantity = GREATEST(quantity - r.qty, 0),
        reserved = GREATEST(reserved - r.qty, 0),
        updated_at = now()
    WHERE store_id = r.store_id
      AND product_id = r.product_id
      AND quantity >= r.qty;

    IF NOT FOUND THEN
      UPDATE public.store_stock
      SET reserved = GREATEST(reserved - r.qty, 0),
          updated_at = now()
      WHERE store_id = r.store_id AND product_id = r.product_id;
    END IF;

    UPDATE public.stock_reservations
    SET status = 'expired'
    WHERE id = r.id;

    INSERT INTO public.stock_movements (
      store_id, product_id, delta, reason, ref_type, ref_id, note
    ) VALUES (
      r.store_id, r.product_id, -r.qty, 'loss'::public.stock_movement_reason,
      'order', r.order_id, 'Perte auto — colis sans retour 30 j'
    );

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_shipped_reservation_losses()
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_shipment_reservation_alerts()
RETURNS TABLE (
  order_id text,
  order_status text,
  customer_name text,
  customer_phone text,
  reserved_since timestamptz,
  days_out integer,
  alert_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    o.status AS order_status,
    o.customer_name,
    o.customer_phone,
    MIN(sr.created_at) AS reserved_since,
    GREATEST(0, EXTRACT(day FROM now() - MIN(sr.created_at))::integer) AS days_out,
    CASE
      WHEN MIN(sr.created_at) <= now() - interval '30 days' THEN 'loss_pending'
      WHEN MIN(sr.created_at) <= now() - interval '5 days' THEN 'warning'
      ELSE 'ok'
    END AS alert_level
  FROM public.orders o
  JOIN public.stock_reservations sr
    ON sr.order_id = o.id AND sr.status = 'active'
  WHERE o.status IN ('shipped', 'refused')
    AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
  GROUP BY o.id, o.status, o.customer_name, o.customer_phone
  HAVING MIN(sr.created_at) <= now() - interval '5 days'
  ORDER BY MIN(sr.created_at) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_shipment_reservation_alerts()
  TO authenticated, service_role;

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'process-shipped-reservation-losses-daily';

    PERFORM cron.schedule(
      'process-shipped-reservation-losses-daily',
      '30 3 * * *',
      $cron$SELECT public.process_shipped_reservation_losses();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron loss schedule skipped: %', SQLERRM;
END $$;

COMMIT;

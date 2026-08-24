-- Étape 8 ERP : mouvements de stock avancés
-- Transferts deux temps, inventaire physique, retours SAV, traçabilité annulation
-- Spec : ROADMAP_ERP.md §8 · MODELE_STOCK_MULTI_BOUTIQUES.md §5-6

BEGIN;

-- ── Colonnes traçabilité annulation ──────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.staff(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- ── Vue CA : exclure aussi les remboursements ────────────────────────────────

CREATE OR REPLACE VIEW public.orders_reportable
WITH (security_invoker = true) AS
SELECT o.*
FROM public.orders o
WHERE o.status NOT IN ('cancelled', 'returned')
  AND COALESCE(o.payment_status, 'pending') NOT IN ('refunded', 'failed')
  AND (o.payment_status = 'paid' OR o.status = 'delivered')
  AND o.id NOT LIKE 'TEST-%';

COMMENT ON VIEW public.orders_reportable IS
  'CA encaissé et objectifs : payées/livrées, hors annulées, retournées, remboursées et TEST-.';

-- ── Tables ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'stock_transfer_status'
  ) THEN
    CREATE TYPE public.stock_transfer_status AS ENUM ('draft', 'sent', 'received', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'inventory_session_status'
  ) THEN
    CREATE TYPE public.inventory_session_status AS ENUM ('open', 'completed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_store_id uuid NOT NULL REFERENCES public.stores(id),
  to_store_id uuid NOT NULL REFERENCES public.stores(id),
  status public.stock_transfer_status NOT NULL DEFAULT 'draft',
  note text,
  created_by uuid REFERENCES public.staff(id),
  sent_by uuid REFERENCES public.staff(id),
  sent_at timestamptz,
  received_by uuid REFERENCES public.staff(id),
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfers_distinct_stores CHECK (from_store_id <> to_store_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  UNIQUE (transfer_id, product_id)
);

CREATE INDEX IF NOT EXISTS stock_transfers_status_idx ON public.stock_transfers (status, sent_at DESC);
CREATE INDEX IF NOT EXISTS stock_transfer_items_transfer_idx ON public.stock_transfer_items (transfer_id);

CREATE TABLE IF NOT EXISTS public.stock_inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  status public.inventory_session_status NOT NULL DEFAULT 'open',
  note text,
  created_by uuid REFERENCES public.staff(id),
  completed_by uuid REFERENCES public.staff(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_inventory_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.stock_inventory_sessions(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  expected_qty integer NOT NULL CHECK (expected_qty >= 0),
  counted_qty integer CHECK (counted_qty IS NULL OR counted_qty >= 0),
  UNIQUE (session_id, product_id)
);

CREATE INDEX IF NOT EXISTS stock_inventory_sessions_store_idx
  ON public.stock_inventory_sessions (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  product_id text NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  disposition text NOT NULL CHECK (disposition IN ('restock', 'sav')),
  refund_amount numeric(12,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  staff_id uuid REFERENCES public.staff(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_returns_order_idx ON public.customer_returns (order_id);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inventory_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_transfers_staff_read ON public.stock_transfers;
CREATE POLICY stock_transfers_staff_read ON public.stock_transfers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS stock_transfer_items_staff_read ON public.stock_transfer_items;
CREATE POLICY stock_transfer_items_staff_read ON public.stock_transfer_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS stock_inventory_sessions_staff_read ON public.stock_inventory_sessions;
CREATE POLICY stock_inventory_sessions_staff_read ON public.stock_inventory_sessions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS stock_inventory_lines_staff_read ON public.stock_inventory_lines;
CREATE POLICY stock_inventory_lines_staff_read ON public.stock_inventory_lines
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS customer_returns_staff_read ON public.customer_returns;
CREATE POLICY customer_returns_staff_read ON public.customer_returns
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

-- ── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._current_staff_ctx()
RETURNS TABLE (staff_id uuid, store_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.store_id, s.role
  FROM public.staff s
  WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._assert_staff()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT c.staff_id INTO v_id FROM public._current_staff_ctx() c;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._assert_responsable()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx record;
BEGIN
  SELECT * INTO v_ctx FROM public._current_staff_ctx();
  IF v_ctx.staff_id IS NULL THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;
  IF v_ctx.role NOT IN ('responsable', 'direction', 'super_admin') THEN
    RAISE EXCEPTION 'Accès réservé au responsable boutique ou à la direction';
  END IF;
  RETURN v_ctx.staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._can_access_store(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx record;
BEGIN
  SELECT * INTO v_ctx FROM public._current_staff_ctx();
  IF v_ctx.staff_id IS NULL THEN RETURN false; END IF;
  IF v_ctx.role IN ('direction', 'super_admin') THEN RETURN true; END IF;
  RETURN v_ctx.store_id IS NOT DISTINCT FROM p_store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._store_stock_delta(
  p_store_id uuid,
  p_product_id text,
  p_delta integer,
  p_reason public.stock_movement_reason,
  p_ref_type text,
  p_ref_id text,
  p_staff_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_delta = 0 THEN RETURN; END IF;

  IF p_delta < 0 THEN
    UPDATE public.store_stock
    SET quantity = quantity + p_delta,
        updated_at = now()
    WHERE store_id = p_store_id
      AND product_id = p_product_id
      AND quantity - reserved >= ABS(p_delta);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuffisant pour %', p_product_id;
    END IF;
  ELSE
    INSERT INTO public.store_stock (store_id, product_id, quantity, reserved)
    VALUES (p_store_id, p_product_id, p_delta, 0)
    ON CONFLICT (store_id, product_id) DO UPDATE
      SET quantity = public.store_stock.quantity + EXCLUDED.quantity,
          updated_at = now();
  END IF;

  INSERT INTO public.stock_movements (
    store_id, product_id, delta, reason, ref_type, ref_id, staff_id, note
  ) VALUES (
    p_store_id, p_product_id, p_delta, p_reason, p_ref_type, p_ref_id, p_staff_id, p_note
  );
END;
$$;

REVOKE ALL ON FUNCTION public._current_staff_ctx() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._assert_staff() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._assert_responsable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._can_access_store(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._store_stock_delta(uuid, text, integer, public.stock_movement_reason, text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- ── Annulation tracée ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_order_with_stock(
  p_order_id text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_old text;
  v_sync jsonb;
BEGIN
  v_staff := public._assert_responsable();

  SELECT o.status INTO v_old FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF v_old = 'cancelled' THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;

  v_sync := public.sync_order_stock_on_status(p_order_id, 'cancelled', v_old);
  IF COALESCE((v_sync->>'success')::boolean, false) = false THEN
    RETURN v_sync;
  END IF;

  UPDATE public.orders
  SET
    status = 'cancelled',
    cancellation_reason = NULLIF(trim(p_reason), ''),
    cancelled_by = v_staff,
    cancelled_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- ── Transferts inter-boutiques ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_items jsonb,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_id uuid;
  v_item jsonb;
  v_pid text;
  v_qty integer;
BEGIN
  v_staff := public._assert_responsable();

  IF NOT public._can_access_store(p_from_store_id) THEN
    RAISE EXCEPTION 'Boutique source hors périmètre';
  END IF;

  IF p_from_store_id = p_to_store_id THEN
    RAISE EXCEPTION 'Les boutiques source et destination doivent être différentes';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Ajoute au moins un produit au transfert';
  END IF;

  INSERT INTO public.stock_transfers (from_store_id, to_store_id, note, created_by)
  VALUES (p_from_store_id, p_to_store_id, NULLIF(trim(p_note), ''), v_staff)
  RETURNING id INTO v_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := v_item->>'product_id';
    v_qty := GREATEST(COALESCE((v_item->>'quantity')::integer, 0), 0);
    IF v_pid IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Ligne de transfert invalide';
    END IF;
    INSERT INTO public.stock_transfer_items (transfer_id, product_id, quantity)
    VALUES (v_id, v_pid, v_qty);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'transfer_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_stock_transfer(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_t public.stock_transfers%ROWTYPE;
  v_line record;
BEGIN
  v_staff := public._assert_responsable();

  SELECT * INTO v_t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfert introuvable');
  END IF;

  IF v_t.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce transfert a déjà été expédié ou clôturé');
  END IF;

  IF NOT public._can_access_store(v_t.from_store_id) THEN
    RAISE EXCEPTION 'Boutique émettrice hors périmètre';
  END IF;

  FOR v_line IN
    SELECT product_id, quantity FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    PERFORM public._store_stock_delta(
      v_t.from_store_id, v_line.product_id, -v_line.quantity,
      'transfer_out', 'stock_transfer', p_transfer_id::text, v_staff, v_t.note
    );
  END LOOP;

  UPDATE public.stock_transfers
  SET status = 'sent', sent_by = v_staff, sent_at = now(), updated_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'sent');
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_t public.stock_transfers%ROWTYPE;
  v_line record;
BEGIN
  v_staff := public._assert_responsable();

  SELECT * INTO v_t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfert introuvable');
  END IF;

  IF v_t.status <> 'sent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seuls les transferts expédiés peuvent être réceptionnés');
  END IF;

  IF NOT public._can_access_store(v_t.to_store_id) THEN
    RAISE EXCEPTION 'Boutique destinataire hors périmètre';
  END IF;

  FOR v_line IN
    SELECT product_id, quantity FROM public.stock_transfer_items WHERE transfer_id = p_transfer_id
  LOOP
    PERFORM public._store_stock_delta(
      v_t.to_store_id, v_line.product_id, v_line.quantity,
      'transfer_in', 'stock_transfer', p_transfer_id::text, v_staff, v_t.note
    );
  END LOOP;

  UPDATE public.stock_transfers
  SET status = 'received', received_by = v_staff, received_at = now(), updated_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'received');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_stock_transfer(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_t public.stock_transfers%ROWTYPE;
BEGIN
  v_staff := public._assert_responsable();

  SELECT * INTO v_t FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfert introuvable');
  END IF;

  IF v_t.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul un brouillon peut être annulé');
  END IF;

  IF NOT public._can_access_store(v_t.from_store_id) THEN
    RAISE EXCEPTION 'Boutique source hors périmètre';
  END IF;

  UPDATE public.stock_transfers
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id, 'status', 'cancelled');
END;
$$;

CREATE OR REPLACE FUNCTION public.list_stock_transfers(
  p_store_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx record;
BEGIN
  PERFORM public._assert_staff();
  SELECT * INTO v_ctx FROM public._current_staff_ctx();

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'created_at') DESC)
    FROM (
      SELECT jsonb_build_object(
        'id', t.id,
        'from_store_id', t.from_store_id,
        'from_store_name', fs.name,
        'to_store_id', t.to_store_id,
        'to_store_name', ts.name,
        'status', t.status,
        'note', t.note,
        'sent_at', t.sent_at,
        'received_at', t.received_at,
        'created_at', t.created_at,
        'items', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'product_id', ti.product_id,
            'product_name', p.name,
            'quantity', ti.quantity
          )), '[]'::jsonb)
          FROM public.stock_transfer_items ti
          JOIN public.products p ON p.id = ti.product_id
          WHERE ti.transfer_id = t.id
        ),
        'days_in_transit', CASE
          WHEN t.status = 'sent' AND t.sent_at IS NOT NULL
          THEN EXTRACT(day FROM now() - t.sent_at)::integer
          ELSE NULL
        END
      ) AS row
      FROM public.stock_transfers t
      JOIN public.stores fs ON fs.id = t.from_store_id
      JOIN public.stores ts ON ts.id = t.to_store_id
      WHERE (p_status IS NULL OR t.status::text = p_status)
        AND (
          v_ctx.role IN ('direction', 'super_admin')
          OR t.from_store_id IS NOT DISTINCT FROM v_ctx.store_id
          OR t.to_store_id IS NOT DISTINCT FROM v_ctx.store_id
        )
        AND (
          p_store_id IS NULL
          OR t.from_store_id = p_store_id
          OR t.to_store_id = p_store_id
        )
      ORDER BY t.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
    ) sub
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stale_stock_transfers(p_days integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_staff();

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id,
      'from_store_name', fs.name,
      'to_store_name', ts.name,
      'sent_at', t.sent_at,
      'days_in_transit', EXTRACT(day FROM now() - t.sent_at)::integer,
      'item_count', (SELECT count(*)::int FROM public.stock_transfer_items ti WHERE ti.transfer_id = t.id)
    ) ORDER BY t.sent_at)
    FROM public.stock_transfers t
    JOIN public.stores fs ON fs.id = t.from_store_id
    JOIN public.stores ts ON ts.id = t.to_store_id
    WHERE t.status = 'sent'
      AND t.sent_at <= now() - (GREATEST(COALESCE(p_days, 5), 1) || ' days')::interval
  ), '[]'::jsonb);
END;
$$;

-- ── Inventaire physique ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_inventory_session(
  p_store_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_id uuid;
  v_open integer;
BEGIN
  v_staff := public._assert_responsable();

  IF NOT public._can_access_store(p_store_id) THEN
    RAISE EXCEPTION 'Boutique hors périmètre';
  END IF;

  SELECT count(*)::int INTO v_open
  FROM public.stock_inventory_sessions s
  WHERE s.store_id = p_store_id AND s.status = 'open';

  IF v_open > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Une session d''inventaire est déjà ouverte sur cette boutique');
  END IF;

  INSERT INTO public.stock_inventory_sessions (store_id, note, created_by)
  VALUES (p_store_id, NULLIF(trim(p_note), ''), v_staff)
  RETURNING id INTO v_id;

  INSERT INTO public.stock_inventory_lines (session_id, product_id, expected_qty)
  SELECT v_id, ss.product_id, ss.quantity
  FROM public.store_stock ss
  WHERE ss.store_id = p_store_id AND ss.quantity > 0;

  RETURN jsonb_build_object('success', true, 'session_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_line(
  p_session_id uuid,
  p_product_id text,
  p_counted_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sess public.stock_inventory_sessions%ROWTYPE;
BEGIN
  PERFORM public._assert_responsable();

  SELECT * INTO v_sess FROM public.stock_inventory_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_sess.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session invalide ou déjà clôturée');
  END IF;

  IF NOT public._can_access_store(v_sess.store_id) THEN
    RAISE EXCEPTION 'Boutique hors périmètre';
  END IF;

  UPDATE public.stock_inventory_lines
  SET counted_qty = GREATEST(COALESCE(p_counted_qty, 0), 0)
  WHERE session_id = p_session_id AND product_id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produit absent de cette session');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_inventory_session(
  p_session_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_sess public.stock_inventory_sessions%ROWTYPE;
  v_line record;
  v_adjusted integer := 0;
BEGIN
  v_staff := public._assert_responsable();

  SELECT * INTO v_sess FROM public.stock_inventory_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_sess.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session invalide ou déjà clôturée');
  END IF;

  IF NOT public._can_access_store(v_sess.store_id) THEN
    RAISE EXCEPTION 'Boutique hors périmètre';
  END IF;

  FOR v_line IN
    SELECT product_id, expected_qty, counted_qty
    FROM public.stock_inventory_lines
    WHERE session_id = p_session_id AND counted_qty IS NOT NULL
  LOOP
    IF v_line.counted_qty IS DISTINCT FROM v_line.expected_qty THEN
      PERFORM public._store_stock_delta(
        v_sess.store_id,
        v_line.product_id,
        v_line.counted_qty - v_line.expected_qty,
        'inventory_adjust',
        'inventory_session',
        p_session_id::text,
        v_staff,
        COALESCE(NULLIF(trim(p_note), ''), 'Inventaire physique')
      );
      v_adjusted := v_adjusted + 1;
    END IF;
  END LOOP;

  UPDATE public.stock_inventory_sessions
  SET
    status = 'completed',
    completed_by = v_staff,
    completed_at = now(),
    note = COALESCE(NULLIF(trim(p_note), ''), note)
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'lines_adjusted', v_adjusted);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inventory_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sess public.stock_inventory_sessions%ROWTYPE;
BEGIN
  PERFORM public._assert_staff();

  SELECT * INTO v_sess FROM public.stock_inventory_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session introuvable');
  END IF;

  IF NOT public._can_access_store(v_sess.store_id) THEN
    RAISE EXCEPTION 'Boutique hors périmètre';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session', jsonb_build_object(
      'id', v_sess.id,
      'store_id', v_sess.store_id,
      'status', v_sess.status,
      'note', v_sess.note,
      'created_at', v_sess.created_at,
      'completed_at', v_sess.completed_at
    ),
    'lines', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', l.product_id,
        'product_name', p.name,
        'expected_qty', l.expected_qty,
        'counted_qty', l.counted_qty,
        'variance', CASE
          WHEN l.counted_qty IS NULL THEN NULL
          ELSE l.counted_qty - l.expected_qty
        END
      ) ORDER BY p.name)
      FROM public.stock_inventory_lines l
      JOIN public.products p ON p.id = l.product_id
      WHERE l.session_id = p_session_id
    ), '[]'::jsonb)
  );
END;
$$;

-- ── Retour client SAV (après livraison) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_customer_return(
  p_order_id text,
  p_product_id text,
  p_quantity integer,
  p_reason text,
  p_disposition text,
  p_refund_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff uuid;
  v_order public.orders%ROWTYPE;
  v_store uuid;
  v_qty integer := GREATEST(COALESCE(p_quantity, 0), 0);
  v_line_qty integer;
BEGIN
  v_staff := public._assert_responsable();

  IF v_qty <= 0 OR p_disposition NOT IN ('restock', 'sav') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paramètres invalides');
  END IF;

  SELECT * INTO v_order FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  IF v_order.status <> 'delivered' OR COALESCE(v_order.payment_status, 'pending') <> 'paid' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Retour SAV : commande livrée et payée uniquement'
    );
  END IF;

  v_store := COALESCE(v_order.store_id, public._default_store_id());
  IF v_store IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Boutique de la vente introuvable');
  END IF;

  IF NOT public._can_access_store(v_store) THEN
    RAISE EXCEPTION 'Boutique hors périmètre';
  END IF;

  SELECT COALESCE(SUM(oi.quantity), 0)::int INTO v_line_qty
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id AND oi.product_id = p_product_id;

  IF v_line_qty <= 0 THEN
    SELECT COALESCE(SUM(GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1)), 0)::int
    INTO v_line_qty
    FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) elem
    WHERE elem->>'id' = p_product_id;
  END IF;

  IF v_line_qty <= 0 OR v_qty > v_line_qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantité invalide pour ce produit');
  END IF;

  INSERT INTO public.customer_returns (
    order_id, store_id, product_id, quantity, reason, disposition, refund_amount, staff_id
  ) VALUES (
    p_order_id, v_store, p_product_id, v_qty, trim(p_reason), p_disposition, p_refund_amount, v_staff
  );

  IF p_disposition = 'restock' THEN
    PERFORM public._store_stock_delta(
      v_store, p_product_id, v_qty, 'return',
      'customer_return', p_order_id, v_staff, trim(p_reason)
    );
  END IF;

  IF p_refund_amount IS NOT NULL AND p_refund_amount > 0 THEN
    UPDATE public.orders
    SET payment_status = 'refunded'
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'disposition', p_disposition,
    'restocked', p_disposition = 'restock'
  );
END;
$$;

-- ── Journal mouvements ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_stock_movements(
  p_store_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctx record;
BEGIN
  PERFORM public._assert_staff();
  SELECT * INTO v_ctx FROM public._current_staff_ctx();

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'created_at') DESC)
    FROM (
      SELECT jsonb_build_object(
        'id', m.id,
        'store_id', m.store_id,
        'store_name', st.name,
        'product_id', m.product_id,
        'product_name', p.name,
        'delta', m.delta,
        'reason', m.reason,
        'ref_type', m.ref_type,
        'ref_id', m.ref_id,
        'note', m.note,
        'created_at', m.created_at
      ) AS row
      FROM public.stock_movements m
      JOIN public.products p ON p.id = m.product_id
      LEFT JOIN public.stores st ON st.id = m.store_id
      WHERE (
        v_ctx.role IN ('direction', 'super_admin')
        OR m.store_id IS NOT DISTINCT FROM v_ctx.store_id
      )
      AND (p_store_id IS NULL OR m.store_id = p_store_id)
      ORDER BY m.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 80), 300))
    ) sub
  ), '[]'::jsonb);
END;
$$;

-- ── Privileges ───────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.cancel_order_with_stock(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_stock(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_stock_transfer(uuid, uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer(uuid, uuid, jsonb, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.send_stock_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_stock_transfer(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.receive_stock_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_stock_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_stock_transfer(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_stock_transfers(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_stock_transfers(uuid, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_stale_stock_transfers(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stale_stock_transfers(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.start_inventory_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_inventory_session(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_inventory_line(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_inventory_line(uuid, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_inventory_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_inventory_session(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_inventory_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_session(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.process_customer_return(text, text, integer, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_customer_return(text, text, integer, text, text, numeric) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_stock_movements(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_stock_movements(uuid, integer) TO authenticated, service_role;

COMMIT;

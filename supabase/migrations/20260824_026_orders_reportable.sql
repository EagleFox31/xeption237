-- Vue unique « CA reportable » + refactor reporting (dashboard, objectifs, mes ventes).
-- Exclut les commandes TEST- (mode essai caisse) et centralise le prédicat d'éligibilité.
-- Spec : utils/testMode.ts · ROADMAP §6 · migration 20260824_026

BEGIN;

CREATE OR REPLACE VIEW public.orders_reportable
WITH (security_invoker = true) AS
SELECT o.*
FROM public.orders o
WHERE o.status NOT IN ('cancelled', 'returned')
  AND (o.payment_status = 'paid' OR o.status = 'delivered')
  AND o.id NOT LIKE 'TEST-%';

COMMENT ON VIEW public.orders_reportable IS
  'Commandes entrant dans le CA encaissé, les objectifs/primes et le pilotage. '
  'Payées ou livrées, hors annulées/retournées, hors essais caisse (id TEST-%).';

GRANT SELECT ON public.orders_reportable TO authenticated, service_role;

-- ── Helper objectifs (étape 7) ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._sum_eligible_revenue(
  p_from timestamptz,
  p_to timestamptz,
  p_staff_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(o.total), 0)
  FROM public.orders_reportable o
  WHERE o.date >= p_from
    AND o.date < p_to
    AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    AND (p_store_id IS NULL OR o.store_id = p_store_id);
$$;

REVOKE ALL ON FUNCTION public._sum_eligible_revenue(timestamptz, timestamptz, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- ── Mes ventes (aligné CA reportable, hors TEST-) ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_staff_sales_summary(
  p_staff_id uuid,
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to   timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'sale_count', COUNT(*)::integer,
      'total_amount', COALESCE(SUM(o.total), 0),
      'discount_total', COALESCE(SUM(o.discount_amount), 0),
      'subtotal_amount', COALESCE(SUM(o.total + o.discount_amount), 0)
    )
    FROM public.orders_reportable o
    WHERE o.staff_id = p_staff_id
      AND o.date >= COALESCE(
        p_from,
        date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
      )
      AND o.date < COALESCE(
        p_to,
        date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
          + interval '1 day'
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_staff_sales(
  p_staff_id uuid,
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to   timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  order_id text,
  customer_name text,
  customer_phone text,
  payment_method text,
  total numeric,
  discount_amount numeric,
  status text,
  sale_date timestamp with time zone,
  store_id uuid,
  items jsonb,
  item_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
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
  FROM public.orders_reportable o
  WHERE o.staff_id = p_staff_id
    AND o.date >= COALESCE(
      p_from,
      date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
    )
    AND o.date < COALESCE(
      p_to,
      date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
        + interval '1 day'
    )
  ORDER BY o.date DESC;
END;
$function$;

-- ── Dashboard (étape 6) ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
  v_kpis jsonb;
  v_gap jsonb;
  v_staff jsonb;
  v_stores jsonb;
  v_products jsonb;
  v_recent jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  v_from := COALESCE(
    p_from,
    date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala'
  );
  v_to := COALESCE(
    p_to,
    date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' + interval '1 day'
  );

  WITH eligible AS (
    SELECT o.*
    FROM public.orders_reportable o
    WHERE o.date >= v_from AND o.date < v_to
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
  ),
  item_stats AS (
    SELECT
      COALESCE(SUM(oi.quantity), 0)::bigint AS items_from_lines,
      COALESCE(SUM(oi.line_total), 0) AS revenue_from_lines
    FROM eligible e
    JOIN public.order_items oi ON oi.order_id = e.id
  ),
  json_items AS (
    SELECT COALESCE(SUM(
      GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1)
    ), 0)::bigint AS items_from_json
    FROM eligible e,
    LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(COALESCE(e.items, '[]'::jsonb)) = 'array'
           THEN COALESCE(e.items, '[]'::jsonb) ELSE '[]'::jsonb END
    ) AS elem
    WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = e.id)
  )
  SELECT jsonb_build_object(
    'revenue', COALESCE(SUM(e.total), 0),
    'transaction_count', COUNT(*)::integer,
    'items_sold', GREATEST(
      (SELECT items_from_lines FROM item_stats),
      (SELECT items_from_json FROM json_items)
    ),
    'average_basket', CASE WHEN COUNT(*) > 0
      THEN ROUND(COALESCE(SUM(e.total), 0) / COUNT(*), 0) ELSE 0 END,
    'discount_total', COALESCE(SUM(e.discount_amount), 0)
  )
  INTO v_kpis
  FROM eligible e;

  SELECT jsonb_build_object(
    'orders_without_line_items', COUNT(*)::integer,
    'revenue_without_detail', COALESCE(SUM(sub.total), 0)
  )
  INTO v_gap
  FROM (
    SELECT o.id, o.total
    FROM public.orders_reportable o
    WHERE o.date >= v_from AND o.date < v_to
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
      AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)
  ) sub;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'revenue')::numeric DESC), '[]'::jsonb)
  INTO v_staff
  FROM (
    SELECT jsonb_build_object(
      'staff_id', s.id,
      'staff_name', s.name,
      'store_name', st.name,
      'revenue', COALESCE(SUM(o.total), 0),
      'transaction_count', COUNT(*)::integer,
      'items_sold', COALESCE(SUM(
        (SELECT SUM(oi.quantity) FROM public.order_items oi WHERE oi.order_id = o.id)
      ), 0)::integer
    ) AS row
    FROM public.orders_reportable o
    JOIN public.staff s ON s.id = o.staff_id
    LEFT JOIN public.stores st ON st.id = o.store_id
    WHERE o.date >= v_from AND o.date < v_to
      AND o.staff_id IS NOT NULL
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    GROUP BY s.id, s.name, st.name
  ) ranked;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'revenue')::numeric DESC), '[]'::jsonb)
  INTO v_stores
  FROM (
    SELECT jsonb_build_object(
      'store_id', st.id,
      'store_name', st.name,
      'revenue', COALESCE(SUM(o.total), 0),
      'transaction_count', COUNT(*)::integer
    ) AS row
    FROM public.orders_reportable o
    JOIN public.stores st ON st.id = o.store_id
    WHERE o.date >= v_from AND o.date < v_to
      AND o.store_id IS NOT NULL
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    GROUP BY st.id, st.name
  ) ranked;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'revenue')::numeric DESC), '[]'::jsonb)
  INTO v_products
  FROM (
    SELECT jsonb_build_object(
      'product_id', oi.product_id,
      'product_name', MAX(oi.product_name),
      'quantity', SUM(oi.quantity)::integer,
      'revenue', SUM(oi.line_total)
    ) AS row
    FROM public.orders_reportable o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.date >= v_from AND o.date < v_to
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    GROUP BY oi.product_id
    LIMIT 15
  ) ranked;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'sale_date') DESC), '[]'::jsonb)
  INTO v_recent
  FROM (
    SELECT jsonb_build_object(
      'order_id', o.id,
      'customer_name', o.customer_name,
      'total', o.total,
      'status', o.status,
      'sale_date', o.date,
      'staff_name', s.name,
      'store_name', st.name
    ) AS row
    FROM public.orders_reportable o
    LEFT JOIN public.staff s ON s.id = o.staff_id
    LEFT JOIN public.stores st ON st.id = o.store_id
    WHERE o.date >= v_from AND o.date < v_to
      AND (p_store_id IS NULL OR o.store_id = p_store_id)
      AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    ORDER BY o.date DESC
    LIMIT 8
  ) recent;

  RETURN jsonb_build_object(
    'period', jsonb_build_object('from', v_from, 'to', v_to),
    'kpis', v_kpis,
    'coverage_gap', v_gap,
    'by_staff', v_staff,
    'by_store', v_stores,
    'top_products', v_products,
    'recent_sales', v_recent
  );
END;
$$;

COMMIT;

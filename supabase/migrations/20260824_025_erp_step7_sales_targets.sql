-- Étape 7 ERP : objectifs & primes
-- Spec : ROADMAP_ERP.md §7 · UC-V-03 · UC-D-04
-- CA encaissé : payment_status = paid OR status = delivered, hors cancelled/returned

BEGIN;

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('staff', 'store')),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  period_kind text NOT NULL CHECK (period_kind IN ('daily', 'monthly')),
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_targets_scope_fk CHECK (
    (scope_type = 'staff' AND staff_id IS NOT NULL AND store_id IS NULL)
    OR (scope_type = 'store' AND store_id IS NOT NULL AND staff_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_targets_staff_period
  ON public.sales_targets (staff_id, period_kind)
  WHERE scope_type = 'staff';

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_targets_store_period
  ON public.sales_targets (store_id, period_kind)
  WHERE scope_type = 'store';

CREATE TABLE IF NOT EXISTS public.bonus_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  min_achievement_percent numeric NOT NULL CHECK (min_achievement_percent > 0),
  bonus_amount numeric NOT NULL CHECK (bonus_amount >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_targets_staff_read ON public.sales_targets;
CREATE POLICY sales_targets_staff_read ON public.sales_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS bonus_rules_staff_read ON public.bonus_rules;
CREATE POLICY bonus_rules_staff_read ON public.bonus_rules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- ── Helpers internes ─────────────────────────────────────────────────────────

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
  FROM public.orders o
  WHERE o.date >= p_from
    AND o.date < p_to
    AND o.status NOT IN ('cancelled', 'returned')
    AND (o.payment_status = 'paid' OR o.status = 'delivered')
    AND (p_staff_id IS NULL OR o.staff_id = p_staff_id)
    AND (p_store_id IS NULL OR o.store_id = p_store_id);
$$;

CREATE OR REPLACE FUNCTION public._require_direction_staff()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
      AND s.role IN ('direction', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à la direction';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._period_bounds(p_kind text)
RETURNS TABLE (p_from timestamptz, p_to timestamptz)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz;
BEGIN
  v_day_start := date_trunc(
    'day',
    now() AT TIME ZONE 'Africa/Douala'
  ) AT TIME ZONE 'Africa/Douala';

  IF p_kind = 'daily' THEN
    p_from := v_day_start;
    p_to := v_day_start + interval '1 day';
    RETURN NEXT;
    RETURN;
  END IF;

  p_from := date_trunc(
    'month',
    now() AT TIME ZONE 'Africa/Douala'
  ) AT TIME ZONE 'Africa/Douala';
  p_to := p_from + interval '1 month';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._sum_eligible_revenue(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._require_direction_staff() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._period_bounds(text) FROM PUBLIC, anon, authenticated;

-- ── Progression objectifs ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_sales_targets_progress(p_staff_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller public.staff%ROWTYPE;
  v_day_from timestamptz;
  v_day_to timestamptz;
  v_month_from timestamptz;
  v_month_to timestamptz;
  v_staff jsonb;
  v_stores jsonb;
  v_rules jsonb;
BEGIN
  SELECT * INTO v_caller
  FROM public.staff s
  WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  SELECT b.p_from, b.p_to INTO v_day_from, v_day_to FROM public._period_bounds('daily') b;
  SELECT b.p_from, b.p_to INTO v_month_from, v_month_to FROM public._period_bounds('monthly') b;

  IF v_caller.role = 'vendeur' THEN
    p_staff_id := v_caller.id;
  ELSIF v_caller.role = 'responsable' AND p_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.staff target
      WHERE target.id = p_staff_id
        AND target.store_id IS NOT DISTINCT FROM v_caller.store_id
    ) THEN
      RAISE EXCEPTION 'Accès limité à votre boutique';
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'staff_name')), '[]'::jsonb)
  INTO v_staff
  FROM (
    SELECT jsonb_build_object(
      'staff_id', s.id,
      'staff_name', s.name,
      'store_id', s.store_id,
      'store_name', st.name,
      'daily', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_day_from, v_day_to, s.id, NULL),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_day_from, v_day_to, s.id, NULL) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_day_from, v_day_to, s.id, NULL))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_day_from, v_day_to, s.id, NULL) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'staff'
          AND t.staff_id = s.id
          AND t.period_kind = 'daily'
          AND t.active
      ),
      'monthly', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_month_from, v_month_to, s.id, NULL),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_month_from, v_month_to, s.id, NULL) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_month_from, v_month_to, s.id, NULL))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_month_from, v_month_to, s.id, NULL) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'staff'
          AND t.staff_id = s.id
          AND t.period_kind = 'monthly'
          AND t.active
      ),
      'monthly_bonuses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'rule_id', br.id,
          'label', br.label,
          'min_achievement_percent', br.min_achievement_percent,
          'bonus_amount', br.bonus_amount,
          'earned', (
            SELECT CASE
              WHEN mt.target_amount IS NULL OR mt.target_amount <= 0 THEN false
              ELSE (
                public._sum_eligible_revenue(v_month_from, v_month_to, s.id, NULL) / mt.target_amount * 100
              ) >= br.min_achievement_percent
            END
            FROM public.sales_targets mt
            WHERE mt.scope_type = 'staff'
              AND mt.staff_id = s.id
              AND mt.period_kind = 'monthly'
              AND mt.active
            LIMIT 1
          )
        ) ORDER BY br.sort_order, br.min_achievement_percent), '[]'::jsonb)
        FROM public.bonus_rules br
        WHERE br.active
      )
    ) AS row
    FROM public.staff s
    LEFT JOIN public.stores st ON st.id = s.store_id
    WHERE (p_staff_id IS NULL OR s.id = p_staff_id)
      AND (
        v_caller.role IN ('direction', 'super_admin')
        OR (v_caller.role = 'responsable' AND s.store_id IS NOT DISTINCT FROM v_caller.store_id)
        OR s.id = v_caller.id
      )
  ) ranked;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'store_name')), '[]'::jsonb)
  INTO v_stores
  FROM (
    SELECT jsonb_build_object(
      'store_id', st.id,
      'store_name', st.name,
      'daily', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_day_from, v_day_to, NULL, st.id),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_day_from, v_day_to, NULL, st.id) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_day_from, v_day_to, NULL, st.id))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_day_from, v_day_to, NULL, st.id) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'store'
          AND t.store_id = st.id
          AND t.period_kind = 'daily'
          AND t.active
      ),
      'monthly', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_month_from, v_month_to, NULL, st.id),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_month_from, v_month_to, NULL, st.id) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_month_from, v_month_to, NULL, st.id))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_month_from, v_month_to, NULL, st.id) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'store'
          AND t.store_id = st.id
          AND t.period_kind = 'monthly'
          AND t.active
      )
    ) AS row
    FROM public.stores st
    WHERE st.active
      AND (
        v_caller.role IN ('direction', 'super_admin')
        OR (v_caller.role = 'responsable' AND st.id IS NOT DISTINCT FROM v_caller.store_id)
      )
  ) store_ranked;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', br.id,
    'label', br.label,
    'min_achievement_percent', br.min_achievement_percent,
    'bonus_amount', br.bonus_amount,
    'sort_order', br.sort_order,
    'active', br.active
  ) ORDER BY br.sort_order, br.min_achievement_percent), '[]'::jsonb)
  INTO v_rules
  FROM public.bonus_rules br
  WHERE br.active OR v_caller.role IN ('direction', 'super_admin');

  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'day_from', v_day_from,
      'day_to', v_day_to,
      'month_from', v_month_from,
      'month_to', v_month_to
    ),
    'bonus_rules', v_rules,
    'staff', v_staff,
    'stores', v_stores
  );
END;
$$;

-- ── CRUD direction ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_sales_target(
  p_scope_type text,
  p_period_kind text,
  p_target_amount numeric,
  p_staff_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_active boolean DEFAULT true,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sales_targets%ROWTYPE;
  v_existing_id uuid;
BEGIN
  PERFORM public._require_direction_staff();

  IF p_target_amount IS NULL OR p_target_amount <= 0 THEN
    RAISE EXCEPTION 'Montant objectif invalide';
  END IF;

  IF p_scope_type NOT IN ('staff', 'store') OR p_period_kind NOT IN ('daily', 'monthly') THEN
    RAISE EXCEPTION 'Paramètres invalides';
  END IF;

  IF p_scope_type = 'staff' AND p_staff_id IS NULL THEN
    RAISE EXCEPTION 'Vendeur requis';
  END IF;

  IF p_scope_type = 'store' AND p_store_id IS NULL THEN
    RAISE EXCEPTION 'Boutique requise';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.sales_targets t
    SET
      scope_type = p_scope_type,
      staff_id = CASE WHEN p_scope_type = 'staff' THEN p_staff_id ELSE NULL END,
      store_id = CASE WHEN p_scope_type = 'store' THEN p_store_id ELSE NULL END,
      period_kind = p_period_kind,
      target_amount = p_target_amount,
      active = COALESCE(p_active, true),
      updated_at = now()
    WHERE t.id = p_id
    RETURNING * INTO v_row;
  ELSE
    SELECT t.id INTO v_existing_id
    FROM public.sales_targets t
    WHERE t.scope_type = p_scope_type
      AND t.period_kind = p_period_kind
      AND (
        (p_scope_type = 'staff' AND t.staff_id = p_staff_id)
        OR (p_scope_type = 'store' AND t.store_id = p_store_id)
      )
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.sales_targets t
      SET
        target_amount = p_target_amount,
        active = COALESCE(p_active, true),
        updated_at = now()
      WHERE t.id = v_existing_id
      RETURNING * INTO v_row;
    ELSE
      INSERT INTO public.sales_targets (
        scope_type, staff_id, store_id, period_kind, target_amount, active
      )
      VALUES (
        p_scope_type,
        CASE WHEN p_scope_type = 'staff' THEN p_staff_id ELSE NULL END,
        CASE WHEN p_scope_type = 'store' THEN p_store_id ELSE NULL END,
        p_period_kind,
        p_target_amount,
        COALESCE(p_active, true)
      )
      RETURNING * INTO v_row;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objectif introuvable';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sales_target(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_direction_staff();
  DELETE FROM public.sales_targets WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_bonus_rule(
  p_label text,
  p_min_achievement_percent numeric,
  p_bonus_amount numeric,
  p_sort_order integer DEFAULT 0,
  p_active boolean DEFAULT true,
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bonus_rules%ROWTYPE;
BEGIN
  PERFORM public._require_direction_staff();

  IF p_id IS NULL THEN
    INSERT INTO public.bonus_rules (label, min_achievement_percent, bonus_amount, sort_order, active)
    VALUES (p_label, p_min_achievement_percent, p_bonus_amount, COALESCE(p_sort_order, 0), COALESCE(p_active, true))
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.bonus_rules
    SET
      label = p_label,
      min_achievement_percent = p_min_achievement_percent,
      bonus_amount = p_bonus_amount,
      sort_order = COALESCE(p_sort_order, 0),
      active = COALESCE(p_active, true),
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_bonus_rule(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_direction_staff();
  DELETE FROM public.bonus_rules WHERE id = p_id;
END;
$$;

-- ── Privileges ───────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_sales_targets_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_targets_progress(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_sales_target(text, text, numeric, uuid, uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_sales_target(text, text, numeric, uuid, uuid, boolean, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_sales_target(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_sales_target(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_bonus_rule(text, numeric, numeric, integer, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_bonus_rule(text, numeric, numeric, integer, boolean, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_bonus_rule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_bonus_rule(uuid) TO authenticated, service_role;

COMMIT;

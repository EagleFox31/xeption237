-- ============================================================================
-- 20261023_005_store_cash_and_debts.sql
-- Gestion de caisse journalière & registre des créances / dettes clients
-- ============================================================================

BEGIN;

-- 1. Table des créances / dettes clients par boutique -----------------------
CREATE TABLE IF NOT EXISTS public.store_debts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  customer_name         text NOT NULL,
  phone                 text,
  device_model          text,
  amount_due            numeric NOT NULL CHECK (amount_due >= 0),
  amount_paid           numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partial', 'settled', 'cancelled')),
  created_by_staff_id   uuid REFERENCES public.staff(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_debts_store_status ON public.store_debts (store_id, status);

-- 2. Table des rapports journaliers de caisse ------------------------------
CREATE TABLE IF NOT EXISTS public.store_cash_reports (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                  uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  report_date               date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Douala')::date,
  opening_cash              numeric NOT NULL DEFAULT 0,
  closing_cash              numeric NOT NULL DEFAULT 0,
  total_inflow              numeric NOT NULL DEFAULT 0,
  total_outflow             numeric NOT NULL DEFAULT 0,
  inflow_items              jsonb NOT NULL DEFAULT '[]'::jsonb,
  outflow_items             jsonb NOT NULL DEFAULT '[]'::jsonb,
  debts_snapshot            jsonb NOT NULL DEFAULT '[]'::jsonb,
  operators                 text[] NOT NULL DEFAULT '{}',
  observations              text,
  staff_progress            jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_by_staff_id     uuid REFERENCES public.staff(id),
  submitted_by_telegram_user_id text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_cash_reports_store_date_unique UNIQUE (store_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_store_cash_reports_date ON public.store_cash_reports (report_date DESC, store_id);

-- 3. Brouillons de saisie bot (un brouillon par utilisateur & boutique) -----
CREATE TABLE IF NOT EXISTS public.store_cash_drafts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id          text NOT NULL,
  store_id                  uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_date               date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Douala')::date,
  opening_cash              numeric NOT NULL DEFAULT 0,
  inflow_items              jsonb NOT NULL DEFAULT '[]'::jsonb,
  outflow_items             jsonb NOT NULL DEFAULT '[]'::jsonb,
  operators                 text[] NOT NULL DEFAULT '{}',
  observations              text,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_cash_drafts_user_store_unique UNIQUE (telegram_user_id, store_id)
);

-- RLS
ALTER TABLE public.store_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_cash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_cash_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_debts_staff_all ON public.store_debts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY store_cash_reports_staff_all ON public.store_cash_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY store_cash_drafts_staff_all ON public.store_cash_drafts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Privilèges
GRANT ALL ON public.store_debts TO authenticated, service_role;
GRANT ALL ON public.store_cash_reports TO authenticated, service_role;
GRANT ALL ON public.store_cash_drafts TO authenticated, service_role;


-- 4. RPC d'initialisation du rapport de caisse pour le bot ------------------
CREATE OR REPLACE FUNCTION public.telegram_staff_cash_report_init(
  p_telegram_user_id text,
  p_store_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_store record;
  v_today date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_yesterday_closing numeric := 0;
  v_draft record;
  v_operators jsonb;
  v_today_pos jsonb;
  v_debts jsonb;
  v_staff_progress jsonb;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Résoudre la boutique
  IF p_store_code IS NOT NULL AND p_store_code <> '' AND v_actor.o_rank >= 2 THEN
    SELECT * INTO v_store FROM public.stores WHERE code = p_store_code AND active = true;
  END IF;
  IF v_store.id IS NULL AND v_actor.o_store_id IS NOT NULL THEN
    SELECT * INTO v_store FROM public.stores WHERE id = v_actor.o_store_id AND active = true;
  END IF;
  IF v_store.id IS NULL THEN
    SELECT * INTO v_store FROM public.stores WHERE is_default = true AND active = true LIMIT 1;
  END IF;
  IF v_store.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_store');
  END IF;

  v_today := (now() AT TIME ZONE 'Africa/Douala')::date;
  SELECT p_from, p_to INTO v_day_start, v_day_end FROM public._period_bounds('daily');
  SELECT p_from, p_to INTO v_week_start, v_week_end FROM public._period_bounds('weekly');
  SELECT p_from, p_to INTO v_month_start, v_month_end FROM public._period_bounds('monthly');

  -- Récupérer le solde de la veille au soir s'il existe
  SELECT closing_cash INTO v_yesterday_closing
  FROM public.store_cash_reports
  WHERE store_id = v_store.id AND report_date < v_today
  ORDER BY report_date DESC
  LIMIT 1;

  -- Récupérer ou créer le brouillon du jour
  SELECT * INTO v_draft FROM public.store_cash_drafts
  WHERE telegram_user_id = p_telegram_user_id AND store_id = v_store.id;

  -- Opérateurs de la boutique
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'role', s.role
  ) ORDER BY s.name), '[]'::jsonb)
  INTO v_operators
  FROM public.staff s
  WHERE s.store_id = v_store.id;

  -- Ventes comptoir du jour pour cette boutique
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'order_id', o.id,
    'product_name', coalesce((
      SELECT string_agg(coalesce(i->>'name', 'Article'), ', ')
      FROM jsonb_array_elements(o.items) i
    ), 'Vente comptoir'),
    'amount', o.total,
    'seller_id', o.staff_id,
    'seller_name', s.name,
    'payment_method', o.payment_method
  ) ORDER BY o.date ASC), '[]'::jsonb)
  INTO v_today_pos
  FROM public.orders_reportable o
  LEFT JOIN public.staff s ON s.id = o.staff_id
  WHERE o.store_id = v_store.id
    AND o.date >= v_day_start AND o.date < v_day_end
    AND o.delivery_mode = 'pos';

  -- Dettes actives de la boutique
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'customer_name', d.customer_name,
    'device_model', d.device_model,
    'amount_due', d.amount_due,
    'amount_paid', d.amount_paid,
    'remaining', (d.amount_due - d.amount_paid),
    'phone', d.phone,
    'created_at', d.created_at
  ) ORDER BY d.created_at ASC), '[]'::jsonb)
  INTO v_debts
  FROM public.store_debts d
  WHERE d.store_id = v_store.id AND d.status IN ('active', 'partial');

  -- Progression des objectifs pour les vendeurs de cette boutique
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'staff_id', s.id,
    'staff_name', s.name,
    'today_sales', coalesce(public._sum_eligible_revenue(v_day_start, v_day_end, s.id, NULL), 0),
    'weekly_actual', coalesce(public._sum_eligible_revenue(v_week_start, v_week_end, s.id, NULL), 0),
    'weekly_target', (
      SELECT target_amount FROM public.sales_targets t
      WHERE t.scope_type = 'staff' AND t.staff_id = s.id AND t.period_kind = 'weekly' AND t.active LIMIT 1
    ),
    'monthly_actual', coalesce(public._sum_eligible_revenue(v_month_start, v_month_end, s.id, NULL), 0),
    'monthly_target', (
      SELECT target_amount FROM public.sales_targets t
      WHERE t.scope_type = 'staff' AND t.staff_id = s.id AND t.period_kind = 'monthly' AND t.active LIMIT 1
    )
  ) ORDER BY s.name), '[]'::jsonb)
  INTO v_staff_progress
  FROM public.staff s
  WHERE s.store_id = v_store.id;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store.id,
    'store_code', v_store.code,
    'store_name', v_store.name,
    'report_date', to_char(v_today, 'YYYY-MM-DD'),
    'suggested_opening_cash', coalesce(v_yesterday_closing, 0),
    'operators', v_operators,
    'today_pos_sales', v_today_pos,
    'active_debts', v_debts,
    'staff_progress', v_staff_progress,
    'draft', CASE WHEN v_draft.id IS NOT NULL THEN jsonb_build_object(
      'id', v_draft.id,
      'opening_cash', v_draft.opening_cash,
      'inflow_items', v_draft.inflow_items,
      'outflow_items', v_draft.outflow_items,
      'operators', v_draft.operators,
      'observations', v_draft.observations
    ) ELSE NULL END
  );
END;
$$;

-- 5. RPC pour enregistrer ou mettre à jour une dette ------------------------
CREATE OR REPLACE FUNCTION public.telegram_staff_debt_add(
  p_telegram_user_id text,
  p_store_id uuid,
  p_customer_name text,
  p_device_model text,
  p_amount numeric,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_debt_id uuid;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
  END IF;

  INSERT INTO public.store_debts (
    store_id, customer_name, device_model, amount_due, phone, created_by_staff_id
  ) VALUES (
    p_store_id, trim(p_customer_name), trim(coalesce(p_device_model, '')), p_amount, trim(coalesce(p_phone, '')), v_actor.o_staff_id
  ) RETURNING id INTO v_debt_id;

  RETURN jsonb_build_object('success', true, 'debt_id', v_debt_id);
END;
$$;

-- 6. RPC pour encaisser / régler une dette ---------------------------------
CREATE OR REPLACE FUNCTION public.telegram_staff_debt_settle(
  p_telegram_user_id text,
  p_debt_id uuid,
  p_amount_paid numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_debt record;
  v_new_paid numeric;
  v_status text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO v_debt FROM public.store_debts WHERE id = p_debt_id FOR UPDATE;
  IF v_debt.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'debt_not_found');
  END IF;

  IF p_amount_paid IS NULL OR p_amount_paid <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
  END IF;

  v_new_paid := v_debt.amount_paid + p_amount_paid;
  IF v_new_paid >= v_debt.amount_due THEN
    v_status := 'settled';
  ELSE
    v_status := 'partial';
  END IF;

  UPDATE public.store_debts
  SET amount_paid = v_new_paid, status = v_status, updated_at = now()
  WHERE id = p_debt_id;

  RETURN jsonb_build_object(
    'success', true,
    'debt_id', p_debt_id,
    'customer_name', v_debt.customer_name,
    'amount_settled', p_amount_paid,
    'total_paid', v_new_paid,
    'remaining', greatest(0, v_debt.amount_due - v_new_paid),
    'status', v_status
  );
END;
$$;

-- 7. RPC de sauvegarde / publication du rapport de caisse ------------------
CREATE OR REPLACE FUNCTION public.telegram_staff_cash_report_submit(
  p_telegram_user_id text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_store_id uuid;
  v_report_date date;
  v_opening numeric;
  v_inflow numeric;
  v_outflow numeric;
  v_closing numeric;
  v_inflow_items jsonb;
  v_outflow_items jsonb;
  v_debts_snapshot jsonb;
  v_operators text[];
  v_observations text;
  v_staff_progress jsonb;
  v_report_id uuid;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  v_store_id := (p_payload->>'store_id')::uuid;
  v_report_date := coalesce((p_payload->>'report_date')::date, (now() AT TIME ZONE 'Africa/Douala')::date);
  v_opening := coalesce((p_payload->>'opening_cash')::numeric, 0);
  v_inflow := coalesce((p_payload->>'total_inflow')::numeric, 0);
  v_outflow := coalesce((p_payload->>'total_outflow')::numeric, 0);
  v_closing := v_opening + v_inflow - v_outflow;
  v_inflow_items := coalesce(p_payload->'inflow_items', '[]'::jsonb);
  v_outflow_items := coalesce(p_payload->'outflow_items', '[]'::jsonb);
  v_debts_snapshot := coalesce(p_payload->'debts_snapshot', '[]'::jsonb);
  v_observations := p_payload->>'observations';
  v_staff_progress := coalesce(p_payload->'staff_progress', '[]'::jsonb);

  SELECT coalesce(array_agg(value::text), '{}'::text[])
  INTO v_operators
  FROM jsonb_array_elements_text(coalesce(p_payload->'operators', '[]'::jsonb));

  INSERT INTO public.store_cash_reports (
    store_id, report_date, opening_cash, closing_cash, total_inflow, total_outflow,
    inflow_items, outflow_items, debts_snapshot, operators, observations, staff_progress,
    submitted_by_staff_id, submitted_by_telegram_user_id, updated_at
  ) VALUES (
    v_store_id, v_report_date, v_opening, v_closing, v_inflow, v_outflow,
    v_inflow_items, v_outflow_items, v_debts_snapshot, v_operators, v_observations, v_staff_progress,
    v_actor.o_staff_id, p_telegram_user_id, now()
  )
  ON CONFLICT (store_id, report_date) DO UPDATE SET
    opening_cash = EXCLUDED.opening_cash,
    closing_cash = EXCLUDED.closing_cash,
    total_inflow = EXCLUDED.total_inflow,
    total_outflow = EXCLUDED.total_outflow,
    inflow_items = EXCLUDED.inflow_items,
    outflow_items = EXCLUDED.outflow_items,
    debts_snapshot = EXCLUDED.debts_snapshot,
    operators = EXCLUDED.operators,
    observations = EXCLUDED.observations,
    staff_progress = EXCLUDED.staff_progress,
    submitted_by_staff_id = EXCLUDED.submitted_by_staff_id,
    submitted_by_telegram_user_id = EXCLUDED.submitted_by_telegram_user_id,
    updated_at = now()
  RETURNING id INTO v_report_id;

  -- Supprimer le brouillon une fois soumis
  DELETE FROM public.store_cash_drafts
  WHERE telegram_user_id = p_telegram_user_id AND store_id = v_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'closing_cash', v_closing
  );
END;
$$;

-- Droits RPC
REVOKE ALL ON FUNCTION public.telegram_staff_cash_report_init(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_debt_add(text, uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_debt_settle(text, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_staff_cash_report_submit(text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.telegram_staff_cash_report_init(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_debt_add(text, uuid, text, text, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_debt_settle(text, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.telegram_staff_cash_report_submit(text, jsonb) TO service_role;

ALTER TABLE public.store_cash_drafts ADD COLUMN IF NOT EXISTS pending_action text;
ALTER TABLE public.store_cash_drafts ADD COLUMN IF NOT EXISTS pending_target_id text;

COMMIT;


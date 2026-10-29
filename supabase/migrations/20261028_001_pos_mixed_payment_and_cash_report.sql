-- 20261028_001_pos_mixed_payment_and_cash_report.sql
-- Lot 3 : Paiement mixte au comptoir (CASH + OM/MOMO), ventilation order_payments et correction du rapport de caisse

BEGIN;

-- 1. Ajout de la colonne payment_split dans telegram_sale_drafts
ALTER TABLE public.telegram_sale_drafts
  ADD COLUMN IF NOT EXISTS payment_split jsonb;

-- 2. Recréation de telegram_staff_sale_draft_open avec support de payment_split
-- Suppression de l'ancienne signature (3 arguments) pour éviter le piège des surcharges
DROP FUNCTION IF EXISTS public.telegram_staff_sale_draft_open(text, text, text);

CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_open(
  p_telegram_user_id text,
  p_product_id text,
  p_payment_method text,
  p_payment_split jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_product record;
  v_available int;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_split_len int;
  v_ch1 text;
  v_ch2 text;
  v_amt1 numeric;
  v_amt2 numeric;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('CASH', 'OM', 'MOMO', 'MIXED') THEN
    RAISE EXCEPTION 'Invalid payment method' USING ERRCODE = '22023';
  END IF;
  IF v_actor.o_store_id IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;

  SELECT p.id, p.name, p.price INTO v_product FROM public.products p WHERE p.id = p_product_id;
  IF NOT FOUND OR coalesce(v_product.price, 0) <= 0 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  -- Validation stricte du paiement mixte
  IF p_payment_method = 'MIXED' THEN
    IF p_payment_split IS NULL OR jsonb_typeof(p_payment_split) <> 'array' THEN
      RAISE EXCEPTION 'Invalid payment split' USING ERRCODE = '22023';
    END IF;
    v_split_len := jsonb_array_length(p_payment_split);
    IF v_split_len <> 2 THEN
      RAISE EXCEPTION 'Payment split must have exactly 2 channels' USING ERRCODE = '22023';
    END IF;

    v_ch1 := lower(trim(coalesce(p_payment_split->0->>'channel', '')));
    v_ch2 := lower(trim(coalesce(p_payment_split->1->>'channel', '')));
    IF v_ch1 NOT IN ('cash', 'om', 'momo') OR v_ch2 NOT IN ('cash', 'om', 'momo') OR v_ch1 = v_ch2 THEN
      RAISE EXCEPTION 'Payment split channels must be distinct among cash, om, momo' USING ERRCODE = '22023';
    END IF;

    v_amt1 := (p_payment_split->0->>'amount')::numeric;
    v_amt2 := (p_payment_split->1->>'amount')::numeric;
    IF v_amt1 IS NULL OR v_amt2 IS NULL OR v_amt1 <= 0 OR v_amt2 <= 0
       OR round(v_amt1) <> v_amt1 OR round(v_amt2) <> v_amt2 THEN
      RAISE EXCEPTION 'Payment split amounts must be positive integers' USING ERRCODE = '22023';
    END IF;

    IF (v_amt1 + v_amt2) <> v_product.price THEN
      RAISE EXCEPTION 'Payment split sum (%) must match product price (%)', (v_amt1 + v_amt2), v_product.price USING ERRCODE = '22023';
    END IF;
  ELSE
    p_payment_split := NULL;
  END IF;

  -- Pré-contrôle pour l'affichage ; le contrôle qui fait foi est celui de _store_sale_line.
  SELECT coalesce(ss.quantity, 0) - coalesce(ss.reserved, 0) INTO v_available
  FROM public.store_stock ss
  WHERE ss.store_id = v_actor.o_store_id AND ss.product_id = p_product_id;
  IF coalesce(v_available, 0) < 1 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'out_of_stock', 'product_name', v_product.name);
  END IF;

  -- Purge à la volée des brouillons morts de cet utilisateur.
  DELETE FROM public.telegram_sale_drafts
  WHERE telegram_user_id = p_telegram_user_id AND status <> 'completed'
    AND expires_at < now() - interval '1 day';

  v_draft.id := gen_random_uuid();
  INSERT INTO public.telegram_sale_drafts (
    id, telegram_user_id, auth_user_id, staff_id, store_id, lines, payment_method, payment_split, order_id
  ) VALUES (
    v_draft.id, p_telegram_user_id, v_actor.o_auth_user_id, v_actor.o_staff_id, v_actor.o_store_id,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'quantity', 1, 'unit_price', v_product.price
    )),
    p_payment_method,
    p_payment_split,
    'POS-TG-' || upper(substr(replace(v_draft.id::text, '-', ''), 1, 10))
  );

  RETURN jsonb_build_object(
    'changed', true, 'draft_id', v_draft.id, 'product_name', v_product.name,
    'price', v_product.price, 'payment_method', p_payment_method,
    'payment_split', p_payment_split
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb) TO service_role;

-- 3. Mise à jour de telegram_staff_sale_draft_set_customer pour renvoyer payment_split
CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_set_customer(
  p_telegram_user_id text,
  p_draft_id uuid,
  p_customer_name text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_name text := nullif(trim(coalesce(p_customer_name, '')), '');
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_name IS NULL OR length(v_name) > 60 OR coalesce(p_customer_phone, '') !~ '^6[0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid customer' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_draft FROM public.telegram_sale_drafts
  WHERE id = p_draft_id AND telegram_user_id = p_telegram_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_draft.status <> 'draft' THEN
    RETURN jsonb_build_object('changed', false, 'reason', v_draft.status, 'order_id', v_draft.order_id);
  END IF;
  IF v_draft.expires_at < now() THEN RETURN jsonb_build_object('changed', false, 'reason', 'expired'); END IF;

  UPDATE public.telegram_sale_drafts
  SET customer_name = v_name, customer_phone = p_customer_phone, updated_at = now()
  WHERE id = v_draft.id;

  RETURN jsonb_build_object(
    'changed', true, 'draft_id', v_draft.id, 'lines', v_draft.lines,
    'payment_method', v_draft.payment_method, 'payment_split', v_draft.payment_split,
    'discount_amount', v_draft.discount_amount,
    'customer_name', v_name, 'customer_phone', p_customer_phone
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) TO service_role;

-- 4. Mise à jour de telegram_staff_complete_sale avec écriture dans order_payments
CREATE OR REPLACE FUNCTION public.telegram_staff_complete_sale(
  p_telegram_user_id text,
  p_draft_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_line jsonb;
  v_price numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_res jsonb;
  v_store_name text;
  v_split_elem jsonb;
  v_ch1 text;
  v_ch2 text;
  v_amt1 numeric;
  v_amt2 numeric;
  v_pay_detail text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);

  SELECT * INTO v_draft FROM public.telegram_sale_drafts
  WHERE id = p_draft_id AND telegram_user_id = p_telegram_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_draft.status = 'completed' THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'completed', 'order_id', v_draft.order_id);
  END IF;
  IF v_draft.status <> 'draft' THEN RETURN jsonb_build_object('changed', false, 'reason', v_draft.status); END IF;
  IF v_draft.expires_at < now() THEN RETURN jsonb_build_object('changed', false, 'reason', 'expired'); END IF;
  IF v_actor.o_store_id IS DISTINCT FROM v_draft.store_id THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;
  IF v_draft.customer_name IS NULL OR v_draft.customer_phone IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_customer');
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_draft.lines)
  LOOP
    SELECT p.price INTO v_price FROM public.products p WHERE p.id = v_line->>'product_id';
    IF v_price IS DISTINCT FROM (v_line->>'unit_price')::numeric THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'price_changed');
    END IF;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', v_line->>'product_id', 'name', v_line->>'name',
      'price', v_price, 'quantity', (v_line->>'quantity')::int
    ));
    v_subtotal := v_subtotal + v_price * (v_line->>'quantity')::int;
  END LOOP;
  v_total := v_subtotal - v_draft.discount_amount;

  -- Validation stricte du paiement mixte
  IF v_draft.payment_method = 'MIXED' THEN
    IF v_draft.payment_split IS NULL OR jsonb_typeof(v_draft.payment_split) <> 'array'
       OR jsonb_array_length(v_draft.payment_split) <> 2 THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
    v_ch1 := lower(trim(coalesce(v_draft.payment_split->0->>'channel', '')));
    v_ch2 := lower(trim(coalesce(v_draft.payment_split->1->>'channel', '')));
    IF v_ch1 NOT IN ('cash', 'om', 'momo') OR v_ch2 NOT IN ('cash', 'om', 'momo') OR v_ch1 = v_ch2 THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
    v_amt1 := (v_draft.payment_split->0->>'amount')::numeric;
    v_amt2 := (v_draft.payment_split->1->>'amount')::numeric;
    IF v_amt1 IS NULL OR v_amt2 IS NULL OR v_amt1 <= 0 OR v_amt2 <= 0
       OR round(v_amt1) <> v_amt1 OR round(v_amt2) <> v_amt2
       OR (v_amt1 + v_amt2) <> v_total THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
  END IF;

  -- _pos_sale_core signale un échec par success=false sans lever : on lève pour annuler
  -- toute écriture partielle (stock) avant de rendre la raison au bot.
  BEGIN
    v_res := public._pos_sale_core(
      v_draft.order_id, v_draft.customer_name, NULL, v_draft.customer_phone,
      'Retrait Boutique (POS)', 'pickup', v_draft.payment_method, v_total, v_items,
      now()::text, 'delivered', v_draft.store_id, v_actor.o_staff_id, v_draft.discount_amount
    );
    IF coalesce((v_res->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = coalesce(v_res->>'error', 'Vente refusée');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'sale_failed', 'error', SQLERRM);
  END;

  -- Enregistrement déterministe dans order_payments pour les ventes bot
  IF v_draft.payment_method = 'MIXED' THEN
    FOR v_split_elem IN SELECT value FROM jsonb_array_elements(v_draft.payment_split)
    LOOP
      INSERT INTO public.order_payments (
        order_id, reference, provider, amount, currency, channel, status, paid_at, staff_id
      ) VALUES (
        v_draft.order_id,
        'POS-' || v_draft.order_id || '-' || lower(trim(v_split_elem->>'channel')),
        'pos',
        (v_split_elem->>'amount')::numeric,
        'XAF',
        lower(trim(v_split_elem->>'channel')),
        'paid',
        now(),
        v_actor.o_staff_id
      )
      ON CONFLICT (reference) DO NOTHING;
    END LOOP;
  ELSE
    INSERT INTO public.order_payments (
      order_id, reference, provider, amount, currency, channel, status, paid_at, staff_id
    ) VALUES (
      v_draft.order_id,
      'POS-' || v_draft.order_id || '-' || lower(v_draft.payment_method),
      'pos',
      v_total,
      'XAF',
      lower(v_draft.payment_method),
      'paid',
      now(),
      v_actor.o_staff_id
    )
    ON CONFLICT (reference) DO NOTHING;
  END IF;

  UPDATE public.telegram_sale_drafts SET status = 'completed', updated_at = now() WHERE id = v_draft.id;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id, 'sale.complete', v_draft.order_id);

  SELECT st.name INTO v_store_name FROM public.stores st WHERE st.id = v_draft.store_id;

  IF v_draft.payment_method = 'MIXED' THEN
    v_pay_detail := 'Mixte (' || (
      SELECT string_agg(
        CASE lower(trim(e->>'channel')) WHEN 'cash' THEN 'Espèces ' WHEN 'om' THEN 'OM ' WHEN 'momo' THEN 'MoMo ' ELSE lower(trim(e->>'channel')) || ' ' END ||
        to_char((e->>'amount')::numeric, 'FM999G999G999'),
        ' + '
      )
      FROM jsonb_array_elements(v_draft.payment_split) e
    ) || ')';
  ELSE
    v_pay_detail := CASE v_draft.payment_method
      WHEN 'CASH' THEN 'Espèces'
      WHEN 'OM' THEN 'Orange Money'
      WHEN 'MOMO' THEN 'MTN MoMo'
      ELSE v_draft.payment_method
    END;
  END IF;

  INSERT INTO public.admin_notifications (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
  VALUES (
    'pos_sale.' || v_draft.order_id, 'pos_sale', 'Vente comptoir',
    format('%s — %s FCFA — %s — %s',
      (SELECT string_agg(l->>'name', ', ') FROM jsonb_array_elements(v_draft.lines) l),
      to_char(v_total, 'FM999G999G999'),
      v_pay_detail,
      coalesce(v_store_name, 'Boutique')),
    'orders', v_draft.order_id, 'telegram'
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN jsonb_build_object(
    'changed', true, 'order_id', v_draft.order_id, 'total', v_total,
    'customer_name', v_draft.customer_name, 'payment_method', v_draft.payment_method,
    'payment_split', v_draft.payment_split
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_complete_sale(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_complete_sale(text, uuid) TO service_role;

-- 5. Mise à jour de telegram_staff_cash_report_init : ventilation espèces vs mobile & clés réelles
CREATE OR REPLACE FUNCTION public.telegram_staff_cash_report_init(
  p_telegram_user_id text,
  p_store_code text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Ventes comptoir du jour pour cette boutique avec ventilation espèces vs mobile
  WITH sales_base AS (
    SELECT
      o.id AS order_id,
      coalesce((
        SELECT string_agg(coalesce(i->>'name', 'Article'), ', ')
        FROM jsonb_array_elements(o.items) i
      ), 'Vente comptoir') AS product_name,
      o.total AS total_amount,
      o.staff_id AS seller_id,
      s.name AS seller_name,
      o.payment_method,
      o.date,
      -- Part espèces :
      coalesce(
        (SELECT sum(op.amount) FROM public.order_payments op WHERE op.order_id = o.id AND op.channel = 'cash' AND op.status = 'paid'),
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.order_payments op2 WHERE op2.order_id = o.id) AND o.payment_method = 'CASH' THEN o.total ELSE 0 END
      ) AS cash_amount,
      -- Part mobile :
      coalesce(
        (SELECT sum(op.amount) FROM public.order_payments op WHERE op.order_id = o.id AND op.channel IN ('om', 'momo') AND op.status = 'paid'),
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.order_payments op2 WHERE op2.order_id = o.id) AND o.payment_method IN ('OM', 'MOMO') THEN o.total ELSE 0 END
      ) AS mobile_amount
    FROM public.orders_reportable o
    LEFT JOIN public.staff s ON s.id = o.staff_id
    WHERE o.store_id = v_store.id
      AND o.date >= v_day_start AND o.date < v_day_end
      AND o.delivery_mode = 'pos'
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'order_id', sb.order_id,
    'product_name', sb.product_name,
    'label', sb.product_name,
    'amount', sb.total_amount,
    'cash_amount', sb.cash_amount,
    'mobile_amount', sb.mobile_amount,
    'seller_id', sb.seller_id,
    'seller_name', sb.seller_name,
    'salesperson_name', sb.seller_name,
    'payment_method', sb.payment_method
  ) ORDER BY sb.date ASC), '[]'::jsonb)
  INTO v_today_pos
  FROM sales_base sb;

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
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_cash_report_init(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_cash_report_init(text, text) TO service_role;

COMMIT;

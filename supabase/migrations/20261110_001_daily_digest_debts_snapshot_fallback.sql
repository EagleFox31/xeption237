-- Migration 20261110_001_daily_digest_debts_snapshot_fallback.sql
-- Bilan journalier : repli des « Dettes en cours » sur le debts_snapshot du dernier rapport de caisse.
--
-- Contexte : notify_daily_digest (20261107_001) ne lisait que public.store_debts (dettes saisies via le
-- bot caisse). Les dettes des rapports WhatsApp importés (scripts/import-whatsapp-cash-reports.mjs) vivent
-- dans store_cash_reports.debts_snapshot et n'apparaissaient donc jamais dans le bilan.
--
-- Règle : pour chaque boutique, si aucune dette ouverte (active/partial) n'existe dans store_debts, le
-- bilan compte les entrées du debts_snapshot (reste > 0) du dernier rapport daté <= jour du bilan et
-- précise la date de ce rapport. Dès que le bot suit une dette pour la boutique, store_debts prime
-- (pas de cumul des deux sources). Le reste de la fonction est inchangé.
--
-- Idempotente : CREATE OR REPLACE ; privilèges réaffirmés ; le job pg_cron existant est conservé.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_daily_digest(p_day date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_timezone            constant text   := 'Africa/Douala';
  v_event_type          constant text   := 'daily_digest';
  v_dedup_prefix        constant text   := 'daily_digest';
  v_target_role         constant text   := 'responsable';
  v_link_to_tab         constant text   := 'analytics';
  v_created_by          constant text   := 'cron';
  v_payment_paid_status constant text   := 'paid';
  v_unknown_channel     constant text   := 'autre';
  v_troc_open_statuses  constant text[] := ARRAY['pending', 'accepted', 'contacted', 'appointment'];
  v_debt_open_statuses  constant text[] := ARRAY['active', 'partial'];
  v_snapshot_remaining_key constant text := 'remaining';
  v_target_kinds        constant text[] := ARRAY['daily', 'weekly', 'monthly'];
  v_line_separator      constant text   := E'\n';
  v_channel_separator   constant text   := ' · ';

  v_day              date;
  v_from             timestamptz;
  v_to               timestamptz;
  v_week_from        timestamptz;
  v_month_from       timestamptz;
  v_default_store_id uuid;
  v_troc_pending     integer := 0;
  v_inserted         integer := 0;
  v_count            integer := 0;

  r                  record;
  v_sales_count      integer;
  v_sales_total      numeric;
  v_channels         text;
  v_closing_cash     numeric;
  v_cash_line        text;
  v_debt_count       integer;
  v_debt_remaining   numeric;
  v_debt_line        text;
  v_debt_report_date date;
  v_kind             text;
  v_period_from      timestamptz;
  v_target_amount    numeric;
  v_period_actual    numeric;
  v_target_lines     text[];
  v_message          text;
BEGIN
  -- Journée au fuseau de la boutique (pas d'heure d'été à Douala)
  v_day        := coalesce(p_day, (now() AT TIME ZONE v_timezone)::date);
  v_from       := v_day::timestamp AT TIME ZONE v_timezone;
  v_to         := (v_day + 1)::timestamp AT TIME ZONE v_timezone;
  v_week_from  := date_trunc('week', v_day::timestamp) AT TIME ZONE v_timezone;
  v_month_from := date_trunc('month', v_day::timestamp) AT TIME ZONE v_timezone;

  -- Commandes sans boutique (site web) : rattachées à la boutique par défaut
  SELECT s.id INTO v_default_store_id FROM public.stores s WHERE s.is_default LIMIT 1;

  -- Les trocs n'ont pas de boutique : compteur global, répété dans chaque bilan
  SELECT count(*) INTO v_troc_pending
  FROM public.trade_in_requests t
  WHERE t.status = ANY (v_troc_open_statuses);

  FOR r IN SELECT s.id, s.code, s.name FROM public.stores s WHERE s.active ORDER BY s.code LOOP
    -- 1. Ventes du jour (CA encaissé, hors tests et annulations : vue orders_reportable)
    SELECT count(*), coalesce(sum(o.total), 0)
      INTO v_sales_count, v_sales_total
    FROM public.orders_reportable o
    WHERE coalesce(o.store_id, v_default_store_id) = r.id
      AND o.date >= v_from AND o.date < v_to;

    -- 2. Répartition par canal : order_payments payés, sinon repli sur orders.payment_method
    WITH today AS (
      SELECT o.id, o.total, o.payment_method
      FROM public.orders_reportable o
      WHERE coalesce(o.store_id, v_default_store_id) = r.id
        AND o.date >= v_from AND o.date < v_to
    ), payments AS (
      SELECT lower(trim(op.channel)) AS channel, op.amount
      FROM today o
      JOIN public.order_payments op ON op.order_id = o.id AND op.status = v_payment_paid_status
      UNION ALL
      SELECT lower(trim(coalesce(nullif(o.payment_method, ''), v_unknown_channel))), o.total
      FROM today o
      WHERE NOT EXISTS (
        SELECT 1 FROM public.order_payments op
        WHERE op.order_id = o.id AND op.status = v_payment_paid_status
      )
    ), by_channel AS (
      SELECT
        CASE p.channel
          WHEN 'cash'   THEN 'Espèces'
          WHEN 'om'     THEN 'OM'
          WHEN 'momo'   THEN 'MoMo'
          WHEN 'campay' THEN 'Campay'
          ELSE initcap(p.channel)
        END AS label,
        sum(p.amount) AS amount
      FROM payments p
      GROUP BY p.channel
    )
    SELECT string_agg(format('%s %s FCFA', c.label, public._format_xaf(c.amount)), v_channel_separator ORDER BY c.amount DESC)
      INTO v_channels
    FROM by_channel c;

    -- 3. Caisse clôturée ?
    SELECT c.closing_cash INTO v_closing_cash
    FROM public.store_cash_reports c
    WHERE c.store_id = r.id AND c.report_date = v_day
    LIMIT 1;
    IF FOUND THEN
      v_cash_line := format('Caisse : clôturée (%s FCFA en caisse)', public._format_xaf(v_closing_cash));
    ELSE
      v_cash_line := 'Caisse : non clôturée';
    END IF;

    -- 4. Dettes en cours (agrégat sans données client)
    --    Source 1 : dettes ouvertes suivies par le bot (store_debts).
    --    Repli    : debts_snapshot du dernier rapport de caisse du magasin (import WhatsApp),
    --               tant que le bot ne suit aucune dette pour ce magasin.
    v_debt_report_date := NULL;
    SELECT count(d.id), coalesce(sum(d.amount_due - d.amount_paid), 0)
      INTO v_debt_count, v_debt_remaining
    FROM public.store_debts d
    WHERE d.store_id = r.id AND d.status = ANY (v_debt_open_statuses);
    IF v_debt_count = 0 THEN
      SELECT last_report.report_date,
             count(e),
             coalesce(sum((e ->> v_snapshot_remaining_key)::numeric), 0)
        INTO v_debt_report_date, v_debt_count, v_debt_remaining
      FROM (
        SELECT c.report_date, c.debts_snapshot
        FROM public.store_cash_reports c
        WHERE c.store_id = r.id AND c.report_date <= v_day
        ORDER BY c.report_date DESC
        LIMIT 1
      ) last_report
      LEFT JOIN LATERAL jsonb_array_elements(coalesce(last_report.debts_snapshot, '[]'::jsonb)) e
        ON coalesce((e ->> v_snapshot_remaining_key)::numeric, 0) > 0
      GROUP BY last_report.report_date;
      v_debt_count := coalesce(v_debt_count, 0);
      v_debt_remaining := coalesce(v_debt_remaining, 0);
    END IF;
    IF v_debt_count > 0 THEN
      v_debt_line := format('Dettes en cours : %s · %s FCFA restants', v_debt_count, public._format_xaf(v_debt_remaining));
      IF v_debt_report_date IS NOT NULL THEN
        v_debt_line := v_debt_line || format(' (rapport du %s)', to_char(v_debt_report_date, 'DD/MM'));
      END IF;
    ELSE
      v_debt_line := 'Dettes en cours : aucune';
    END IF;

    -- 5. Objectifs boutique (jour / semaine / mois), CA cumulé jusqu'à la fin de la journée
    v_target_lines := ARRAY[]::text[];
    FOREACH v_kind IN ARRAY v_target_kinds LOOP
      SELECT t.target_amount INTO v_target_amount
      FROM public.sales_targets t
      WHERE t.scope_type = 'store' AND t.store_id = r.id AND t.period_kind = v_kind AND t.active
      ORDER BY t.updated_at DESC
      LIMIT 1;
      IF FOUND AND v_target_amount > 0 THEN
        v_period_from := CASE v_kind WHEN 'daily' THEN v_from WHEN 'weekly' THEN v_week_from ELSE v_month_from END;
        SELECT coalesce(sum(o.total), 0) INTO v_period_actual
        FROM public.orders_reportable o
        WHERE coalesce(o.store_id, v_default_store_id) = r.id
          AND o.date >= v_period_from AND o.date < v_to;
        v_target_lines := v_target_lines || format('Objectif %s : %s / %s FCFA (%s %%)',
          CASE v_kind WHEN 'daily' THEN 'jour' WHEN 'weekly' THEN 'semaine' ELSE 'mois' END,
          public._format_xaf(v_period_actual),
          public._format_xaf(v_target_amount),
          round(v_period_actual / v_target_amount * 100));
      END IF;
    END LOOP;
    IF coalesce(array_length(v_target_lines, 1), 0) = 0 THEN
      v_target_lines := ARRAY['Objectifs : aucun objectif boutique défini'];
    END IF;

    v_message := array_to_string(ARRAY[
      format('Journée du %s', to_char(v_day, 'DD/MM/YYYY')),
      format('Ventes : %s · %s FCFA', v_sales_count, public._format_xaf(v_sales_total)),
      format('Canaux : %s', coalesce(v_channels, 'aucun encaissement')),
      v_cash_line,
      v_debt_line,
      format('Trocs en attente (toutes boutiques) : %s', v_troc_pending)
    ] || v_target_lines, v_line_separator);

    INSERT INTO public.admin_notifications (
      dedup_key,
      event_type,
      title,
      message,
      link_to_tab,
      link_to_id,
      target_role,
      created_by
    )
    VALUES (
      format('%s.%s.%s', v_dedup_prefix, r.code, to_char(v_day, 'YYYY-MM-DD')),
      v_event_type,
      format('📅 Bilan du jour — %s', r.name),
      v_message,
      v_link_to_tab,
      NULL, -- link_to_id (pas d'élément unique à ouvrir)
      v_target_role,
      v_created_by
    )
    ON CONFLICT (dedup_key) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_inserted := v_inserted + v_count;
  END LOOP;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.notify_daily_digest(date) IS
  'Bilan journalier par boutique active vers admin_notifications (daily_digest, dedup par boutique et jour Africa/Douala). Dettes : store_debts, sinon debts_snapshot du dernier rapport de caisse. Service-role / pg_cron seulement.';

REVOKE ALL ON FUNCTION public.notify_daily_digest(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_daily_digest(date) TO service_role;

COMMIT;

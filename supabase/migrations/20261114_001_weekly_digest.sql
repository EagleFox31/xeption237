-- Migration 20261114_001_weekly_digest.sql
-- Bilan hebdomadaire consolidé (toutes boutiques) à partir des rapports de caisse.
--
-- Contexte : le bilan journalier (notify_daily_digest) existe par boutique, mais la direction n'avait
-- aucune vue de la semaine. Le format a été validé par la direction sur un envoi de test (groupe test).
--
-- Contenu (une seule notification pour toutes les boutiques) :
--   - par boutique ayant au moins un rapport : entrées, sorties, dont remis au boss, caisse du dernier
--     soir, meilleur jour ;
--   - total semaine (à partir de deux boutiques) ;
--   - dettes clients : agrégat (montant, nombre, évolution sur la semaine), jamais de donnée client ;
--   - à noter : écart clôture/ouverture, clôture incohérente, journée sans entrée, rapport manquant.
--
-- Semaine ISO (lundi-dimanche) contenant p_day ; par défaut la veille (heure de Douala), donc le job du
-- lundi matin couvre la semaine qui vient de finir. Les rapports arrivent après 20 h : un envoi le
-- samedi soir laisserait la journée du samedi incomplète (voir ADR 2026-11-14-weekly-digest).
--
-- Idempotente : CREATE OR REPLACE, dedup par semaine (ON CONFLICT DO NOTHING), job pg_cron recréé.
-- Lecture seule sur les données métier : seule admin_notifications reçoit une ligne.

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_weekly_digest(p_day date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_timezone               constant text   := 'Africa/Douala';
  v_event_type             constant text   := 'weekly_digest';
  v_dedup_prefix           constant text   := 'weekly_digest';
  v_target_role            constant text   := 'responsable';
  v_link_to_tab            constant text   := 'analytics';
  v_created_by             constant text   := 'cron';
  -- Sorties « remis au boss » : libellé saisi librement par la boutique
  v_boss_label_pattern     constant text   := '%boss%';
  -- Jours où un rapport de caisse est attendu (ISO : 1 = lundi … 7 = dimanche)
  v_report_isodows         constant int[]  := ARRAY[1, 2, 3, 4, 5, 6];
  -- Index = jour ISO
  v_day_names              constant text[] := ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  v_debt_open_statuses     constant text[] := ARRAY['active', 'partial'];
  v_amount_key             constant text   := 'amount';
  v_label_key              constant text   := 'label';
  v_snapshot_remaining_key constant text   := 'remaining';
  v_numeric_pattern        constant text   := '^-?[0-9]+(\.[0-9]+)?$';
  v_total_min_stores       constant int    := 2;
  v_week_length_days       constant int    := 7;
  v_currency               constant text   := 'F';
  v_nothing_to_report      constant text   := 'Rien à signaler.';
  v_no_report_week         constant text   := 'Aucun rapport de caisse reçu cette semaine.';
  v_bullet                 constant text   := '- ';
  v_line_separator         constant text   := E'\n';
  v_block_separator        constant text   := E'\n\n';

  v_day          date;
  v_week_start   date;
  v_week_end     date;
  v_last_day     date;
  v_store_count  integer := 0;
  v_tot_in       numeric := 0;
  v_tot_out      numeric := 0;
  v_tot_boss     numeric := 0;
  v_blocks       text[]  := ARRAY[]::text[];
  v_debt_lines   text[]  := ARRAY[]::text[];
  v_notes        text[]  := ARRAY[]::text[];
  v_sections     text[];
  v_count        integer := 0;

  r              record;
  d              record;
  v_lines        text[];
  v_in           numeric;
  v_out          numeric;
  v_boss         numeric;
  v_last_date    date;
  v_last_closing numeric;
  v_best_date    date;
  v_best_amount  numeric;
  v_expected     date;
  v_missing      text[];
  v_no_inflow    text[];
  v_gap          numeric;
  v_debt_count   integer;
  v_debt_total   numeric;
  v_prev_total   numeric;
  v_from_bot     boolean;
  v_delta        numeric;
  v_delta_text   text;
BEGIN
  v_day        := coalesce(p_day, (now() AT TIME ZONE v_timezone)::date - 1);
  v_week_start := date_trunc('week', v_day::timestamp)::date;
  v_week_end   := v_week_start + (v_week_length_days - 1);
  -- Exécution manuelle en cours de semaine : on ne réclame pas les jours à venir
  v_last_day   := least(v_week_end, v_day);

  FOR r IN
    SELECT s.id, s.code, s.name
    FROM public.stores s
    WHERE s.active
      AND EXISTS (
        SELECT 1 FROM public.store_cash_reports c
        WHERE c.store_id = s.id AND c.report_date BETWEEN v_week_start AND v_last_day
      )
    ORDER BY s.code
  LOOP
    v_store_count := v_store_count + 1;

    -- 1. Entrées et sorties déclarées
    SELECT coalesce(sum(c.total_inflow), 0), coalesce(sum(c.total_outflow), 0)
      INTO v_in, v_out
    FROM public.store_cash_reports c
    WHERE c.store_id = r.id AND c.report_date BETWEEN v_week_start AND v_last_day;

    -- 2. Dont remis au boss (lignes de sortie dont le libellé le mentionne)
    SELECT coalesce(sum((i ->> v_amount_key)::numeric), 0)
      INTO v_boss
    FROM public.store_cash_reports c
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(c.outflow_items) = 'array' THEN c.outflow_items ELSE '[]'::jsonb END
    ) AS i
    WHERE c.store_id = r.id
      AND c.report_date BETWEEN v_week_start AND v_last_day
      AND (i ->> v_label_key) ILIKE v_boss_label_pattern
      AND (i ->> v_amount_key) ~ v_numeric_pattern;

    -- 3. Caisse du dernier soir et meilleur jour
    SELECT c.report_date, c.closing_cash INTO v_last_date, v_last_closing
    FROM public.store_cash_reports c
    WHERE c.store_id = r.id AND c.report_date BETWEEN v_week_start AND v_last_day
    ORDER BY c.report_date DESC
    LIMIT 1;

    SELECT c.report_date, c.total_inflow INTO v_best_date, v_best_amount
    FROM public.store_cash_reports c
    WHERE c.store_id = r.id AND c.report_date BETWEEN v_week_start AND v_last_day
      AND c.total_inflow > 0
    ORDER BY c.total_inflow DESC, c.report_date
    LIMIT 1;
    IF NOT FOUND THEN v_best_date := NULL; END IF;

    v_lines := ARRAY[
      format('*%s*', r.name),
      format('Entrées : %s %s', public._format_xaf(v_in), v_currency),
      format('Sorties : %s %s', public._format_xaf(v_out), v_currency)
    ];
    IF v_boss > 0 THEN
      v_lines := v_lines || format('Dont remis au boss : %s %s', public._format_xaf(v_boss), v_currency);
    END IF;
    IF v_last_closing IS NOT NULL THEN
      v_lines := v_lines || format('Caisse %s soir : %s %s',
        v_day_names[extract(isodow FROM v_last_date)::int], public._format_xaf(v_last_closing), v_currency);
    END IF;
    IF v_best_date IS NOT NULL THEN
      v_lines := v_lines || format('Meilleur jour : %s, %s %s',
        v_day_names[extract(isodow FROM v_best_date)::int], public._format_xaf(v_best_amount), v_currency);
    END IF;
    v_blocks := v_blocks || array_to_string(v_lines, v_line_separator);

    v_tot_in   := v_tot_in + v_in;
    v_tot_out  := v_tot_out + v_out;
    v_tot_boss := v_tot_boss + v_boss;

    -- 4. Contrôles de cohérence, rapport par rapport (le précédent peut dater de la semaine d'avant)
    v_no_inflow := ARRAY[]::text[];
    FOR d IN
      SELECT x.*
      FROM (
        SELECT c.report_date, c.opening_cash, c.closing_cash, c.total_inflow, c.total_outflow,
               lag(c.closing_cash) OVER w AS prev_closing,
               lag(c.report_date)  OVER w AS prev_date
        FROM public.store_cash_reports c
        WHERE c.store_id = r.id
          AND c.report_date BETWEEN v_week_start - v_week_length_days AND v_last_day
        WINDOW w AS (ORDER BY c.report_date)
      ) x
      WHERE x.report_date >= v_week_start
      ORDER BY x.report_date
    LOOP
      IF d.prev_closing IS NOT NULL AND d.opening_cash IS NOT NULL AND d.opening_cash <> d.prev_closing THEN
        v_notes := v_notes || format('Écart de %s %s à %s entre la clôture du %s %s et l''ouverture du %s %s.',
          public._format_xaf(abs(d.opening_cash - d.prev_closing)), v_currency, r.name,
          v_day_names[extract(isodow FROM d.prev_date)::int], to_char(d.prev_date, 'DD/MM'),
          v_day_names[extract(isodow FROM d.report_date)::int], to_char(d.report_date, 'DD/MM'));
      END IF;
      IF d.opening_cash IS NOT NULL AND d.closing_cash IS NOT NULL THEN
        v_gap := d.opening_cash + coalesce(d.total_inflow, 0) - coalesce(d.total_outflow, 0) - d.closing_cash;
        IF v_gap <> 0 THEN
          v_notes := v_notes || format('%s, %s %s : la clôture ne correspond pas aux mouvements (écart de %s %s).',
            r.name, v_day_names[extract(isodow FROM d.report_date)::int], to_char(d.report_date, 'DD/MM'),
            public._format_xaf(abs(v_gap)), v_currency);
        END IF;
      END IF;
      IF coalesce(d.total_inflow, 0) = 0 THEN
        v_no_inflow := v_no_inflow || v_day_names[extract(isodow FROM d.report_date)::int];
      END IF;
    END LOOP;
    IF coalesce(array_length(v_no_inflow, 1), 0) > 0 THEN
      v_notes := v_notes || format('%s : aucune entrée %s.', r.name, array_to_string(v_no_inflow, ', '));
    END IF;

    -- 5. Rapports manquants sur les jours attendus
    v_missing := ARRAY[]::text[];
    FOR v_expected IN
      SELECT g::date FROM generate_series(v_week_start, v_last_day, interval '1 day') AS g
    LOOP
      IF extract(isodow FROM v_expected)::int = ANY (v_report_isodows)
         AND NOT EXISTS (
           SELECT 1 FROM public.store_cash_reports c
           WHERE c.store_id = r.id AND c.report_date = v_expected
         ) THEN
        v_missing := v_missing || v_day_names[extract(isodow FROM v_expected)::int];
      END IF;
    END LOOP;
    IF coalesce(array_length(v_missing, 1), 0) > 0 THEN
      v_notes := v_notes || format('%s : pas de rapport %s.', r.name, array_to_string(v_missing, ', '));
    END IF;

    -- 6. Dettes clients (agrégat) : store_debts prime ; sinon debts_snapshot du dernier rapport
    SELECT count(sd.id), coalesce(sum(sd.amount_due - sd.amount_paid), 0)
      INTO v_debt_count, v_debt_total
    FROM public.store_debts sd
    WHERE sd.store_id = r.id AND sd.status = ANY (v_debt_open_statuses);
    v_from_bot := v_debt_count > 0;
    v_prev_total := NULL;

    IF NOT v_from_bot THEN
      SELECT count(e), coalesce(sum((e ->> v_snapshot_remaining_key)::numeric), 0)
        INTO v_debt_count, v_debt_total
      FROM (
        SELECT c.debts_snapshot FROM public.store_cash_reports c
        WHERE c.store_id = r.id AND c.report_date BETWEEN v_week_start AND v_last_day
        ORDER BY c.report_date DESC LIMIT 1
      ) last_report
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(last_report.debts_snapshot) = 'array' THEN last_report.debts_snapshot ELSE '[]'::jsonb END
      ) AS e
      WHERE (e ->> v_snapshot_remaining_key) ~ v_numeric_pattern
        AND (e ->> v_snapshot_remaining_key)::numeric > 0;

      -- Évolution : dernier rapport avant la semaine (même source, sinon pas de comparaison)
      SELECT coalesce(sum((e ->> v_snapshot_remaining_key)::numeric), 0)
        INTO v_prev_total
      FROM (
        SELECT c.debts_snapshot FROM public.store_cash_reports c
        WHERE c.store_id = r.id AND c.report_date < v_week_start
        ORDER BY c.report_date DESC LIMIT 1
      ) prev_report
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(prev_report.debts_snapshot) = 'array' THEN prev_report.debts_snapshot ELSE '[]'::jsonb END
      ) AS e
      WHERE (e ->> v_snapshot_remaining_key) ~ v_numeric_pattern
        AND (e ->> v_snapshot_remaining_key)::numeric > 0;
      IF NOT EXISTS (
        SELECT 1 FROM public.store_cash_reports c WHERE c.store_id = r.id AND c.report_date < v_week_start
      ) THEN
        v_prev_total := NULL;
      END IF;
    END IF;

    IF v_debt_count > 0 THEN
      v_delta_text := NULL;
      IF v_prev_total IS NOT NULL THEN
        v_delta := v_debt_total - v_prev_total;
        v_delta_text := CASE
          WHEN v_delta = 0 THEN 'stable'
          WHEN v_delta > 0 THEN format('+%s %s sur la semaine', public._format_xaf(v_delta), v_currency)
          ELSE format('-%s %s sur la semaine', public._format_xaf(abs(v_delta)), v_currency)
        END;
        IF v_delta > 0 THEN
          v_notes := v_notes || format('Dettes %s en hausse : relancer les plus anciennes.', r.name);
        END IF;
      END IF;
      v_debt_lines := v_debt_lines || format('%s : %s %s (%s %s%s)',
        r.name, public._format_xaf(v_debt_total), v_currency, v_debt_count,
        CASE WHEN v_debt_count = 1 THEN 'dette' ELSE 'dettes' END,
        CASE WHEN v_delta_text IS NULL THEN '' ELSE ', ' || v_delta_text END);
    END IF;
  END LOOP;

  -- Assemblage
  v_sections := v_blocks;
  IF v_store_count >= v_total_min_stores THEN
    v_sections := v_sections || format(E'*Total semaine*\nEntrées %s %s | Sorties %s %s | Boss %s %s',
      public._format_xaf(v_tot_in), v_currency, public._format_xaf(v_tot_out), v_currency,
      public._format_xaf(v_tot_boss), v_currency);
  END IF;
  IF coalesce(array_length(v_debt_lines, 1), 0) > 0 THEN
    v_sections := v_sections || ('*Dettes clients*' || v_line_separator || array_to_string(v_debt_lines, v_line_separator));
  END IF;
  IF v_store_count = 0 THEN
    v_notes := v_notes || v_no_report_week;
  END IF;
  IF coalesce(array_length(v_notes, 1), 0) = 0 THEN
    v_notes := ARRAY[v_nothing_to_report];
  END IF;
  v_sections := v_sections || ('*À noter*' || v_line_separator || v_bullet
    || array_to_string(v_notes, v_line_separator || v_bullet));

  INSERT INTO public.admin_notifications (
    dedup_key, event_type, title, message, link_to_tab, link_to_id, target_role, created_by
  )
  VALUES (
    format('%s.%s', v_dedup_prefix, to_char(v_week_start, 'IYYY-"W"IW')),
    v_event_type,
    format('Bilan de la semaine du %s au %s', to_char(v_week_start, 'DD/MM'), to_char(v_week_end, 'DD/MM')),
    array_to_string(v_sections, v_block_separator),
    v_link_to_tab,
    NULL, -- pas d'élément unique à ouvrir
    v_target_role,
    v_created_by
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.notify_weekly_digest(date) IS
  'Bilan hebdomadaire consolidé des rapports de caisse vers admin_notifications (weekly_digest, dedup par semaine ISO Africa/Douala). Agrégats seulement, aucune donnée client. Service-role / pg_cron seulement.';

REVOKE ALL ON FUNCTION public.notify_weekly_digest(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_weekly_digest(date) TO service_role;

-- Lundi 08 h à Douala (UTC+1, pas d'heure d'été) = 07 h UTC
DO $$
DECLARE
  c_job_name     constant text := 'weekly-digest-monday';
  c_schedule_utc constant text := '0 7 * * 1';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(j.jobid) FROM cron.job j WHERE j.jobname = c_job_name;
    PERFORM cron.schedule(c_job_name, c_schedule_utc, $cron$SELECT public.notify_weekly_digest();$cron$);
  ELSE
    RAISE NOTICE 'pg_cron absent : job % non planifié', c_job_name;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Planification de % impossible : %', c_job_name, SQLERRM;
END;
$$;

COMMIT;

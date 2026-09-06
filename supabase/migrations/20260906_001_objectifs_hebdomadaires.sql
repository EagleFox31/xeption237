-- Objectifs hebdomadaires
-- Plan : docs/engineering/PLAN_OBJECTIFS_PARAMETRABLES.md
--
-- La direction veut choisir la periode d'un objectif : mensuelle ou
-- hebdomadaire. La table n'acceptait que 'daily' et 'monthly'.

BEGIN;

-- ── 1. Accepter la periode hebdomadaire ──────────────────────────────────────
-- Les deux index uniques portent sur (staff_id, period_kind) et
-- (store_id, period_kind) : un meme vendeur peut donc porter un objectif de
-- chaque periode sans conflit. Rien a changer de ce cote.
ALTER TABLE public.sales_targets
  DROP CONSTRAINT IF EXISTS sales_targets_period_kind_check;

ALTER TABLE public.sales_targets
  ADD CONSTRAINT sales_targets_period_kind_check
  CHECK (period_kind IN ('daily', 'weekly', 'monthly'));

-- ── 2. Bornes de periode : supprimer le repli silencieux ─────────────────────
--
-- ⚠ La version precedente s'ecrivait :
--
--     IF p_kind = 'daily' THEN ... RETURN; END IF;
--     -- sinon : bornes du MOIS
--
-- Sans branche ELSE explicite, TOUTE valeur autre que 'daily' retournait les
-- bornes du mois. Ajouter 'weekly' a la contrainte sans toucher a cette
-- fonction aurait donc compare un objectif de la SEMAINE au chiffre d'affaires
-- du MOIS ENTIER : un vendeur affiche a 400 % de son objectif hebdomadaire, et
-- rien nulle part pour le signaler. Le genre de defaut qu'on decouvre le jour
-- de la paie.
--
-- Desormais : trois branches explicites, et une exception sur toute valeur
-- inconnue. Une periode mal orthographiee doit echouer bruyamment plutot que
-- renvoyer un chiffre plausible.
--
-- Semaine : date_trunc('week') commence le LUNDI (norme ISO), en heure
-- d'Afrique/Douala comme le reste. A rediscuter si la semaine commerciale
-- commence le dimanche.
CREATE OR REPLACE FUNCTION public._period_bounds(p_kind text)
RETURNS TABLE (p_from timestamptz, p_to timestamptz)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  v_local timestamp;
BEGIN
  v_local := now() AT TIME ZONE 'Africa/Douala';

  IF p_kind = 'daily' THEN
    p_from := date_trunc('day', v_local) AT TIME ZONE 'Africa/Douala';
    p_to := (date_trunc('day', v_local) + interval '1 day') AT TIME ZONE 'Africa/Douala';

  ELSIF p_kind = 'weekly' THEN
    p_from := date_trunc('week', v_local) AT TIME ZONE 'Africa/Douala';
    p_to := (date_trunc('week', v_local) + interval '1 week') AT TIME ZONE 'Africa/Douala';

  ELSIF p_kind = 'monthly' THEN
    p_from := date_trunc('month', v_local) AT TIME ZONE 'Africa/Douala';
    p_to := (date_trunc('month', v_local) + interval '1 month') AT TIME ZONE 'Africa/Douala';

  ELSE
    RAISE EXCEPTION 'Periode inconnue : %. Attendu daily, weekly ou monthly.', p_kind;
  END IF;

  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION public._period_bounds(text) FROM PUBLIC, anon, authenticated;

-- ── 3. Progression : ajouter la tranche hebdomadaire ─────────────────────────
--
-- Definition GENEREE a partir de celle deployee, par duplication du bloc mensuel
-- et substitution (v_month_* -> v_week_*, 'monthly' -> 'weekly'). Recopier
-- soixante lignes a la main, c'est se donner une chance d'oublier un
-- `v_month_from` dans le bloc semaine : l'objectif hebdomadaire mesurerait alors
-- le mois, sans que rien ne le signale.
--
-- La generation controle qu'aucune trace de mois ne subsiste dans les blocs
-- semaine et que leurs parentheses s'equilibrent. Elle a d'ailleurs attrape une
-- faute au premier essai : le bloc mensuel des BOUTIQUES est le dernier de son
-- objet et se termine sans virgule ; insere avant lui, le bloc semaine devait en
-- porter une.
--
-- `period` gagne `week_from` / `week_to`, sur le modele de `day_*` et `month_*`.
--
-- Les PRIMES restent calculees sur l'objectif MENSUEL (`monthly_bonuses`
-- inchange). Consequence a connaitre : un vendeur qui n'aurait qu'un objectif
-- hebdomadaire ne declencherait aucune prime. Question ouverte, posee dans
-- docs/engineering/PLAN_OBJECTIFS_PARAMETRABLES.md.

CREATE OR REPLACE FUNCTION public.get_sales_targets_progress(p_staff_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller public.staff%ROWTYPE;
  v_day_from timestamptz;
  v_day_to timestamptz;
  v_week_from timestamptz;
  v_week_to timestamptz;
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
  SELECT b.p_from, b.p_to INTO v_week_from, v_week_to FROM public._period_bounds('weekly') b;
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
      'weekly', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_week_from, v_week_to, s.id, NULL),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_week_from, v_week_to, s.id, NULL) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_week_from, v_week_to, s.id, NULL))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_week_from, v_week_to, s.id, NULL) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'staff'
          AND t.staff_id = s.id
          AND t.period_kind = 'weekly'
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
      'weekly', (
        SELECT jsonb_build_object(
          'target_id', t.id,
          'target_amount', t.target_amount,
          'actual_amount', public._sum_eligible_revenue(v_week_from, v_week_to, NULL, st.id),
          'achievement_percent', CASE
            WHEN t.target_amount IS NULL OR t.target_amount <= 0 THEN NULL
            ELSE ROUND(
              public._sum_eligible_revenue(v_week_from, v_week_to, NULL, st.id) / t.target_amount * 100,
              1
            )
          END,
          'remaining', CASE
            WHEN t.target_amount IS NULL THEN NULL
            ELSE GREATEST(0, t.target_amount - public._sum_eligible_revenue(v_week_from, v_week_to, NULL, st.id))
          END,
          'achieved', CASE
            WHEN t.target_amount IS NULL THEN false
            ELSE public._sum_eligible_revenue(v_week_from, v_week_to, NULL, st.id) >= t.target_amount
          END
        )
        FROM public.sales_targets t
        WHERE t.scope_type = 'store'
          AND t.store_id = st.id
          AND t.period_kind = 'weekly'
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
      'week_from', v_week_from,
      'week_to', v_week_to,
      'month_from', v_month_from,
      'month_to', v_month_to
    ),
    'bonus_rules', v_rules,
    'staff', v_staff,
    'stores', v_stores
  );
END;
$function$;

COMMIT;

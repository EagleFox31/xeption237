-- Migration 20261027_002_notify_time_based_reminders.sql
-- Lot 1 : Rappels automatiques staff liés au temps (pg_cron horaire en journée)
--
-- 1. troc_stale : troc sans contact depuis > 48 h (créé il y a moins de 14 j) -> dedup troc_stale.<id>
-- 2. voucher_expiring : bon troc qui expire dans < 48 h -> dedup voucher_expiring.<id>
-- 3. debt_overdue : résumé par boutique et semaine ISO pour dettes > 7 j -> dedup debt_overdue.<store_id>.<semaine ISO>
--
-- Exécution pg_cron : '0 7-19 * * *' UTC (8 h à 20 h à Douala, UTC+1).

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_time_based_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_troc_stale_threshold   constant interval := interval '48 hours';
  v_troc_stale_max_age     constant interval := interval '14 days';
  v_voucher_warn_threshold constant interval := interval '48 hours';
  v_debt_overdue_threshold constant interval := interval '7 days';
  v_current_iso_week       text;
  v_inserted               integer := 0;
  v_count                  integer := 0;
BEGIN
  -- Semaine ISO au fuseau Africa/Douala (UTC+1, pas d'heure d'été)
  v_current_iso_week := to_char(now() AT TIME ZONE 'Africa/Douala', 'IYYY-"W"IW');

  -- 1. Troc sans contact depuis > 48 h (créé il y a moins de 14 jours, pas d'avalanche)
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
  SELECT
    format('troc_stale.%s', r.id),
    'troc_stale',
    '⏱️ Troc en attente de contact',
    format('%s %s — sans contact depuis > 48 h', coalesce(nullif(r.device_brand, ''), 'Appareil'), coalesce(nullif(r.device_model, ''), '')),
    'troc',
    r.id::text,
    'responsable',
    'cron'
  FROM public.trade_in_requests r
  WHERE r.status IN ('pending', 'accepted')
    AND r.created_at >= now() - v_troc_stale_max_age
    AND coalesce(r.updated_at, r.created_at) < now() - v_troc_stale_threshold
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;

  -- 2. Bon troc expirant dans < 48 h (référence existante, non encore clôturé/annulé/refusé)
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
  SELECT
    format('voucher_expiring.%s', r.id),
    'voucher_expiring',
    '⏳ Bon troc bientôt expiré',
    format('Bon %s (%s) expire le %s',
      r.voucher_reference,
      coalesce(nullif(r.device_model, ''), 'Appareil'),
      to_char(r.voucher_expires_at AT TIME ZONE 'Africa/Douala', 'DD/MM à HH24"h"MI')
    ),
    'troc',
    r.id::text,
    'responsable',
    'cron'
  FROM public.trade_in_requests r
  WHERE r.voucher_reference IS NOT NULL
    AND r.voucher_expires_at IS NOT NULL
    AND r.voucher_expires_at > now()
    AND r.voucher_expires_at <= now() + v_voucher_warn_threshold
    AND r.status NOT IN ('completed', 'cancelled', 'refused')
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;

  -- 3. Dettes anciennes (> 7 jours) résumées par boutique et par semaine ISO (sans données client)
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
  SELECT
    format('debt_overdue.%s.%s', d.store_id, v_current_iso_week),
    'debt_overdue',
    format('📋 Dettes en attente — %s', s.name),
    format('%s dette(s) de plus de 7 j — %s FCFA restants',
      count(d.id),
      trim(to_char(sum(d.amount_due - d.amount_paid), 'FM999 999 999'))
    ),
    NULL, -- link_to_tab (gestion des dettes dans le bot)
    NULL, -- link_to_id
    NULL, -- target_role (visible par tout le staff, direction comprise)
    'cron'
  FROM public.store_debts d
  JOIN public.stores s ON s.id = d.store_id
  WHERE d.status IN ('active', 'partial')
    AND d.created_at <= now() - v_debt_overdue_threshold
  GROUP BY d.store_id, s.name
  HAVING count(d.id) > 0
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;

  RETURN v_inserted;
END;
$$;

-- Restreindre strictement l'accès (SECURITY DEFINER sans ouverture publique)
REVOKE ALL ON FUNCTION public.notify_time_based_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_time_based_reminders() TO service_role;

-- Enregistrement idempotent du job pg_cron (heures de bureau 8h - 20h Douala, soit 7h - 19h UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'time-based-reminders-hourly';

    PERFORM cron.schedule(
      'time-based-reminders-hourly',
      '0 7-19 * * *',
      $cron$SELECT public.notify_time_based_reminders();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMIT;

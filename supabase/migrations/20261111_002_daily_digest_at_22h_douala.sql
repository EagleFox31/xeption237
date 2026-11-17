-- Migration 20261111_002_daily_digest_at_22h_douala.sql
-- Bilan journalier : décalage du cron de 20 h à 22 h (Africa/Douala, UTC+1 sans heure d'été).
--
-- Pourquoi : les rapports de caisse WhatsApp (ADR-002, source whatsapp_live) arrivent en soirée,
-- souvent après 20 h. Le bilan de 20 h les voyait donc « non clôturée ». À 22 h la journée Douala
-- est toujours la même (v_day inchangé) et les rapports du soir sont en base.
-- Idempotent : unschedule par nom puis schedule (même motif que 20261107_001).

BEGIN;

DO $$
DECLARE
  c_job_name     constant text := 'daily-digest-evening';
  c_schedule_utc constant text := '0 21 * * *'; -- 22 h Douala
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = c_job_name;

    PERFORM cron.schedule(
      c_job_name,
      c_schedule_utc,
      $cron$SELECT public.notify_daily_digest();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMIT;

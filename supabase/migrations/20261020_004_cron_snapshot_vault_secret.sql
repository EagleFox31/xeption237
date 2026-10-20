-- Migration : le cron des snapshots de prix lit CRON_SECRET dans Vault
-- Date : 2026-10-20
-- Contexte : 20260615_002 embarquait le secret en clair (dépôt + cron.job). Le secret a été
-- changé (Edge `CRON_SECRET` + Vault `cron_secret`) ; ce job suit désormais le même motif que
-- `notify-staff-every-minute` (20261020_002) : aucun secret dans le SQL.
-- Idempotent : retire puis recrée le job homonyme.

BEGIN;

SELECT cron.unschedule('snapshot-market-prices-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot-market-prices-weekly');

-- Lundi 03:00 (heure serveur), inchangé.
SELECT cron.schedule(
  'snapshot-market-prices-weekly',
  '0 3 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://tawnusmfyvugqczaydat.supabase.co/functions/v1/snapshot-market-prices',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'), '')
    ),
    body    := '{}'::jsonb
  );
  $$
);

COMMIT;

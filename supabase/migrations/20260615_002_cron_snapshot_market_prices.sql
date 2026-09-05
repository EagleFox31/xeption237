-- Migration : planifie le cron hebdomadaire des snapshots de prix
-- Date : 2026-06-15
-- ⚠️ TEMPLATE — remplacer <PROJECT_REF> et <CRON_SECRET> avant exécution dans le SQL Editor.
--    <CRON_SECRET> doit être identique au secret Supabase posé sur la fonction :
--      supabase secrets set CRON_SECRET=<valeur-longue-aleatoire>
--
-- Pré-requis : extensions pg_cron + pg_net activées.
--   Vérifier : select * from pg_extension where extname in ('pg_cron','pg_net');
--   Si le plan Supabase ne permet pas pg_cron → utiliser le fallback GitHub Actions
--   (voir docs/smart-troc/plans/PLAN_CRON_PRICE_SNAPSHOTS.md).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent : on retire un éventuel job homonyme avant de (re)créer.
select cron.unschedule('snapshot-market-prices-weekly')
where exists (select 1 from cron.job where jobname = 'snapshot-market-prices-weekly');

-- Lundi 03:00 (heure serveur). 32 modèles → ~1 min de travail en arrière-plan.
select cron.schedule(
  'snapshot-market-prices-weekly',
  '0 3 * * 1',
  $$
  select net.http_post(
    url     := 'https://tawnusmfyvugqczaydat.supabase.co/functions/v1/snapshot-market-prices',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'bd5c6086e47f4904f629807eb3edc0d3cc5b0bf6aecbbcdac77b637e332994e2'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Vérifier : select jobname, schedule, active from cron.job;

-- Migration : étend les sources autorisées pour market_price_snapshots
-- Date : 2026-06-15
-- Contexte : le cron snapshot-market-prices écrit un prix médian par site marchand
--            (jumia_live existait déjà ; on ajoute glotelho_live, kmerphone_live).
-- À coller dans le SQL Editor Supabase.

BEGIN;

ALTER TABLE public.market_price_snapshots
  DROP CONSTRAINT IF EXISTS market_price_snapshots_source_check;

ALTER TABLE public.market_price_snapshots
  ADD CONSTRAINT market_price_snapshots_source_check
    CHECK (source IN (
      'wayback_jumia',
      'jumia_live',
      'glotelho_live',
      'kmerphone_live',
      'jiji_live',
      'common_crawl',
      'manual'
    ));

COMMIT;

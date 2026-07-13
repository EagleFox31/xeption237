-- Migration : Cote du marché Smart Troc — pipeline cascade
-- Date : 2026-05-16
-- À coller dans le SQL Editor Supabase.
--
-- Tables :
--   • market_price_snapshots  — données prix brutes historiques (Wayback, Jumia live, Common Crawl)
--   • market_demand_signals   — interest scores (Bing Trends, Google Trends)
--   • market_trend_cache      — résultat calculé prêt à servir (TTL 7 jours)
--
-- Lue par : edge function get-market-trend (cascade Wayback → Bing → Google → fallback âge)
-- Consommée par : evaluate-device.marketTrend dans la réponse front

BEGIN;

-- ── Table 1 : snapshots prix bruts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_price_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key     TEXT NOT NULL,
  source        TEXT NOT NULL,
  source_url    TEXT,
  snapshot_date DATE NOT NULL,
  price_xaf     INT  NOT NULL CHECK (price_xaf > 0),
  country_code  TEXT NOT NULL DEFAULT 'CM',
  confidence    NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  raw_payload   JSONB,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_price_snapshots
  DROP CONSTRAINT IF EXISTS market_price_snapshots_source_check;

ALTER TABLE public.market_price_snapshots
  ADD CONSTRAINT market_price_snapshots_source_check
    CHECK (source IN ('wayback_jumia', 'jumia_live', 'jiji_live', 'common_crawl', 'manual'));

CREATE INDEX IF NOT EXISTS idx_price_snapshots_model_date
  ON public.market_price_snapshots (model_key, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_fetched
  ON public.market_price_snapshots (fetched_at DESC);

-- Une même source ne peut écrire qu'un seul snapshot par modèle / date
-- (évite les doublons quand Wayback retourne plusieurs captures le même jour).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_price_snapshots_model_source_date
  ON public.market_price_snapshots (model_key, source, snapshot_date);

ALTER TABLE public.market_price_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_price_snapshots_staff_read" ON public.market_price_snapshots;
CREATE POLICY "market_price_snapshots_staff_read"
  ON public.market_price_snapshots FOR SELECT
  TO authenticated USING (true);

-- ── Table 2 : signaux de demande ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_demand_signals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key      TEXT NOT NULL,
  source         TEXT NOT NULL,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  interest_score INT  NOT NULL CHECK (interest_score >= 0 AND interest_score <= 100),
  country_code   TEXT NOT NULL DEFAULT 'CM',
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_demand_signals
  DROP CONSTRAINT IF EXISTS market_demand_signals_source_check;

ALTER TABLE public.market_demand_signals
  ADD CONSTRAINT market_demand_signals_source_check
    CHECK (source IN ('bing_trends', 'google_trends'));

CREATE INDEX IF NOT EXISTS idx_demand_model_period
  ON public.market_demand_signals (model_key, period_start DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_demand_model_source_period
  ON public.market_demand_signals (model_key, source, period_start);

ALTER TABLE public.market_demand_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_demand_signals_staff_read" ON public.market_demand_signals;
CREATE POLICY "market_demand_signals_staff_read"
  ON public.market_demand_signals FOR SELECT
  TO authenticated USING (true);

-- ── Table 3 : cache du résultat calculé ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_trend_cache (
  model_key       TEXT PRIMARY KEY,
  trend_label     TEXT NOT NULL,
  trend_strength  NUMERIC(3,2) CHECK (trend_strength IS NULL OR (trend_strength >= 0 AND trend_strength <= 1)),
  source_chain    TEXT[]       NOT NULL DEFAULT '{}',
  confidence      NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  message_fr      TEXT,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  raw             JSONB
);

ALTER TABLE public.market_trend_cache
  DROP CONSTRAINT IF EXISTS market_trend_cache_label_check;

ALTER TABLE public.market_trend_cache
  ADD CONSTRAINT market_trend_cache_label_check
    CHECK (trend_label IN ('rising', 'stable', 'falling', 'insufficient_data'));

CREATE INDEX IF NOT EXISTS idx_trend_cache_expires
  ON public.market_trend_cache (expires_at);

ALTER TABLE public.market_trend_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_trend_cache_staff_read" ON public.market_trend_cache;
CREATE POLICY "market_trend_cache_staff_read"
  ON public.market_trend_cache FOR SELECT
  TO authenticated USING (true);

COMMIT;

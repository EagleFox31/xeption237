-- Migration : table market_price_cache
-- Cache persistant des prix de marche (Cameroun) par modele.

CREATE TABLE IF NOT EXISTS market_price_cache (
  model_key        TEXT PRIMARY KEY,
  country_code     TEXT NOT NULL DEFAULT 'CM',
  brand            TEXT NOT NULL,
  model            TEXT NOT NULL,
  storage          TEXT,
  ram              TEXT,
  currency         TEXT NOT NULL DEFAULT 'XAF',
  reference_price  INT  NOT NULL DEFAULT 0 CHECK (reference_price >= 0),
  low_prices       INT[] NOT NULL DEFAULT '{}',
  high_prices      INT[] NOT NULL DEFAULT '{}',
  offers_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_count     INT NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  confidence       NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_market_price_cache_expires
  ON market_price_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_market_price_cache_brand_model
  ON market_price_cache (lower(brand), lower(model));

ALTER TABLE market_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_price_cache_read_all"
  ON market_price_cache FOR SELECT USING (true);

CREATE POLICY "market_price_cache_write_service"
  ON market_price_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- Migration : troc_sessions + colonnes manquantes sur trade_in_requests
-- Objectif : tracer le funnel de conversion Smart Troc step by step.

-- 1. Colonnes manquantes sur trade_in_requests (ajoutées côté types.ts par le front).
ALTER TABLE trade_in_requests
  ADD COLUMN IF NOT EXISTS acquisition_condition      TEXT    CHECK (acquisition_condition IN ('new', 'used')),
  ADD COLUMN IF NOT EXISTS purchase_date              TEXT,   -- format YYYY-MM
  ADD COLUMN IF NOT EXISTS ownership_rank             TEXT    CHECK (ownership_rank IN ('unknown', 'first', 'second', 'third_plus')),
  ADD COLUMN IF NOT EXISTS device_age_months          INT,
  ADD COLUMN IF NOT EXISTS ownership_adjustment_factor NUMERIC(4,3);

-- 2. Table troc_sessions — une ligne par visite sur le formulaire Troc.
-- Aucune PII stockée ici (pas de nom, pas de téléphone).
CREATE TABLE IF NOT EXISTS troc_sessions (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key  TEXT         NOT NULL UNIQUE,           -- UUID généré côté browser (sessionStorage)
  last_step    TEXT         NOT NULL                   -- étape la plus avancée atteinte
                            CHECK (last_step IN ('form', 'photos', 'imei', 'result', 'voucher')),
  device_brand TEXT,                                   -- pour analytics par marque
  device_model TEXT,
  trade_in_id  TEXT         REFERENCES trade_in_requests(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_troc_sessions_step       ON troc_sessions (last_step);
CREATE INDEX IF NOT EXISTS idx_troc_sessions_created_at ON troc_sessions (created_at DESC);

ALTER TABLE troc_sessions ENABLE ROW LEVEL SECURITY;

-- Anon peut insérer/mettre à jour sa propre session (pas de PII → risque faible).
CREATE POLICY "troc_sessions_anon_insert"
  ON troc_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "troc_sessions_anon_update"
  ON troc_sessions FOR UPDATE USING (true);

-- Staff authentifié peut lire toutes les sessions (pour l'admin ERP).
CREATE POLICY "troc_sessions_auth_select"
  ON troc_sessions FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

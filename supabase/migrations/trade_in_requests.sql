-- ============================================================
-- Smart Troc — Table trade_in_requests
-- Xeption Network 237
-- ============================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Création de la table
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_in_requests (

  -- Identifiant unique préfixé
  id                  TEXT PRIMARY KEY DEFAULT 'TRC-' || extract(epoch from now())::bigint::text,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ,

  -- ── Informations client ──────────────────────────────────
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  customer_email      TEXT,

  -- ── Appareil déclaré par l'utilisateur ──────────────────
  device_brand        TEXT NOT NULL,
  device_model        TEXT NOT NULL,
  device_storage      TEXT,        -- '64Go' | '128Go' | '256Go' | '512Go' | '1To'
  device_ram          TEXT,        -- '4Go' | '6Go' | '8Go' | '12Go' | '16Go'
  acquisition_condition TEXT CHECK (acquisition_condition IN ('new', 'used')),
  purchase_date       DATE,
  ownership_rank      TEXT CHECK (ownership_rank IN ('unknown', 'first', 'second', 'third_plus')),
  device_age_months   INT CHECK (device_age_months >= 0),
  ownership_adjustment_factor NUMERIC(4,3) CHECK (ownership_adjustment_factor > 0 AND ownership_adjustment_factor <= 1),
  battery_health      INT CHECK (battery_health BETWEEN 0 AND 100),
  screen_condition    TEXT,        -- 'parfait' | 'micro_rayures' | 'fissure' | 'casse'
  body_condition      TEXT,        -- 'parfait' | 'micro_rayures' | 'rayures' | 'chocs'
  accessories         TEXT[],      -- ['chargeur', 'ecouteurs', 'boite', 'cable']

  -- ── Photos (URLs Cloudinary) ─────────────────────────────
  photo_urls          TEXT[] NOT NULL DEFAULT '{}',

  -- ── Vérification IMEI ───────────────────────────────────
  imei                TEXT,
  imei_status         TEXT NOT NULL DEFAULT 'not_checked'
                      CHECK (imei_status IN ('not_checked', 'not_blacklisted', 'blacklisted', 'check_failed')),
  imei_raw_response   JSONB,

  -- ── Évaluation Gemini Vision ─────────────────────────────
  ai_score            INT CHECK (ai_score BETWEEN 0 AND 100),
  ai_score_color      TEXT CHECK (ai_score_color IN ('green', 'orange', 'red')),
  ai_justification    TEXT,
  ai_raw_response     JSONB,

  -- ── Offre générée ────────────────────────────────────────
  offer_cash          INT CHECK (offer_cash >= 0),   -- FCFA, multiple de 5000
  offer_credit        INT CHECK (offer_credit >= 0), -- offer_cash × 1.10, multiple de 5000
  offer_type          TEXT CHECK (offer_type IN ('buyback', 'partial_credit', 'spare_parts', 'refused')),

  -- ── Cycle de vie de la demande ───────────────────────────
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'refused', 'validated', 'completed', 'cancelled')),
  admin_notes         TEXT,
  voucher_reference   TEXT UNIQUE, -- 'TROC-2026-00042'

  -- ── Lien vers le modèle Argus (optionnel) ────────────────
  -- Nullable : l'utilisateur peut saisir un modèle non référencé
  trade_in_model_id   UUID REFERENCES trade_in_models(id) ON DELETE SET NULL
);

-- 2. Index de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_troc_requests_status
  ON trade_in_requests(status);

CREATE INDEX IF NOT EXISTS idx_troc_requests_created_at
  ON trade_in_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_troc_requests_customer_phone
  ON trade_in_requests(customer_phone);

-- 3. Trigger updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_trade_in_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trade_in_requests_updated_at
  BEFORE UPDATE ON trade_in_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_in_requests_updated_at();

-- 4. Row Level Security (RLS)
-- ============================================================
ALTER TABLE trade_in_requests ENABLE ROW LEVEL SECURITY;

-- Clients anonymes : peuvent soumettre une demande (INSERT uniquement)
CREATE POLICY "anon_insert_trade_in"
  ON trade_in_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Staff authentifié : accès complet (lecture, mise à jour, suppression)
CREATE POLICY "staff_full_access_trade_in"
  ON trade_in_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Realtime (pour les notifications admin)
-- ============================================================
-- Active le canal realtime sur cette table
ALTER PUBLICATION supabase_realtime ADD TABLE trade_in_requests;

-- ============================================================
-- Vérification : liste les colonnes créées
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'trade_in_requests'
-- ORDER BY ordinal_position;

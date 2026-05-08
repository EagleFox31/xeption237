-- Migration : arbre de décision v2 — nouveaux champs de diagnostic
-- Date : 2026-04-09
-- À coller dans le SQL Editor Supabase (Settings > SQL Editor)
--
-- Ajoute les colonnes nécessaires au scoring v2 :
-- critères fonctionnels, caméra, réparations, accessoires/docs, résultats algo.

-- ── Nouvelles colonnes diagnostics ───────────────────────────────────────────

ALTER TABLE trade_in_requests
  ADD COLUMN IF NOT EXISTS powers_on        BOOLEAN,
  ADD COLUMN IF NOT EXISTS charges_normally BOOLEAN,
  ADD COLUMN IF NOT EXISTS biometrics_work  BOOLEAN,
  ADD COLUMN IF NOT EXISTS account_unlocked BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_water_damage BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS previous_repairs TEXT,
  ADD COLUMN IF NOT EXISTS camera_condition TEXT,
  ADD COLUMN IF NOT EXISTS has_original_box BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_invoice      BOOLEAN DEFAULT FALSE;

-- ── Résultats de l'arbre de décision ─────────────────────────────────────────

ALTER TABLE trade_in_requests
  ADD COLUMN IF NOT EXISTS desirability_tier TEXT;   -- premium/high/mid/standard/budget

-- ── Contraintes de domaine ────────────────────────────────────────────────────

ALTER TABLE trade_in_requests
  DROP CONSTRAINT IF EXISTS check_camera_condition,
  DROP CONSTRAINT IF EXISTS check_previous_repairs,
  DROP CONSTRAINT IF EXISTS check_desirability_tier;

ALTER TABLE trade_in_requests
  ADD CONSTRAINT check_camera_condition
    CHECK (camera_condition IS NULL OR camera_condition IN ('bon', 'rayures', 'défectueuse')),
  ADD CONSTRAINT check_previous_repairs
    CHECK (previous_repairs IS NULL OR previous_repairs IN ('aucune', 'écran', 'batterie', 'autre')),
  ADD CONSTRAINT check_desirability_tier
    CHECK (desirability_tier IS NULL OR desirability_tier IN ('premium', 'high', 'mid', 'standard', 'budget'));

-- ── Autoriser la version v2 ───────────────────────────────────────────────────

ALTER TABLE trade_in_requests
  DROP CONSTRAINT IF EXISTS check_pricing_rule_version;

ALTER TABLE trade_in_requests
  ADD CONSTRAINT check_pricing_rule_version
    CHECK (pricing_rule_version IS NULL OR pricing_rule_version IN ('v1', 'v2'));

-- ── Index pour requêtes admin (filtrer sur les bloquants) ─────────────────────

CREATE INDEX IF NOT EXISTS idx_trade_in_blockers
  ON trade_in_requests (powers_on, account_unlocked, has_water_damage)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trade_in_desirability
  ON trade_in_requests (desirability_tier, trade_in_grade);

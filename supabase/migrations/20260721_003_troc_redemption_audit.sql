-- Smart Troc tranche 3.1 — piste d'audit du rachat en boutique.
-- Horodatage des étapes du bon + motif (override en période de grâce, ou ré-évaluation hors grâce).
-- Additif / idempotent — voir AGENTS.md § "vérifier la base RÉELLE avant d'écrire une migration".

BEGIN;

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Motif tracé quand le staff force un bon expiré : override (grâce ≤ 7 j) ou ré-évaluation (> 7 j).
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS redemption_reason TEXT;

COMMENT ON COLUMN public.trade_in_requests.validated_at IS
  'Smart Troc : horodatage du passage en statut validated (vérification physique en boutique).';
COMMENT ON COLUMN public.trade_in_requests.completed_at IS
  'Smart Troc : horodatage du passage en statut completed (échange finalisé).';
COMMENT ON COLUMN public.trade_in_requests.redemption_reason IS
  'Smart Troc : motif saisi par le staff si le bon était hors validité (override en grâce ≤ 7 j, ou ré-évaluation au-delà).';

COMMIT;

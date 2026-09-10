-- Smart Troc tranche 3.2 — lier la clôture du dossier à la vente de l'appareil cible (couplage POS).
-- La clôture crée une commande `orders` pour la cible ; on garde le lien + le crédit appliqué
-- sur le MÊME dossier trade_in_requests (rien d'éparpillé).
-- Additif / idempotent — voir AGENTS.md § "vérifier la base RÉELLE avant d'écrire une migration".

BEGIN;

-- Id de la commande créée à la clôture (référence orders.id, type text comme products.id/orders.id).
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS completed_order_id TEXT;

-- Crédit de reprise réellement appliqué à la clôture (peut différer de trade_in_value si ré-évaluation).
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS credit_applied NUMERIC;

COMMENT ON COLUMN public.trade_in_requests.completed_order_id IS
  'Smart Troc : id de la commande orders créée à la clôture (vente de l''appareil cible). NULL si bon générique sans vente liée.';
COMMENT ON COLUMN public.trade_in_requests.credit_applied IS
  'Smart Troc : crédit de reprise appliqué à la clôture (FCFA). Diffère de trade_in_value si ré-évaluation hors grâce.';

CREATE INDEX IF NOT EXISTS trade_in_requests_completed_order_idx
  ON public.trade_in_requests (completed_order_id)
  WHERE completed_order_id IS NOT NULL;

COMMIT;

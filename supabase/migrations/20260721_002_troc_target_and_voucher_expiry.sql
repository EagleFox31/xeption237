-- Smart Troc — lier l'appareil CIBLE + la validité du bon au MÊME dossier trade_in_requests.
-- Objectif : client + appareil de départ + évaluation + voucher + cible dans un seul enregistrement
-- (rien d'éparpillé). Rempli par la edge function save-trade-in au moment de l'acceptation.

BEGIN;

-- Appareil cible choisi dans le comparateur (≤5). TEXT (pas de FK stricte) : le type de products.id
-- n'est pas garanti ici (table gérée hors migrations) ; l'intégrité reste applicative + snapshot du nom.
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS target_product_id TEXT;

-- Snapshot du nom de la cible au moment du choix : lisibilité staff sans jointure,
-- survit au renommage / à la suppression du produit catalogue.
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS target_product_name TEXT;

-- Échéance de validité du bon de reprise. Barème 7/10/14 j selon release_year du modèle repris
-- (voir utils/trocVoucher.ts). NULL = dossiers historiques sans échéance.
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS voucher_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.trade_in_requests.target_product_id IS
  'Smart Troc : id catalogue de l''appareil cible choisi (voucher + précommande en boutique). NULL = bon générique.';
COMMENT ON COLUMN public.trade_in_requests.target_product_name IS
  'Snapshot du nom affiché de la cible au moment du choix (lisibilité staff).';
COMMENT ON COLUMN public.trade_in_requests.voucher_expires_at IS
  'Échéance de validité du bon de reprise (barème 7/10/14 j selon release_year du repris).';

-- Bons qui expirent : relances / expiration côté staff (tranche 3).
CREATE INDEX IF NOT EXISTS trade_in_requests_voucher_expires_idx
  ON public.trade_in_requests (voucher_expires_at)
  WHERE voucher_expires_at IS NOT NULL;

-- Analytics upsell : quels produits sont ciblés par les bons.
CREATE INDEX IF NOT EXISTS trade_in_requests_target_product_idx
  ON public.trade_in_requests (target_product_id)
  WHERE target_product_id IS NOT NULL;

COMMIT;

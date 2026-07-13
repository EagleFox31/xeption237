-- Snapshot client au moment du paiement (formulaire rempli avant save-trade-in).
ALTER TABLE public.troc_payments
  ADD COLUMN IF NOT EXISTS customer_name  TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

COMMENT ON COLUMN public.troc_payments.customer_name IS 'Nom saisi au formulaire Smart Troc avant finalisation du dossier.';
COMMENT ON COLUMN public.troc_payments.customer_phone IS 'Téléphone formulaire (peut différer du numéro OM/Momo payeur).';

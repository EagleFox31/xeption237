-- Lien explicite paiement → dossier (en plus de session_key).
ALTER TABLE public.troc_payments
  ADD COLUMN IF NOT EXISTS trade_in_request_id TEXT
    REFERENCES public.trade_in_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_troc_payments_trade_in_request_id
  ON public.troc_payments (trade_in_request_id)
  WHERE trade_in_request_id IS NOT NULL;

-- Rétro-lien : session_key commun entre les deux tables.
UPDATE public.troc_payments p
SET trade_in_request_id = r.id
FROM public.trade_in_requests r
WHERE p.trade_in_request_id IS NULL
  AND r.session_key IS NOT NULL
  AND r.session_key = p.session_key;

-- Lien direct dossier ↔ paiement (même session_key que troc_payments).
ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS session_key TEXT;

CREATE INDEX IF NOT EXISTS idx_trade_in_requests_session_key
  ON public.trade_in_requests (session_key)
  WHERE session_key IS NOT NULL;

-- Rétro-lien depuis troc_sessions quand trade_in_id était renseigné.
UPDATE public.trade_in_requests r
SET session_key = s.session_key
FROM public.troc_sessions s
WHERE s.trade_in_id = r.id
  AND r.session_key IS NULL;

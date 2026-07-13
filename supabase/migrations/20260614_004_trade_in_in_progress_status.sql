-- Dossier partiel dès l'upload des photos (avant bon / évaluation finale).
ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_status_check;

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_status_check
  CHECK (
    status IN (
      'in_progress',
      'pending',
      'accepted',
      'refused',
      'validated',
      'completed',
      'cancelled'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_in_requests_session_in_progress
  ON public.trade_in_requests (session_key)
  WHERE session_key IS NOT NULL AND status = 'in_progress';

-- Pipeline SMART TROC (issue #11) : ajout statuts contacted + appointment,
-- table d'historique + trigger d'audit trail sur toute transition de statut.
--
-- Rejouable (IF NOT EXISTS + DROP CONSTRAINT IF EXISTS).

BEGIN;

-- 1. Étend la contrainte CHECK sur status avec les 2 nouveaux paliers.
--    Ordre reflétant le pipeline :
--    in_progress → pending → accepted → contacted → appointment → validated → completed
--    Sortes latérales : refused, cancelled.
ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_status_check;

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_status_check
  CHECK (
    status IN (
      'in_progress',
      'pending',
      'accepted',
      'contacted',
      'appointment',
      'refused',
      'validated',
      'completed',
      'cancelled'
    )
  );

-- 2. Historique des transitions — audit trail immuable
CREATE TABLE IF NOT EXISTS public.trade_in_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- trade_in_requests.id est TEXT (valeurs de forme UUID) — cf. AGENTS.md
  request_id   TEXT NOT NULL REFERENCES public.trade_in_requests(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by   TEXT,             -- email du staff, 'system', 'client', etc.
  reason       TEXT              -- note libre optionnelle
);

CREATE INDEX IF NOT EXISTS trade_in_status_history_request_idx
  ON public.trade_in_status_history (request_id, changed_at DESC);

-- 3. Trigger auto-log sur UPDATE (uniquement quand status change)
CREATE OR REPLACE FUNCTION public.log_trade_in_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.trade_in_status_history (request_id, from_status, to_status, changed_by)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('request.jwt.claims', true)::json->>'email', 'system')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_trade_in_status ON public.trade_in_requests;
CREATE TRIGGER trg_log_trade_in_status
  AFTER UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_trade_in_status_change();

-- 4. RLS — lecture staff uniquement (pas d'écriture manuelle, uniquement via trigger)
ALTER TABLE public.trade_in_status_history ENABLE ROW LEVEL SECURITY;

-- Policy staff lecture (même pattern que troc_sessions_select_staff)
DROP POLICY IF EXISTS "trade_in_status_history_select_staff"
  ON public.trade_in_status_history;

CREATE POLICY "trade_in_status_history_select_staff"
  ON public.trade_in_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt()->>'email')
    )
  );

COMMIT;

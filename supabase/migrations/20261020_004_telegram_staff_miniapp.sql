-- Secure identity binding for the existing Xeption Telegram bot Mini App.
-- The Telegram bot's credentials remain in server-side secrets; this migration
-- neither activates a bot nor modifies the existing notify-staff sender.
--
-- Tables are service-role only. Clients must never write mappings directly.
-- Intended service: Trigenys Notify Mini App (ADR-001).

BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_staff_links (
  telegram_user_id TEXT PRIMARY KEY
    CHECK (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS telegram_staff_links_active_idx
  ON public.telegram_staff_links (auth_user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.telegram_staff_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_staff_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.telegram_staff_links TO service_role;

CREATE TABLE IF NOT EXISTS public.telegram_staff_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL,
  auth_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_staff_action_audit_created_idx
  ON public.telegram_staff_action_audit (created_at DESC);
ALTER TABLE public.telegram_staff_action_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_staff_action_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.telegram_staff_action_audit TO service_role;

-- Both permissions and audit are evaluated in the same database transaction.
-- Only the server-side service role may execute this function.
CREATE OR REPLACE FUNCTION public.ack_staff_notification_from_telegram(
  p_notification_id UUID,
  p_telegram_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_staff_role TEXT;
  v_role_rank INTEGER;
  v_required_role TEXT;
  v_required_rank INTEGER;
  v_notification public.admin_notifications%ROWTYPE;
BEGIN
  SELECT l.auth_user_id, lower(s.role)
    INTO v_auth_user_id, v_staff_role
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id
    AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Staff link not found' USING ERRCODE = '42501';
  END IF;

  v_role_rank := CASE v_staff_role
    WHEN 'vendeur' THEN 0 WHEN 'editor' THEN 0
    WHEN 'responsable' THEN 1 WHEN 'manager' THEN 1
    WHEN 'direction' THEN 2 WHEN 'admin' THEN 2
    WHEN 'super_admin' THEN 3 ELSE -1 END;

  IF v_role_rank < 0 THEN
    RAISE EXCEPTION 'Unknown staff role' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_notification
  FROM public.admin_notifications
  WHERE id = p_notification_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_required_role := lower(coalesce(v_notification.target_role, 'all'));
  v_required_rank := CASE v_required_role
    WHEN 'all' THEN 0 WHEN '' THEN 0
    WHEN 'vendeur' THEN 0 WHEN 'editor' THEN 0
    WHEN 'responsable' THEN 1 WHEN 'manager' THEN 1
    WHEN 'direction' THEN 2 WHEN 'admin' THEN 2
    WHEN 'super_admin' THEN 3 ELSE 99 END;

  IF v_role_rank < v_required_rank THEN
    RAISE EXCEPTION 'Insufficient staff role' USING ERRCODE = '42501';
  END IF;

  IF v_notification.read_at IS NOT NULL THEN RETURN FALSE; END IF;

  UPDATE public.admin_notifications
    SET read_at = now()
  WHERE id = p_notification_id AND read_at IS NULL;

  INSERT INTO public.telegram_staff_action_audit
    (telegram_user_id, auth_user_id, action, resource_id)
  VALUES
    (p_telegram_user_id, v_auth_user_id, 'notification.acknowledged', p_notification_id::TEXT);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.ack_staff_notification_from_telegram(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ack_staff_notification_from_telegram(UUID, TEXT)
  TO service_role;

COMMENT ON TABLE public.telegram_staff_links IS
  'Verified Telegram user to Xeption Auth user binding, service-role only. Remove/revoke to stop Mini App access.';
COMMENT ON FUNCTION public.ack_staff_notification_from_telegram(UUID, TEXT) IS
  'Atomic role-gated team-shared notification acknowledgement with audit trail; service-role only.';

COMMIT;

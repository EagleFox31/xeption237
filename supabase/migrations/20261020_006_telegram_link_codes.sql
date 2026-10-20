-- One-time codes to bind a Telegram account to a Xeption staff account.
-- The staff member signs in to the ERP as usual (identifier + password + captcha),
-- requests a code, and opens the Mini App with it (t.me/<bot>?startapp=<code>).
-- Only the SHA-256 of the code is stored. The telegram-miniapp-api Edge Function
-- consumes it with the service role in a single UPDATE (unused + not expired).

BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_telegram_user_id TEXT
);

CREATE INDEX IF NOT EXISTS telegram_link_codes_user_idx
  ON public.telegram_link_codes (auth_user_id);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_link_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_link_codes TO service_role;

-- Called by the signed-in staff member from the ERP. Returns the plain code once.
CREATE OR REPLACE FUNCTION public.create_telegram_link_code()
RETURNS TABLE (code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_expires_at TIMESTAMPTZ := now() + interval '10 minutes';
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE u.id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Staff account required' USING ERRCODE = '42501';
  END IF;

  -- One pending code per account: a new request invalidates the previous one,
  -- and expired codes are purged on the way.
  DELETE FROM public.telegram_link_codes t
  WHERE (t.auth_user_id = v_user_id AND t.used_at IS NULL)
     OR t.expires_at < now() - interval '1 day';

  -- gen_random_uuid() is cryptographically random (122 bits); 32 hex chars fit
  -- Telegram's startapp charset [A-Za-z0-9_-].
  v_code := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.telegram_link_codes (code_hash, auth_user_id, expires_at)
  VALUES (encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), v_user_id, v_expires_at);

  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_telegram_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_telegram_link_code() TO authenticated;

COMMIT;

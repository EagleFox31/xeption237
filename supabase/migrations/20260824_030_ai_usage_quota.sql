-- Quotas IA (Edge Functions) — fenêtre glissante par buckets, session + IP.
-- Consommée via RPC service_role depuis supabase/functions/_shared/rateLimit.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_usage_quota (
  scope         text        NOT NULL,
  dimension     text        NOT NULL CHECK (dimension IN ('session', 'ip')),
  identifier    text        NOT NULL,
  window_start  timestamptz NOT NULL,
  hit_count     integer     NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, dimension, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS ai_usage_quota_window_idx
  ON public.ai_usage_quota (scope, window_start);

ALTER TABLE public.ai_usage_quota ENABLE ROW LEVEL SECURITY;

-- Pas de policy : seul service_role (Edge Functions) via RPC.

CREATE OR REPLACE FUNCTION public.ai_usage_quota_consume(
  p_scope        text,
  p_dimension    text,
  p_identifier   text,
  p_window_start timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_dimension NOT IN ('session', 'ip') THEN
    RAISE EXCEPTION 'invalid dimension';
  END IF;

  INSERT INTO public.ai_usage_quota (scope, dimension, identifier, window_start, hit_count)
  VALUES (p_scope, p_dimension, left(p_identifier, 128), p_window_start, 1)
  ON CONFLICT (scope, dimension, identifier, window_start)
  DO UPDATE SET
    hit_count  = ai_usage_quota.hit_count + 1,
    updated_at = now()
  RETURNING hit_count INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_usage_quota_consume(text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_usage_quota_consume(text, text, text, timestamptz) TO service_role;

COMMIT;

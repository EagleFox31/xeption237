-- ============================================================================
-- Contrôle catalogue : fiches incomplètes + ruptures de stock.
--
-- Un job pg_cron (tous les matins, 06:00 UTC = 07:00 Yaoundé) parcourt
-- `products` et pose une ligne par (produit, règle). Quand le trou disparaît,
-- la ligne passe à `resolved`. Le staff relance le même scan depuis le
-- tableau de bord — pas d'Edge Function, pas de secret HTTP.
--
-- Deux familles :
--   • data   — fiche cassée (nom, photo, prix, catégorie, marque, stock < 0)
--   • metier — rupture (stock à 0 sur une fiche autrement vendable)
--
-- Table interne : accès uniquement via RPC SECURITY DEFINER + garde staff.
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.catalog_health_findings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rule_code       text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('data', 'metier')),
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'snoozed', 'resolved')),
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  snoozed_until   timestamptz,
  UNIQUE (product_id, rule_code)
);

CREATE INDEX IF NOT EXISTS catalog_health_findings_open_idx
  ON public.catalog_health_findings (severity, last_seen_at DESC)
  WHERE status = 'open';

ALTER TABLE public.catalog_health_findings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalog_health_findings FROM PUBLIC, anon, authenticated;

-- ── Hits courants (source unique des règles) ────────────────────────────────
-- Pas de GRANT : appelée uniquement par scan_catalog_health (même owner).
CREATE OR REPLACE FUNCTION public._catalog_health_current()
RETURNS TABLE(product_id text, rule_code text, severity text, title text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT p.id, 'missing_name'::text, 'data'::text,
         'Ce produit n’a pas de nom commercial.'::text
  FROM public.products p
  WHERE length(btrim(COALESCE(p.name, ''))) < 2

  UNION ALL
  SELECT p.id, 'missing_category', 'data',
         'Ce produit n’a pas de type (téléphone, tablette…).'
  FROM public.products p
  WHERE p.category IS NULL OR btrim(p.category) = ''

  UNION ALL
  SELECT p.id, 'missing_price', 'data',
         'Ce produit n’a pas de prix de vente.'
  FROM public.products p
  WHERE COALESCE(p.price, 0) <= 0

  UNION ALL
  SELECT p.id, 'missing_image', 'data',
         'Ce produit n’a pas de photo (ou c’est encore le placeholder).'
  FROM public.products p
  WHERE p.image IS NULL
     OR btrim(p.image) = ''
     OR p.image ILIKE '%placeholder%'
     OR p.image LIKE '%/icons/icon-192x192.png'

  UNION ALL
  SELECT p.id, 'missing_brand', 'data',
         'Ce produit n’a pas de marque.'
  FROM public.products p
  WHERE p.brand IS NULL

  UNION ALL
  SELECT p.id, 'invalid_stock', 'data',
         'Le stock de ce produit est négatif.'
  FROM public.products p
  WHERE COALESCE(p.stock, 0) < 0

  UNION ALL
  -- Rupture = rappel métier, seulement si la fiche est assez complète
  -- pour être vendue (sinon c’est déjà un trou data).
  SELECT p.id, 'empty_stock', 'metier',
         'Plus aucune pièce en stock — à commander ou à retirer du rayon.'
  FROM public.products p
  WHERE COALESCE(p.stock, 0) = 0
    AND length(btrim(COALESCE(p.name, ''))) >= 2
    AND COALESCE(p.price, 0) > 0
$$;

REVOKE ALL ON FUNCTION public._catalog_health_current() FROM PUBLIC, anon, authenticated;

-- ── Scan : upsert les hits, résout ce qui a disparu ─────────────────────────
CREATE OR REPLACE FUNCTION public.scan_catalog_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims text;
  v_open_data integer;
  v_open_metier integer;
BEGIN
  v_claims := current_setting('request.jwt.claims', true);
  IF v_claims IS NOT NULL AND v_claims <> '' AND v_claims <> '{}' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    ) THEN
      RAISE EXCEPTION 'Accès réservé à l''équipe';
    END IF;
  END IF;

  INSERT INTO public.catalog_health_findings (
    product_id, rule_code, severity, title, status, last_seen_at, resolved_at
  )
  SELECT h.product_id, h.rule_code, h.severity, h.title, 'open', now(), NULL
  FROM public._catalog_health_current() h
  ON CONFLICT (product_id, rule_code) DO UPDATE
    SET severity = EXCLUDED.severity,
        title = EXCLUDED.title,
        last_seen_at = now(),
        status = CASE
          WHEN catalog_health_findings.status = 'snoozed'
           AND catalog_health_findings.snoozed_until IS NOT NULL
           AND catalog_health_findings.snoozed_until > now()
          THEN 'snoozed'
          ELSE 'open'
        END,
        resolved_at = CASE
          WHEN catalog_health_findings.status = 'snoozed'
           AND catalog_health_findings.snoozed_until IS NOT NULL
           AND catalog_health_findings.snoozed_until > now()
          THEN catalog_health_findings.resolved_at
          ELSE NULL
        END,
        snoozed_until = CASE
          WHEN catalog_health_findings.status = 'snoozed'
           AND catalog_health_findings.snoozed_until IS NOT NULL
           AND catalog_health_findings.snoozed_until > now()
          THEN catalog_health_findings.snoozed_until
          ELSE NULL
        END;

  UPDATE public.catalog_health_findings f
  SET status = 'resolved',
      resolved_at = now(),
      snoozed_until = NULL
  WHERE f.status <> 'resolved'
    AND NOT EXISTS (
      SELECT 1
      FROM public._catalog_health_current() h
      WHERE h.product_id = f.product_id
        AND h.rule_code = f.rule_code
    );

  SELECT
    count(*) FILTER (WHERE severity = 'data')::integer,
    count(*) FILTER (WHERE severity = 'metier')::integer
  INTO v_open_data, v_open_metier
  FROM public.catalog_health_findings
  WHERE status = 'open';

  RETURN jsonb_build_object(
    'success', true,
    'open_data', COALESCE(v_open_data, 0),
    'open_metier', COALESCE(v_open_metier, 0)
  );
END;
$$;

-- ── Liste des alertes ouvertes (tableau de bord) ────────────────────────────
CREATE OR REPLACE FUNCTION public.list_catalog_health_findings()
RETURNS TABLE(
  id uuid,
  product_id text,
  product_name text,
  rule_code text,
  severity text,
  title text,
  last_seen_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT f.id, f.product_id, COALESCE(NULLIF(btrim(p.name), ''), 'Sans nom'),
         f.rule_code, f.severity, f.title, f.last_seen_at
  FROM public.catalog_health_findings f
  JOIN public.products p ON p.id = f.product_id
  WHERE f.status = 'open'
  ORDER BY
    CASE f.severity WHEN 'data' THEN 0 ELSE 1 END,
    p.name;
END;
$$;

-- ── Reporter un rappel (défaut 7 jours) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.snooze_catalog_health_finding(
  p_id uuid,
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  v_days := GREATEST(1, LEAST(COALESCE(p_days, 7), 30));

  UPDATE public.catalog_health_findings
  SET status = 'snoozed',
      snoozed_until = now() + make_interval(days => v_days)
  WHERE id = p_id
    AND status = 'open';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alerte introuvable ou déjà traitée.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.scan_catalog_health() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_catalog_health_findings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.snooze_catalog_health_finding(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.scan_catalog_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_catalog_health_findings() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.snooze_catalog_health_finding(uuid, integer) TO authenticated, service_role;

-- Premier passage : le tableau de bord n’attend pas le cron de demain.
SELECT public.scan_catalog_health();

-- Tous les jours à 06:00 UTC (07:00 à Yaoundé).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'scan-catalog-health-daily';

    PERFORM cron.schedule(
      'scan-catalog-health-daily',
      '0 6 * * *',
      $cron$SELECT public.scan_catalog_health();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMIT;

-- Migration : Certificats Smart Troc (palier Premium / Safety)
-- Date : 2026-05-16
-- À coller dans le SQL Editor Supabase.
--
-- Stocke les certificats PDF générés pour les paliers Premium (500 F) et Sûreté (1000 F).
-- Chaque cert a un QR code unique pointant vers /verify/:token, qui affiche
-- les détails du diagnostic et incrémente un compteur de scans.

BEGIN;

-- ── Table principale ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.troc_certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_in_id      TEXT NOT NULL REFERENCES public.trade_in_requests(id) ON DELETE CASCADE,
  reference        TEXT NOT NULL UNIQUE,         -- ex: XEP-CERT-A8K9L2
  qr_token         TEXT NOT NULL UNIQUE,         -- UUID brut utilisé dans /verify/:token
  pdf_url          TEXT,                         -- URL publique Supabase Storage
  verified_count   INT  NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul certificat par demande (idempotence côté edge function).
CREATE UNIQUE INDEX IF NOT EXISTS troc_certificates_trade_in_idx
  ON public.troc_certificates (trade_in_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.troc_certificates ENABLE ROW LEVEL SECURITY;

-- Anon n'a pas accès direct — uniquement via la RPC publique get_certificate_by_token.
-- Staff (authenticated) peut tout lire pour l'admin.
DROP POLICY IF EXISTS "troc_certificates_staff_read" ON public.troc_certificates;
CREATE POLICY "troc_certificates_staff_read"
  ON public.troc_certificates FOR SELECT
  TO authenticated
  USING (true);

-- ── Storage bucket pour les PDFs ─────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques Storage : lecture publique des certificats (pour /verify/:token + lien direct).
-- L'écriture est faite par les edge functions via service_role (bypass RLS auto).
DROP POLICY IF EXISTS "Public read certificates" ON storage.objects;
CREATE POLICY "Public read certificates"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'certificates');

-- ── RPC publique de vérification ─────────────────────────────────────────────
-- Lu par la page /verify/:token. Incrémente le compteur de scans.
-- Ne retourne JAMAIS de données client identifiantes (nom, téléphone, email).

CREATE OR REPLACE FUNCTION public.get_certificate_by_token(token TEXT)
RETURNS TABLE(
  reference            TEXT,
  device_brand         TEXT,
  device_model         TEXT,
  device_storage       TEXT,
  imei_last4           TEXT,
  trade_in_grade       TEXT,
  tier                 TEXT,
  imei_assurance_level TEXT,
  imei_blacklist_status TEXT,
  trade_in_value       INT,
  trade_in_value_cash  INT,
  ai_score             INT,
  created_at           TIMESTAMPTZ,
  verified_count       INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert_row public.troc_certificates;
BEGIN
  SELECT * INTO cert_row FROM public.troc_certificates WHERE qr_token = token;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Incrément du compteur de scans
  UPDATE public.troc_certificates
  SET verified_count   = verified_count + 1,
      last_verified_at = now()
  WHERE id = cert_row.id;

  RETURN QUERY
  SELECT
    cert_row.reference,
    t.device_brand,
    t.device_model,
    t.device_storage,
    CASE WHEN t.imei IS NOT NULL AND length(t.imei) >= 4
         THEN '••••••••••' || RIGHT(t.imei, 4)
         ELSE NULL END,
    t.trade_in_grade,
    t.tier,
    t.imei_assurance_level,
    t.imei_blacklist_status,
    t.trade_in_value,
    t.trade_in_value_cash,
    t.ai_score,
    cert_row.created_at,
    cert_row.verified_count + 1
  FROM public.trade_in_requests t
  WHERE t.id = cert_row.trade_in_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_certificate_by_token(TEXT) TO anon, authenticated;

COMMIT;

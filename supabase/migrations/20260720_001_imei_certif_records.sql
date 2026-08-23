-- Certificats IMEI « Certifié Xeption » (tunnel /troc → Certifier, 300 F)
-- Distinct des certificats Smart Troc (troc_certificates → trade_in).

BEGIN;

CREATE TABLE IF NOT EXISTS public.imei_certif_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key        TEXT NOT NULL UNIQUE,
  payment_reference  TEXT,
  customer_name      TEXT NOT NULL,
  imei               TEXT NOT NULL,
  device_brand       TEXT,
  device_model       TEXT,
  imei_status        TEXT NOT NULL DEFAULT 'valid'
    CHECK (imei_status IN ('valid', 'invalid', 'check_failed')),
  blacklist_status   TEXT NOT NULL DEFAULT 'unknown'
    CHECK (blacklist_status IN ('unknown', 'clear', 'blacklisted')),
  reference          TEXT NOT NULL UNIQUE,
  qr_token           TEXT NOT NULL UNIQUE,
  pdf_url            TEXT,
  verified_count     INT  NOT NULL DEFAULT 0,
  last_verified_at   TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS imei_certif_records_qr_token_idx
  ON public.imei_certif_records (qr_token);

ALTER TABLE public.imei_certif_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imei_certif_records_staff_read" ON public.imei_certif_records;
CREATE POLICY "imei_certif_records_staff_read"
  ON public.imei_certif_records FOR SELECT
  TO authenticated
  USING (true);

-- RPC publique — pas de nom client complet, IMEI masqué.
CREATE OR REPLACE FUNCTION public.get_imei_certificate_by_token(token TEXT)
RETURNS TABLE(
  reference          TEXT,
  device_brand       TEXT,
  device_model       TEXT,
  imei_last4         TEXT,
  imei_status        TEXT,
  blacklist_status   TEXT,
  created_at         TIMESTAMPTZ,
  verified_count     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert_row public.imei_certif_records;
BEGIN
  SELECT * INTO cert_row FROM public.imei_certif_records WHERE qr_token = token;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.imei_certif_records
  SET verified_count   = verified_count + 1,
      last_verified_at = now()
  WHERE id = cert_row.id;

  RETURN QUERY
  SELECT
    cert_row.reference,
    cert_row.device_brand,
    cert_row.device_model,
    CASE WHEN cert_row.imei IS NOT NULL AND length(cert_row.imei) >= 4
         THEN '••••••••••' || RIGHT(cert_row.imei, 4)
         ELSE NULL END,
    cert_row.imei_status,
    cert_row.blacklist_status,
    cert_row.created_at,
    cert_row.verified_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_imei_certificate_by_token(TEXT) TO anon, authenticated;

COMMIT;

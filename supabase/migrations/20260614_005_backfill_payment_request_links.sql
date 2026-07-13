-- Rétro-lien paiements ↔ dossiers — session_key uniquement (sans heuristique téléphone).
-- Si 005 agressive a déjà été exécutée, appliquer 006_fix_bad_payment_links.sql.

UPDATE public.troc_payments p
SET trade_in_request_id = r.id,
    updated_at = now()
FROM public.trade_in_requests r
WHERE p.trade_in_request_id IS NULL
  AND r.session_key IS NOT NULL
  AND r.session_key = p.session_key;

UPDATE public.trade_in_requests r
SET session_key = p.session_key
FROM public.troc_payments p
WHERE r.session_key IS NULL
  AND p.session_key IS NOT NULL
  AND p.trade_in_request_id = r.id;

UPDATE public.troc_sessions s
SET trade_in_id = r.id,
    updated_at = now()
FROM public.trade_in_requests r
WHERE r.session_key IS NOT NULL
  AND s.session_key = r.session_key
  AND (s.trade_in_id IS NULL OR s.trade_in_id <> r.id);

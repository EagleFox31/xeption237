-- Correctif après 005 agressive : liens téléphone / TRC-1778 forcé.
-- Ne garde qu'un paiement par dossier (session_key cohérente, paid prioritaire).

-- 1) Délier si session_key paiement ≠ session_key dossier
UPDATE public.troc_payments p
SET trade_in_request_id = NULL,
    updated_at = now()
WHERE p.trade_in_request_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.trade_in_requests r
    WHERE r.id = p.trade_in_request_id
      AND r.session_key IS NOT NULL
      AND p.session_key IS NOT NULL
      AND r.session_key <> p.session_key
  );

-- 2) Un dossier = un paiement lié max (le plus cohérent)
WITH ranked AS (
  SELECT
    p.id,
    ROW_NUMBER() OVER (
      PARTITION BY p.trade_in_request_id
      ORDER BY
        CASE
          WHEN r.session_key IS NOT NULL AND p.session_key = r.session_key THEN 0
          ELSE 1
        END,
        CASE WHEN p.status = 'paid' THEN 0 ELSE 1 END,
        p.created_at DESC
    ) AS rn
  FROM public.troc_payments p
  JOIN public.trade_in_requests r ON r.id = p.trade_in_request_id
  WHERE p.trade_in_request_id IS NOT NULL
)
UPDATE public.troc_payments p
SET trade_in_request_id = NULL,
    updated_at = now()
FROM ranked x
WHERE p.id = x.id
  AND x.rn > 1;

-- 3) Re-lier uniquement par session_key identique
UPDATE public.troc_payments p
SET trade_in_request_id = r.id,
    updated_at = now()
FROM public.trade_in_requests r
WHERE p.trade_in_request_id IS NULL
  AND r.session_key IS NOT NULL
  AND r.session_key = p.session_key;

-- 4) session_key dossier depuis le paiement encore lié
UPDATE public.trade_in_requests r
SET session_key = p.session_key
FROM public.troc_payments p
WHERE r.session_key IS NULL
  AND p.trade_in_request_id = r.id
  AND p.session_key IS NOT NULL;

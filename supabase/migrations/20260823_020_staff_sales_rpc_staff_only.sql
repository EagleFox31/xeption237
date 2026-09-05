-- ============================================================================
-- Ferme l'accès `anon` aux RPC de ventes vendeur (étape 5).
--
-- MÊME DÉFAUT QUE `20260823_018_feedback_rpc_staff_only.sql`, sur de nouvelles
-- fonctions : `get_staff_sales_summary` et `list_staff_sales` étaient en
-- SECURITY DEFINER, sans contrôle d'appartenance au staff, et accordées à `anon`.
-- `list_staff_sales` renvoie `customer_name`, `customer_phone`, `total` et `items`
-- — soit l'historique commercial complet.
--
-- ⚠️ RAPPEL : retirer le GRANT `anon` ne suffit pas. Chez Supabase,
-- `signInAnonymously()` — que le tunnel de commande déclenche seul — produit une
-- session portant le rôle `authenticated`. Le contrôle d'appartenance réelle à
-- `staff` À L'INTÉRIEUR de la fonction est ce qui protège vraiment.
--
-- Conversion sql → plpgsql pour pouvoir lever une exception : un retour vide
-- masquerait une mauvaise configuration de compte au lieu de la signaler.
-- Signatures et types de retour INCHANGÉS.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_staff_sales_summary(
  p_staff_id uuid,
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to   timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'sale_count', COUNT(*)::integer,
      'total_amount', COALESCE(SUM(o.total), 0),
      'discount_total', COALESCE(SUM(o.discount_amount), 0),
      'subtotal_amount', COALESCE(SUM(o.total + o.discount_amount), 0)
    )
    FROM public.orders o
    WHERE o.staff_id = p_staff_id
      AND o.status NOT IN ('cancelled', 'returned')
      AND o.date >= COALESCE(p_from, date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala')
      AND o.date < COALESCE(
        p_to,
        date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' + interval '1 day'
      )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_staff_sales(
  p_staff_id uuid,
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to   timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  order_id text,
  customer_name text,
  customer_phone text,
  payment_method text,
  total numeric,
  discount_amount numeric,
  status text,
  sale_date timestamp with time zone,
  store_id uuid,
  items jsonb,
  item_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT
    o.id AS order_id,
    o.customer_name,
    o.customer_phone,
    o.payment_method,
    o.total,
    o.discount_amount,
    o.status,
    o.date AS sale_date,
    o.store_id,
    o.items,
    COALESCE(
      (SELECT SUM(GREATEST(COALESCE((elem->>'quantity')::integer, 1), 1))::bigint
       FROM jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) AS elem),
      0
    ) AS item_count
  FROM public.orders o
  WHERE o.staff_id = p_staff_id
    AND o.status NOT IN ('cancelled', 'returned')
    AND o.date >= COALESCE(p_from, date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala')
    AND o.date < COALESCE(
      p_to,
      date_trunc('day', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' + interval '1 day'
    )
  ORDER BY o.date DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_staff_sales_summary(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_staff_sales(uuid, timestamptz, timestamptz)        FROM anon;

COMMIT;

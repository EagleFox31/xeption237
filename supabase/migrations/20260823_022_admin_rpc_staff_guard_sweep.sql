-- ============================================================================
-- Passe générale : garde `staff` sur les RPC d'administration restées ouvertes.
--
-- Troisième occurrence du même défaut en une journée (après les RPC feedback en
-- 018 et les ventes vendeur en 020) : une fonction SECURITY DEFINER destinée à
-- l'admin, créée sans contrôle d'appartenance et laissée exécutable par `anon`.
--
-- Concernées ici :
--   • get_shipment_reservation_alerts      → renvoie customer_name + customer_phone
--   • get_pending_orders_with_reservations → renvoie customer_name + customer_phone
--   • get_stock_reservations_overview      → stock immobilisé par produit
--   • get_product_stock_mismatches         → écarts de stock par produit
--   • redistribute_product_stock           → garde déjà présente, REVOKE PUBLIC seul
--
-- ⚠️ DEUX choses sont nécessaires, l'une ne remplace pas l'autre :
--   1. REVOKE ALL ... FROM PUBLIC — Postgres accorde EXECUTE à PUBLIC par défaut
--      sur toute nouvelle fonction, et `anon` en hérite. Révoquer `anon` seul est
--      SANS EFFET (constaté en 020).
--   2. Contrôle d'appartenance à `staff` DANS la fonction — `signInAnonymously()`
--      produit une session portant le rôle `authenticated`, donc le GRANT
--      `authenticated` ne distingue pas un vendeur d'un visiteur.
--
-- Conversion sql → plpgsql pour lever une exception ; signatures inchangées.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_shipment_reservation_alerts()
RETURNS TABLE(
  order_id text, order_status text, customer_name text, customer_phone text,
  reserved_since timestamp with time zone, days_out integer, alert_level text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s
                 WHERE lower(s.email) = lower(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.status, o.customer_name, o.customer_phone,
    MIN(sr.created_at),
    GREATEST(0, EXTRACT(day FROM now() - MIN(sr.created_at))::integer),
    CASE
      -- `loss_pending` ne vaut que pour ce qui est physiquement sorti : périmètre
      -- exact de process_shipped_reservation_losses. Un retrait non réclamé n'est
      -- pas une perte, l'appareil est en rayon.
      WHEN o.status IN ('shipped', 'refused')
       AND MIN(sr.created_at) <= now() - interval '30 days' THEN 'loss_pending'
      WHEN MIN(sr.created_at) <= now() - interval '5 days'  THEN 'warning'
      ELSE 'ok'
    END
  FROM public.orders o
  JOIN public.stock_reservations sr ON sr.order_id = o.id AND sr.status = 'active'
  WHERE o.status IN ('shipped', 'refused', 'ready')
    AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
  GROUP BY o.id, o.status, o.customer_name, o.customer_phone
  HAVING MIN(sr.created_at) <= now() - interval '5 days'
  ORDER BY MIN(sr.created_at) ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_orders_with_reservations()
RETURNS TABLE(
  order_id text, customer_name text, customer_phone text, order_total numeric,
  reserved_since timestamp with time zone, expires_at timestamp with time zone
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s
                 WHERE lower(s.email) = lower(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT o.id, o.customer_name, o.customer_phone, o.total,
         MIN(sr.created_at), MAX(sr.expires_at)
  FROM public.orders o
  JOIN public.stock_reservations sr ON sr.order_id = o.id AND sr.status = 'active'
  WHERE o.status = 'pending'
    AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
  GROUP BY o.id, o.customer_name, o.customer_phone, o.total
  ORDER BY MIN(sr.created_at) ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_stock_reservations_overview()
RETURNS TABLE(
  product_id text, product_name text, reserved_qty bigint,
  oldest_since timestamp with time zone, order_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s
                 WHERE lower(s.email) = lower(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT sr.product_id, p.name, SUM(sr.qty)::bigint,
         MIN(sr.created_at), COUNT(DISTINCT sr.order_id)::bigint
  FROM public.stock_reservations sr
  JOIN public.products p ON p.id = sr.product_id
  WHERE sr.status = 'active'
  GROUP BY sr.product_id, p.name
  HAVING SUM(sr.qty) > 0
  ORDER BY MIN(sr.created_at) ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_product_stock_mismatches()
RETURNS TABLE(
  product_id text, product_name text, catalog_stock integer, distributed_stock bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s
                 WHERE lower(s.email) = lower(auth.jwt() ->> 'email')) THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.stock, COALESCE(SUM(ss.quantity), 0)::bigint
  FROM public.products p
  LEFT JOIN public.store_stock ss ON ss.product_id = p.id
  GROUP BY p.id, p.name, p.stock
  HAVING COALESCE(SUM(ss.quantity), 0) <> p.stock
  ORDER BY p.name;
END;
$function$;

-- ── Droits : PUBLIC d'abord, sinon anon hérite ──────────────────────────────
REVOKE ALL ON FUNCTION public.get_shipment_reservation_alerts()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_pending_orders_with_reservations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_stock_reservations_overview()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_product_stock_mismatches()         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redistribute_product_stock(text, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_shipment_reservation_alerts()      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_orders_with_reservations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_reservations_overview()      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_product_stock_mismatches()         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redistribute_product_stock(text, jsonb) TO authenticated, service_role;

COMMIT;

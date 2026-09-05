-- ============================================================================
-- Étend l'alerte de stock immobilisé aux commandes en RETRAIT BOUTIQUE (`ready`).
--
-- MANQUE COMBLÉ : une commande préparée que le client ne vient jamais chercher
-- immobilisait son stock indéfiniment, sans aucun signal.
--   • `expire_stock_reservations` ne traite que `pending`
--   • `process_shipped_reservation_losses` ne regarde que ce qui est SORTI
--   • l'alerte ne couvrait que `shipped` / `refused`
--
-- Pas de perte automatique pour `ready` : l'appareil est sur l'étagère, personne
-- ne l'a perdu. Le bon geste est l'annulation — autorisée puisque rien n'est sorti.
-- Ce qui manquait, c'était uniquement le rappel.
--
-- Signature INCHANGÉE (CREATE OR REPLACE, donc GRANT préservés) : la colonne
-- `order_status` déjà renvoyée permet à l'interface de distinguer
-- « colis dehors » de « en attente de retrait ».
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_shipment_reservation_alerts()
RETURNS TABLE(
  order_id text,
  order_status text,
  customer_name text,
  customer_phone text,
  reserved_since timestamp with time zone,
  days_out integer,
  alert_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    o.id AS order_id,
    o.status AS order_status,
    o.customer_name,
    o.customer_phone,
    MIN(sr.created_at) AS reserved_since,
    GREATEST(0, EXTRACT(day FROM now() - MIN(sr.created_at))::integer) AS days_out,
    CASE
      -- `loss_pending` ne concerne QUE ce qui est physiquement sorti : c'est le
      -- périmètre exact de process_shipped_reservation_losses. Un retrait non
      -- réclamé n'est pas une perte, l'appareil est en rayon.
      WHEN o.status IN ('shipped', 'refused')
       AND MIN(sr.created_at) <= now() - interval '30 days' THEN 'loss_pending'
      WHEN MIN(sr.created_at) <= now() - interval '5 days'  THEN 'warning'
      ELSE 'ok'
    END AS alert_level
  FROM public.orders o
  JOIN public.stock_reservations sr
    ON sr.order_id = o.id AND sr.status = 'active'
  WHERE o.status IN ('shipped', 'refused', 'ready')
    AND COALESCE(o.payment_status, 'pending') IS DISTINCT FROM 'paid'
  GROUP BY o.id, o.status, o.customer_name, o.customer_phone
  HAVING MIN(sr.created_at) <= now() - interval '5 days'
  ORDER BY MIN(sr.created_at) ASC;
$function$;

COMMIT;

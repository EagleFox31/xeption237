-- Le tunnel de commande public etait casse : reservation du stock AVANT la
-- creation de la commande
--
-- CONSTAT (docs/engineering/ERRORS_LOG.md, 2026-09-07)
--
-- La fonction reservait le stock ligne 25, puis creait la commande ligne 28 :
--
--     PERFORM public._store_reserve_line(store_id, product_id, qty, p_order_id, ...)
--     ...
--     INSERT INTO orders (...)
--
-- Or `stock_reservations.order_id` reference `orders(id)` par une cle etrangere
-- NON DIFFEREE, donc verifiee immediatement. La reservation pointait vers une
-- commande inexistante et echouait a tous les coups.
--
-- Le bloc EXCEPTION avalait l'erreur et RETOURNAIT {success:false} au lieu de
-- lever : aucune trace, aucune alerte. C'est ce qui a rendu la panne invisible
-- pendant des semaines. `orders`, `order_items` et `stock_reservations` etaient
-- toutes a ZERO ligne, ce qui se lisait comme « boutique recente ».
--
-- Isole par experience avant correction : l'echec etait IDENTIQUE avec la RLS
-- actuelle, avec l'ancienne policy publique retablie, et avec la RLS
-- entierement desactivee sur `orders`. La cause n'etait donc pas la securite.
--
-- CORRECTION : la commande est creee AVANT toute reservation. La boucle est
-- scindee en deux — validation des articles d'abord, reservation ensuite —
-- pour qu'un panier invalide soit rejete sans avoir rien ecrit.
--
-- L'atomicite est preservee : la fonction s'execute dans une transaction, et le
-- bloc EXCEPTION annule tout en cas d'echec.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_city text,
  p_delivery_mode text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb,
  p_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  item jsonb;
  product_id text;
  qty integer;
  order_date timestamptz;
  store_id uuid;
  expires_at timestamptz;
BEGIN
  order_date := COALESCE(p_date::timestamptz, now());
  expires_at := order_date + interval '48 hours';

  store_id := public._pick_store_for_cart(p_items, p_customer_city);
  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock insuffisant pour cette commande');
  END IF;

  -- 1. VALIDER le panier sans rien ecrire. Un article invalide doit faire
  --    echouer la commande avant toute trace en base.
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    IF product_id IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Article de panier invalide');
    END IF;
  END LOOP;

  -- 2. CREER la commande. C'est ce qui manquait : `stock_reservations.order_id`
  --    la reference, elle doit donc exister avant qu'on reserve quoi que ce soit.
  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id,
    payment_status
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, p_total, p_items, 'pending', order_date, store_id,
    'pending'
  );

  -- 3. RESERVER le stock, maintenant que la commande existe.
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    PERFORM public._store_reserve_line(store_id, product_id, qty, p_order_id, expires_at);
  END LOOP;

  PERFORM public._insert_order_items(p_order_id, p_items);

  RETURN jsonb_build_object('success', true, 'store_id', store_id);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.release_order_stock_reservations(p_order_id);
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$fn$;

COMMIT;

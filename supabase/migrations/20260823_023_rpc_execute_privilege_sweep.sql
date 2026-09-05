-- ============================================================================
-- 20260823_023 — REVOKE EXECUTE : classement fonction par fonction
--
-- ⚠️ RELIRE AVANT APPLICATION — une erreur sur create_order_atomic casse le checkout.
--
-- CAUSE RACINE
-- Postgres accorde EXECUTE à PUBLIC sur toute nouvelle fonction. Chez Supabase,
-- le rôle `anon` hérite de PUBLIC → ~20 RPC SECURITY DEFINER restent appelables
-- depuis le bundle JS sans passer par l'UI prévue.
--
-- DEUX COUCHES (l'une ne remplace pas l'autre)
--   1. REVOKE ALL … FROM PUBLIC, anon  — ferme la porte au rôle anon
--   2. Garde `staff` DANS la fonction   — signInAnonymously() produit aussi
--      `authenticated`, donc GRANT authenticated seul ne protège pas
--
-- ── CLASSE A — PUBLIC VOLONTAIRE (checkout / pages publiques, jeton) ────────
--   create_order_atomic              → checkout web (clé anon)
--   get_feedback_invite              → page avis (jeton 144 bits)
--   submit_feedback                  → idem
--   get_certificate_by_token         → vérif certificat troc
--   get_imei_certificate_by_token    → vérif certificat IMEI
--   get_troc_monthly_count           → compteur public
--   Action : REVOKE PUBLIC → GRANT anon, authenticated, service_role
--
-- ── CLASSE B — HELPERS INTERNES (jamais d'appel RPC direct) ─────────────────
--   _store_sale_line, _store_reserve_line, _pick_store_for_cart
--   _staff_from_jwt, _default_store_id, _insert_order_items
--   _extend_order_stock_reservations
--   Action : REVOKE PUBLIC, anon, authenticated (appelées par le propriétaire
--            depuis d'autres SECURITY DEFINER — ex. create_order_atomic)
--
-- ── CLASSE C — TRIGGERS / CRÉATION INVITES (pas d'appel client) ─────────────
--   ensure_order_feedback_invites, ensure_sav_feedback_invite
--   trg_orders_feedback_invites, trg_repair_tickets_feedback_invite
--   trg_sync_product_stock_from_stores
--   Action : REVOKE PUBLIC, anon, authenticated
--
-- ── CLASSE D — CRON (service_role uniquement) ───────────────────────────────
--   expire_stock_reservations, process_shipped_reservation_losses
--
-- ── CLASSE E — BACKEND / WEBHOOK (service_role uniquement) ──────────────────
--   confirm_order_payment_and_consume_stock  → payment-webhook Campay
--   release_order_stock_reservations         → appel interne sync / create
--   consume_order_stock_reservations         → appel interne confirm
--   sync_staff_auth_display_name             → edge provision staff
--
-- ── CLASSE F — ERP STAFF (authenticated + service_role + garde staff) ───────
--   complete_pos_sale_atomic, complete_troc_with_sale_atomic
--   mark_order_cash_paid, sync_order_stock_on_status, set_product_catalog_stock
--   redistribute_product_stock
--   get_shipment_reservation_alerts, get_pending_orders_with_reservations
--   get_stock_reservations_overview, get_product_stock_mismatches
--   get_staff_sales_summary, list_staff_sales
--   list_due_feedback_invites, mark_feedback_invite_sent
--   Action : garde staff si absente + REVOKE PUBLIC, anon
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

-- ── F : garde staff sur mutations encore ouvertes ─────────────────────────

CREATE OR REPLACE FUNCTION public.sync_order_stock_on_status(
  p_order_id text,
  p_new_status text,
  p_old_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_st text := COALESCE(p_old_status, 'pending');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  IF p_new_status = old_st THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;

  IF p_new_status = 'cancelled' AND old_st IN ('shipped', 'refused', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Impossible d''annuler : le colis est déjà parti. Passe par « Refus livraison » puis « Retour reçu ».'
    );
  END IF;

  IF p_new_status = 'cancelled' AND old_st NOT IN ('shipped', 'refused', 'delivered', 'cancelled') THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready') AND old_st = 'pending' THEN
    PERFORM public._extend_order_stock_reservations(p_order_id, NULL);
    RETURN jsonb_build_object('success', true, 'extended', true, 'expires_at', NULL);
  END IF;

  IF p_new_status IN ('confirmed', 'shipped', 'ready', 'refused') THEN
    PERFORM public._extend_order_stock_reservations(p_order_id, NULL);
  END IF;

  IF p_new_status = 'returned' THEN
    RETURN public.release_order_stock_reservations(p_order_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'skipped', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_pos_sale_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_city text,
  p_delivery_mode text,
  p_payment_method text,
  p_total numeric,
  p_items jsonb,
  p_date text,
  p_status text DEFAULT 'delivered',
  p_store_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id text;
  qty integer;
  order_date timestamptz;
  order_status text;
  store_id uuid;
  staff_id uuid;
  subtotal numeric := 0;
  discount numeric := GREATEST(COALESCE(p_discount_amount, 0), 0);
  expected_total numeric;
  line_price numeric;
  line_qty integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  order_date := COALESCE(p_date::timestamptz, now());
  order_status := COALESCE(NULLIF(trim(p_status), ''), 'delivered');

  SELECT s.staff_id, COALESCE(p_store_id, s.store_id, public._default_store_id())
  INTO staff_id, store_id
  FROM public._staff_from_jwt() s;

  store_id := COALESCE(p_store_id, store_id, public._default_store_id());
  staff_id := COALESCE(p_staff_id, staff_id);

  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique assignée au vendeur');
  END IF;

  IF staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendeur non identifié');
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    line_price := COALESCE((item->>'price')::numeric, 0);
    line_qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    subtotal := subtotal + (line_price * line_qty);
  END LOOP;

  IF discount > subtotal THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remise supérieure au sous-total');
  END IF;

  expected_total := subtotal - discount;
  IF ABS(COALESCE(p_total, 0) - expected_total) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Total incohérent avec la remise (attendu ' || expected_total::text || ')'
    );
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    product_id := item->>'id';
    qty := GREATEST(COALESCE((item->>'quantity')::integer, 1), 1);
    IF product_id IS NULL OR qty <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Article de panier invalide');
    END IF;
    PERFORM public._store_sale_line(store_id, product_id, qty, p_order_id, staff_id, 'sale');
  END LOOP;

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id, staff_id,
    discount_amount
  ) VALUES (
    p_order_id, p_customer_name, p_customer_email, p_customer_phone, p_customer_city,
    p_delivery_mode, p_payment_method, expected_total, p_items, order_status, order_date,
    store_id, staff_id, discount
  );

  PERFORM public._insert_order_items(p_order_id, p_items);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'store_id', store_id,
    'subtotal', subtotal,
    'discount_amount', discount,
    'total', expected_total
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- complete_troc_with_sale_atomic : garde staff ajoutée — corps identique à 012
CREATE OR REPLACE FUNCTION public.complete_troc_with_sale_atomic(
  p_trade_in_request_id text,
  p_order_id text,
  p_payment_method text,
  p_date text DEFAULT NULL,
  p_redemption_reason text DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dossier record;
  target record;
  credit numeric;
  reste numeric;
  order_date timestamptz;
  order_item jsonb;
  store_id uuid;
  staff_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  order_date := COALESCE(p_date::timestamptz, now());

  SELECT s.staff_id, COALESCE(p_store_id, s.store_id, public._default_store_id())
  INTO staff_id, store_id
  FROM public._staff_from_jwt() s;

  store_id := COALESCE(p_store_id, store_id, public._default_store_id());
  staff_id := COALESCE(p_staff_id, staff_id);

  IF store_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune boutique assignée');
  END IF;

  IF staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendeur non identifié');
  END IF;

  SELECT id, status, target_product_id, target_product_name, trade_in_value,
         customer_name, customer_email, customer_phone, completed_order_id
  INTO dossier
  FROM trade_in_requests
  WHERE id = p_trade_in_request_id
  FOR UPDATE;

  IF dossier.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier troc introuvable.');
  END IF;
  IF dossier.completed_order_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier déjà clôturé.', 'order_id', dossier.completed_order_id);
  END IF;
  IF dossier.status IS DISTINCT FROM 'validated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le dossier doit être en statut validated pour finaliser la vente.');
  END IF;
  IF dossier.target_product_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun appareil cible sur ce dossier.');
  END IF;

  SELECT id, name, price, stock, image INTO target
  FROM products WHERE id = dossier.target_product_id FOR UPDATE;

  IF target.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appareil cible introuvable au catalogue.');
  END IF;

  credit := COALESCE(dossier.trade_in_value, 0);
  reste := GREATEST(0, ROUND(COALESCE(target.price, 0) - credit));

  order_item := jsonb_build_array(jsonb_build_object(
    'id', target.id, 'name', target.name, 'price', target.price, 'quantity', 1, 'image', target.image
  ));

  INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_city,
    delivery_mode, payment_method, total, items, status, date, store_id, staff_id
  ) VALUES (
    p_order_id, dossier.customer_name, dossier.customer_email, dossier.customer_phone,
    'Retrait Boutique (Troc)', 'pickup', p_payment_method, reste, order_item,
    'delivered', order_date, store_id, staff_id
  );

  PERFORM public._store_sale_line(store_id, target.id, 1, p_order_id, staff_id, 'sale');
  PERFORM public._insert_order_items(p_order_id, order_item);

  UPDATE trade_in_requests SET
    status = 'completed',
    completed_at = order_date,
    completed_order_id = p_order_id,
    credit_applied = credit,
    redemption_reason = NULLIF(trim(p_redemption_reason), '')
  WHERE id = dossier.id;

  RETURN jsonb_build_object(
    'success', true, 'order_id', p_order_id,
    'target_name', COALESCE(target.name, dossier.target_product_name, ''),
    'target_price', COALESCE(target.price, 0),
    'credit', credit, 'reste', reste
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande déjà enregistrée: ' || p_order_id);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Droits : helper pour REVOKE + GRANT par nom ─────────────────────────────
DO $$
DECLARE
  r record;
  fn text;
  internal_only text[] := ARRAY[
    '_default_store_id', '_extend_order_stock_reservations', '_insert_order_items',
    '_pick_store_for_cart', '_staff_from_jwt', '_store_reserve_line', '_store_sale_line',
    'ensure_order_feedback_invites', 'ensure_sav_feedback_invite',
    'trg_orders_feedback_invites', 'trg_repair_tickets_feedback_invite',
    'trg_sync_product_stock_from_stores'
  ];
  service_only text[] := ARRAY[
    'confirm_order_payment_and_consume_stock', 'release_order_stock_reservations',
    'consume_order_stock_reservations', 'sync_staff_auth_display_name',
    'expire_stock_reservations', 'process_shipped_reservation_losses'
  ];
  staff_rpc text[] := ARRAY[
    'complete_pos_sale_atomic', 'complete_troc_with_sale_atomic', 'mark_order_cash_paid',
    'sync_order_stock_on_status', 'set_product_catalog_stock', 'redistribute_product_stock',
    'get_shipment_reservation_alerts', 'get_pending_orders_with_reservations',
    'get_stock_reservations_overview', 'get_product_stock_mismatches',
    'get_staff_sales_summary', 'list_staff_sales',
    'list_due_feedback_invites', 'mark_feedback_invite_sent'
  ];
  public_rpc text[] := ARRAY[
    'create_order_atomic', 'get_feedback_invite', 'submit_feedback',
    'get_certificate_by_token', 'get_imei_certificate_by_token', 'get_troc_monthly_count'
  ];
BEGIN
  -- B + C : helpers et triggers — fermés au monde
  FOREACH fn IN ARRAY internal_only LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn, r.args);
    END LOOP;
  END LOOP;

  -- D + E : cron et backend
  FOREACH fn IN ARRAY service_only LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', fn, r.args);
    END LOOP;
  END LOOP;

  -- F : ERP staff
  FOREACH fn IN ARRAY staff_rpc LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', fn, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', fn, r.args);
    END LOOP;
  END LOOP;

  -- A : public volontaire — PUBLIC d'abord, puis GRANT explicite anon
  FOREACH fn IN ARRAY public_rpc LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', fn, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated, service_role', fn, r.args);
    END LOOP;
  END LOOP;
END $$;

COMMIT;

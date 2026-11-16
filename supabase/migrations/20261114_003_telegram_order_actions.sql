-- Migration 20261114_003_telegram_order_actions.sql
-- Boutons d'action sur les alertes de commande du groupe Telegram staff.
--
-- 1. telegram_staff_order_action(p_order_id, p_action, p_telegram_user_id, p_reason) :
--    RPC du bot (service_role). Actions :
--      delivered       commande déjà payée -> étapes intermédiaires (planDeliveredSteps) puis livrée ;
--      cash_delivered  espèces reçues -> mêmes étapes, mark_order_cash_paid, puis livrée ;
--      unreachable     mark_order_unreachable (une tentative au plus toutes les 10 min) ;
--      cancelled       cancel_order_with_stock, motif de la liste fermée ORDER_CANCEL_REASONS.
--    Droits : tout staff lié pour delivered / cash_delivered / unreachable ; annulation réservée
--    aux rôles admis par _assert_responsable (responsable, direction, super_admin).
--    Tout se fait dans une seule transaction : une étape refusée annule l'ensemble.
--
--    Exception documentée (RAIDER, réutilisation) : les RPC existantes identifient le staff par le
--    JWT (_current_staff_ctx, auth.uid()). Après vérification du lien Telegram -> staff, la fonction
--    leur présente les claims du compte lié, pour la transaction seulement
--    (set_config(..., true)), au lieu de dupliquer la logique de stock, d'encaissement et d'annulation.
--    app.actor_name est posé comme pour le troc (« Par : X » sur les alertes, 20261020_014).
--
-- 2. mark_order_cash_paid : était exécutable par anon sans garde staff (n'importe qui pouvait passer
--    une commande en payée et consommer son stock). Garde staff ajoutée, EXECUTE retiré à PUBLIC/anon.
--    Le corps est inchangé par ailleurs (20260910_004).
--
-- Idempotent : rejouable sans erreur.

BEGIN;

-- 1. Action de commande depuis Telegram ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telegram_staff_order_action(
  p_order_id text,
  p_action text,
  p_telegram_user_id text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Miroir de ORDER_CANCEL_REASONS (utils/orderWorkflow.ts), vérifié par tests/telegram-order-actions.test.ts
  c_reasons constant text[] := ARRAY['Client injoignable', 'Client a renoncé', 'Rupture de stock', 'Doublon', 'Prix ou délai refusé'];
  c_open    constant text[] := ARRAY['pending', 'confirmed', 'ready', 'shipped'];
  v_auth_user_id uuid;
  v_email   text;
  v_role    text;
  v_name    text;
  v_order   public.orders%ROWTYPE;
  v_handover text;
  v_steps   text[];
  v_step    text;
  v_from    text;
  v_res     jsonb;
BEGIN
  SELECT l.auth_user_id, lower(u.email), lower(s.role), nullif(trim(s.name), '')
    INTO v_auth_user_id, v_email, v_role, v_name
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL OR v_role NOT IN
      ('vendeur', 'editor', 'responsable', 'manager', 'manager_vente', 'direction', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Staff link not found' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('delivered', 'cash_delivered', 'unreachable', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported order action' USING ERRCODE = '22023';
  END IF;

  IF p_order_id IS NULL OR length(p_order_id) < 1 OR length(p_order_id) > 64 THEN
    RAISE EXCEPTION 'Invalid order ID' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'cancelled' THEN
    -- Même liste que _assert_responsable (appelé par cancel_order_with_stock).
    IF v_role NOT IN ('responsable', 'direction', 'super_admin') THEN
      RAISE EXCEPTION 'Cancellation requires responsable or higher' USING ERRCODE = '42501';
    END IF;
    IF p_reason IS NULL OR NOT (p_reason = ANY (c_reasons)) THEN
      RAISE EXCEPTION 'Cancellation reason must come from the closed list' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Locaux à la transaction (voir l'en-tête) : identité du staff lié pour les RPC réutilisées.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', v_auth_user_id, 'email', v_email, 'role', 'authenticated')::text, true);
  PERFORM set_config('app.actor_name', coalesce(v_name, ''), true);

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('changed', false, 'outcome', 'not_found');
  END IF;

  IF v_order.delivery_mode = 'pos' OR NOT (v_order.status = ANY (c_open)) THEN
    RETURN jsonb_build_object('changed', false, 'outcome', 'closed', 'status', v_order.status);
  END IF;

  IF p_action = 'unreachable' THEN
    v_res := public.mark_order_unreachable(p_order_id);
    IF coalesce((v_res->>'skipped')::boolean, false) THEN
      RETURN jsonb_build_object('changed', false, 'outcome', 'unreachable_recent',
        'count', v_res->'count', 'status', v_order.status);
    END IF;

  ELSIF p_action = 'cancelled' THEN
    IF v_order.status = 'shipped' THEN
      -- Colis parti : refus de livraison puis retour, depuis l'admin (sync_order_stock_on_status).
      RETURN jsonb_build_object('changed', false, 'outcome', 'shipped', 'status', v_order.status);
    END IF;
    v_res := public.cancel_order_with_stock(p_order_id, p_reason);
    IF NOT coalesce((v_res->>'success')::boolean, false) THEN
      RAISE EXCEPTION '%', coalesce(v_res->>'error', 'Annulation refusée') USING ERRCODE = 'P0001';
    END IF;

  ELSE
    IF coalesce(v_order.payment_status, '') <> 'paid' AND p_action = 'delivered' THEN
      RETURN jsonb_build_object('changed', false, 'outcome', 'needs_payment', 'status', v_order.status);
    END IF;

    -- Miroir de planDeliveredSteps (utils/orderWorkflow.ts) : remise au client puis livrée.
    v_handover := CASE WHEN v_order.delivery_mode = 'delivery' THEN 'shipped' ELSE 'ready' END;
    v_steps := CASE v_order.status
      WHEN 'pending'   THEN ARRAY['confirmed', v_handover]
      WHEN 'confirmed' THEN ARRAY[v_handover]
      ELSE ARRAY[]::text[] END;

    v_from := v_order.status;
    FOREACH v_step IN ARRAY v_steps LOOP
      v_res := public.sync_order_stock_on_status(p_order_id, v_step, v_from);
      IF NOT coalesce((v_res->>'success')::boolean, false) THEN
        RAISE EXCEPTION '%', coalesce(v_res->>'error', 'Étape refusée') USING ERRCODE = 'P0001';
      END IF;
      UPDATE public.orders SET status = v_step WHERE id = p_order_id;
      v_from := v_step;
    END LOOP;

    IF coalesce(v_order.payment_status, '') <> 'paid' THEN
      v_res := public.mark_order_cash_paid(p_order_id, v_email);
      IF NOT coalesce((v_res->>'success')::boolean, false) THEN
        RAISE EXCEPTION '%', coalesce(v_res->>'error', 'Encaissement refusé') USING ERRCODE = 'P0001';
      END IF;
    END IF;

    v_res := public.sync_order_stock_on_status(p_order_id, 'delivered', v_from);
    IF NOT coalesce((v_res->>'success')::boolean, false) THEN
      RAISE EXCEPTION '%', coalesce(v_res->>'error', 'Livraison refusée') USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.orders SET status = 'delivered' WHERE id = p_order_id;
  END IF;

  INSERT INTO public.telegram_staff_action_audit
    (telegram_user_id, auth_user_id, action, resource_id)
  VALUES
    (p_telegram_user_id, v_auth_user_id, 'order.' || p_action, p_order_id);

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  RETURN jsonb_build_object(
    'changed', true,
    'outcome', p_action,
    'status', v_order.status,
    'count', v_order.unreachable_count,
    'actor', v_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_order_action(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_order_action(text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.telegram_staff_order_action(text, text, text, text) IS
  'Order outcome from the Telegram staff group (delivered, cash_delivered, unreachable, cancelled); role-gated, audited, service-role only.';

-- 2. Encaissement espèces : garde staff ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_cash_paid(p_order_id text, p_staff_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_staff_id uuid;
  v_email text;
BEGIN
  -- 0. Réservé à l'équipe (même garde que sync_order_stock_on_status).
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  -- 1. Vérifier la commande
  SELECT id, total, status, payment_status, payment_method, customer_phone
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  -- 2. Idempotence : si déjà payée, succès immédiat sans erreur
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'message', 'Commande déjà enregistrée comme payée');
  END IF;

  -- 3. Résolution du staff
  v_email := lower(COALESCE(NULLIF(trim(p_staff_email), ''), auth.jwt() ->> 'email', ''));

  IF v_email <> '' THEN
    SELECT id INTO v_staff_id FROM public.staff WHERE lower(email) = v_email LIMIT 1;
  END IF;

  IF v_staff_id IS NULL THEN
    SELECT id INTO v_staff_id FROM public.staff ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 4. Mettre à jour le staff sur orders si présent
  IF v_staff_id IS NOT NULL THEN
    UPDATE public.orders
    SET staff_id = COALESCE(staff_id, v_staff_id)
    WHERE id = p_order_id AND staff_id IS NULL;
  END IF;

  -- 5. Insérer dans order_payments
  INSERT INTO public.order_payments (
    order_id, reference, amount, currency, channel, provider, phone, status, paid_at, staff_id
  ) VALUES (
    v_order.id,
    'CASH-' || v_order.id || '-' || floor(extract(epoch FROM now()))::bigint,
    GREATEST(v_order.total::integer, 0),
    'XAF',
    'cash',
    'cash',
    COALESCE(NULLIF(trim(v_order.customer_phone), ''), '23700000000'),
    'paid',
    now(),
    v_staff_id
  );

  RETURN public.confirm_order_payment_and_consume_stock(p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_cash_paid(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_cash_paid(text, text) TO authenticated, service_role;

COMMIT;

-- Bot Telegram : réception d'arrivage (+N) et correction d'inventaire (chiffre compté + motif)
-- sur la fiche produit d'une boutique précise. Responsable et plus ; un responsable n'agit que
-- sur sa boutique, la direction sur toutes. Même mouvement tracé que l'ERP (_store_stock_delta).
--
-- callback_data et tags ForceReply ne sont pas signés : l'acteur est ré-identifié par
-- telegram_staff_links, la boutique et le rang revérifiés ici. p_request_key = chat:message_id
-- du message d'invite, une réponse rejouée ne crée pas un second mouvement. Additif et rejouable.

BEGIN;

-- Boutique cible autorisée pour l'acteur, ou exception.
CREATE OR REPLACE FUNCTION public._telegram_stock_store(
  p_rank int,
  p_actor_store uuid,
  p_store_code text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store uuid;
BEGIN
  IF p_rank < 1 THEN
    RAISE EXCEPTION 'Responsable only' USING ERRCODE = '42501';
  END IF;
  SELECT s.id INTO v_store FROM public.stores s WHERE s.code = p_store_code;
  IF v_store IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_rank < 2 AND v_store IS DISTINCT FROM p_actor_store THEN
    RAISE EXCEPTION 'Store outside scope' USING ERRCODE = '42501';
  END IF;
  RETURN v_store;
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_stock_receive(
  p_telegram_user_id text,
  p_product_id text,
  p_store_code text,
  p_quantity integer,
  p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_store uuid;
  v_before integer;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  v_store := public._telegram_stock_store(v_actor.o_rank, v_actor.o_store_id, p_store_code);

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 500
     OR coalesce(length(p_request_key), 0) NOT BETWEEN 3 AND 64 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 500' USING ERRCODE = '22023';
  END IF;
  IF v_store IS NULL OR NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('telegram_stock:' || p_request_key));
  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE ref_type = 'telegram_stock' AND ref_id = p_request_key
  ) THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'already_done');
  END IF;

  SELECT coalesce(ss.quantity, 0) INTO v_before
  FROM public.store_stock ss WHERE ss.store_id = v_store AND ss.product_id = p_product_id;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  PERFORM public._store_stock_delta(
    v_store, p_product_id, p_quantity, 'inventory_adjust'::public.stock_movement_reason,
    'telegram_stock', p_request_key, v_actor.o_staff_id, 'Réception (Telegram)'
  );

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id, 'stock.receive+' || p_quantity, p_product_id);

  RETURN jsonb_build_object(
    'changed', true, 'before', coalesce(v_before, 0), 'after', coalesce(v_before, 0) + p_quantity
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_stock_correct(
  p_telegram_user_id text,
  p_product_id text,
  p_store_code text,
  p_counted integer,
  p_reason text,
  p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_store uuid;
  v_store_name text;
  v_product_name text;
  v_before integer;
  v_reserved integer;
  v_delta integer;
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  v_store := public._telegram_stock_store(v_actor.o_rank, v_actor.o_store_id, p_store_code);

  IF p_counted IS NULL OR p_counted < 0 OR p_counted > 10000
     OR length(v_reason) NOT BETWEEN 3 AND 80
     OR coalesce(length(p_request_key), 0) NOT BETWEEN 3 AND 64 THEN
    RAISE EXCEPTION 'Invalid correction' USING ERRCODE = '22023';
  END IF;

  SELECT p.name INTO v_product_name FROM public.products p WHERE p.id = p_product_id;
  IF v_store IS NULL OR v_product_name IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('telegram_stock:' || p_request_key));
  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE ref_type = 'telegram_stock' AND ref_id = p_request_key
  ) THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'already_done');
  END IF;

  SELECT ss.quantity, ss.reserved INTO v_before, v_reserved
  FROM public.store_stock ss
  WHERE ss.store_id = v_store AND ss.product_id = p_product_id
  FOR UPDATE;
  v_before := coalesce(v_before, 0);
  v_reserved := coalesce(v_reserved, 0);

  -- Des unités sont réservées pour des commandes : on ne peut pas descendre en dessous.
  IF p_counted < v_reserved THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'below_reserved', 'reserved', v_reserved);
  END IF;

  v_delta := p_counted - v_before;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'same', 'before', v_before, 'after', v_before);
  END IF;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  PERFORM public._store_stock_delta(
    v_store, p_product_id, v_delta, 'inventory_adjust'::public.stock_movement_reason,
    'telegram_stock', p_request_key, v_actor.o_staff_id, 'Correction (Telegram) : ' || v_reason
  );

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id, 'stock.correct' || (CASE WHEN v_delta > 0 THEN '+' ELSE '' END || v_delta), p_product_id);

  SELECT s.name INTO v_store_name FROM public.stores s WHERE s.id = v_store;
  INSERT INTO public.admin_notifications (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
  VALUES (
    'stock_correction.' || p_request_key, 'stock_correction', 'Correction de stock',
    format('%s — %s → %s (%s) — %s — motif : %s',
      v_product_name, v_before, p_counted, (CASE WHEN v_delta > 0 THEN '+' ELSE '' END || v_delta),
      coalesce(v_store_name, 'Boutique'), v_reason),
    'products', p_product_id, 'telegram'
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN jsonb_build_object('changed', true, 'before', v_before, 'after', p_counted, 'delta', v_delta);
END;
$$;

REVOKE ALL ON FUNCTION public._telegram_stock_store(int, uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.telegram_staff_stock_receive(text, text, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_stock_receive(text, text, text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_stock_correct(text, text, text, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_stock_correct(text, text, text, integer, text, text) TO service_role;

COMMIT;

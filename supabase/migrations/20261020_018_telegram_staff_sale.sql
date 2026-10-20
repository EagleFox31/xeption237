-- Vente comptoir depuis le bot Telegram (scénario 1 : vente standard, 1 article, paiement unique).
--
-- Service role uniquement (Edge Function telegram-bot-entry) ; l'acteur est ré-identifié
-- par telegram_staff_links car callback_data n'est pas signé. Boutique et vendeur viennent
-- de l'acteur, le prix de products : rien de ce qui est encaissé ne vient du client.
-- Le parcours (produit → paiement → client → validation) vit dans telegram_sale_drafts :
-- son order_id, fixé à l'ouverture, rend la validation idempotente (double-tap = no-op).
-- La vente elle-même passe par _pos_sale_core (20261020_017), comme l'ERP.
-- Additif et rejouable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_sale_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  auth_user_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  store_id uuid NOT NULL,
  -- [{product_id, name, quantity, unit_price}] : prêt pour les accessoires (scénario 5).
  lines jsonb NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  -- Validé par les RPC (pas de CHECK) : le paiement mixte (scénario 3) l'élargira.
  payment_method text NOT NULL,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  order_id text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_sale_drafts_user
  ON public.telegram_sale_drafts (telegram_user_id, created_at);

-- Aucune policy : seules les RPC SECURITY DEFINER ci-dessous y accèdent.
ALTER TABLE public.telegram_sale_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_sale_drafts FROM PUBLIC, anon, authenticated;

-- Acteur lié et non banni, quel que soit son rang (un vendeur vend) ; sinon 42501.
CREATE OR REPLACE FUNCTION public._telegram_staff_actor(
  p_telegram_user_id text,
  OUT o_auth_user_id uuid, OUT o_staff_id uuid, OUT o_staff_name text, OUT o_rank int,
  OUT o_store_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT l.auth_user_id, s.id, s.name, public._staff_role_rank(s.role), s.store_id
    INTO o_auth_user_id, o_staff_id, o_staff_name, o_rank, o_store_id
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
  LIMIT 1;
  IF o_auth_user_id IS NULL OR o_rank IS NULL THEN
    RAISE EXCEPTION 'Staff only' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_open(
  p_telegram_user_id text,
  p_product_id text,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_product record;
  v_available int;
  v_draft public.telegram_sale_drafts%ROWTYPE;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('CASH', 'OM', 'MOMO') THEN
    RAISE EXCEPTION 'Invalid payment method' USING ERRCODE = '22023';
  END IF;
  IF v_actor.o_store_id IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;

  SELECT p.id, p.name, p.price INTO v_product FROM public.products p WHERE p.id = p_product_id;
  IF NOT FOUND OR coalesce(v_product.price, 0) <= 0 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  -- Pré-contrôle pour l'affichage ; le contrôle qui fait foi est celui de _store_sale_line.
  SELECT coalesce(ss.quantity, 0) - coalesce(ss.reserved, 0) INTO v_available
  FROM public.store_stock ss
  WHERE ss.store_id = v_actor.o_store_id AND ss.product_id = p_product_id;
  IF coalesce(v_available, 0) < 1 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'out_of_stock', 'product_name', v_product.name);
  END IF;

  -- Purge à la volée des brouillons morts de cet utilisateur.
  DELETE FROM public.telegram_sale_drafts
  WHERE telegram_user_id = p_telegram_user_id AND status <> 'completed'
    AND expires_at < now() - interval '1 day';

  v_draft.id := gen_random_uuid();
  INSERT INTO public.telegram_sale_drafts (
    id, telegram_user_id, auth_user_id, staff_id, store_id, lines, payment_method, order_id
  ) VALUES (
    v_draft.id, p_telegram_user_id, v_actor.o_auth_user_id, v_actor.o_staff_id, v_actor.o_store_id,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'quantity', 1, 'unit_price', v_product.price
    )),
    p_payment_method,
    'POS-TG-' || upper(substr(replace(v_draft.id::text, '-', ''), 1, 10))
  );

  RETURN jsonb_build_object(
    'changed', true, 'draft_id', v_draft.id, 'product_name', v_product.name,
    'price', v_product.price, 'payment_method', p_payment_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_set_customer(
  p_telegram_user_id text,
  p_draft_id uuid,
  p_customer_name text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_name text := nullif(trim(coalesce(p_customer_name, '')), '');
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  -- Même format que les commandes existantes : 9 chiffres locaux (6XXXXXXXX).
  IF v_name IS NULL OR length(v_name) > 60 OR coalesce(p_customer_phone, '') !~ '^6[0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid customer' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_draft FROM public.telegram_sale_drafts
  WHERE id = p_draft_id AND telegram_user_id = p_telegram_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_draft.status <> 'draft' THEN
    RETURN jsonb_build_object('changed', false, 'reason', v_draft.status, 'order_id', v_draft.order_id);
  END IF;
  IF v_draft.expires_at < now() THEN RETURN jsonb_build_object('changed', false, 'reason', 'expired'); END IF;

  UPDATE public.telegram_sale_drafts
  SET customer_name = v_name, customer_phone = p_customer_phone, updated_at = now()
  WHERE id = v_draft.id;

  RETURN jsonb_build_object(
    'changed', true, 'draft_id', v_draft.id, 'lines', v_draft.lines,
    'payment_method', v_draft.payment_method, 'discount_amount', v_draft.discount_amount,
    'customer_name', v_name, 'customer_phone', p_customer_phone
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_complete_sale(
  p_telegram_user_id text,
  p_draft_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_line jsonb;
  v_price numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_res jsonb;
  v_store_name text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);

  SELECT * INTO v_draft FROM public.telegram_sale_drafts
  WHERE id = p_draft_id AND telegram_user_id = p_telegram_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_draft.status = 'completed' THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'completed', 'order_id', v_draft.order_id);
  END IF;
  IF v_draft.status <> 'draft' THEN RETURN jsonb_build_object('changed', false, 'reason', v_draft.status); END IF;
  IF v_draft.expires_at < now() THEN RETURN jsonb_build_object('changed', false, 'reason', 'expired'); END IF;
  -- Un vendeur muté entre-temps ne vend pas sur son ancienne boutique.
  IF v_actor.o_store_id IS DISTINCT FROM v_draft.store_id THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;
  IF v_draft.customer_name IS NULL OR v_draft.customer_phone IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_customer');
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(v_draft.lines)
  LOOP
    SELECT p.price INTO v_price FROM public.products p WHERE p.id = v_line->>'product_id';
    IF v_price IS DISTINCT FROM (v_line->>'unit_price')::numeric THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'price_changed');
    END IF;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', v_line->>'product_id', 'name', v_line->>'name',
      'price', v_price, 'quantity', (v_line->>'quantity')::int
    ));
    v_subtotal := v_subtotal + v_price * (v_line->>'quantity')::int;
  END LOOP;
  v_total := v_subtotal - v_draft.discount_amount;

  -- _pos_sale_core signale un échec par success=false sans lever : on lève pour annuler
  -- toute écriture partielle (stock) avant de rendre la raison au bot.
  BEGIN
    v_res := public._pos_sale_core(
      v_draft.order_id, v_draft.customer_name, NULL, v_draft.customer_phone,
      'Retrait Boutique (POS)', 'pickup', v_draft.payment_method, v_total, v_items,
      now()::text, 'delivered', v_draft.store_id, v_actor.o_staff_id, v_draft.discount_amount
    );
    IF coalesce((v_res->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = coalesce(v_res->>'error', 'Vente refusée');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'sale_failed', 'error', SQLERRM);
  END;

  UPDATE public.telegram_sale_drafts SET status = 'completed', updated_at = now() WHERE id = v_draft.id;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id, 'sale.complete', v_draft.order_id);

  SELECT st.name INTO v_store_name FROM public.stores st WHERE st.id = v_draft.store_id;
  INSERT INTO public.admin_notifications (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
  VALUES (
    'pos_sale.' || v_draft.order_id, 'pos_sale', 'Vente comptoir',
    format('%s — %s FCFA — %s — %s',
      (SELECT string_agg(l->>'name', ', ') FROM jsonb_array_elements(v_draft.lines) l),
      to_char(v_total, 'FM999G999G999'),
      CASE v_draft.payment_method WHEN 'CASH' THEN 'Espèces' WHEN 'OM' THEN 'Orange Money'
        WHEN 'MOMO' THEN 'MTN MoMo' ELSE v_draft.payment_method END,
      coalesce(v_store_name, 'Boutique')),
    'orders', v_draft.order_id, 'telegram'
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN jsonb_build_object(
    'changed', true, 'order_id', v_draft.order_id, 'total', v_total,
    'customer_name', v_draft.customer_name, 'payment_method', v_draft.payment_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_cancel(
  p_telegram_user_id text,
  p_draft_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_status text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  SELECT status INTO v_status FROM public.telegram_sale_drafts
  WHERE id = p_draft_id AND telegram_user_id = p_telegram_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_status <> 'draft' THEN RETURN jsonb_build_object('changed', false, 'reason', v_status); END IF;
  UPDATE public.telegram_sale_drafts SET status = 'cancelled', updated_at = now() WHERE id = p_draft_id;
  RETURN jsonb_build_object('changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public._telegram_staff_actor(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_complete_sale(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_complete_sale(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_cancel(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_cancel(text, uuid) TO service_role;

COMMIT;

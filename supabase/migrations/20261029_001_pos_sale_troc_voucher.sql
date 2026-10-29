-- 20261029_001_pos_sale_troc_voucher.sql
-- Lot 4 : Vente avec reprise (bon troc déduit du panier au comptoir)

BEGIN;

-- 1. Ajout de la colonne trade_in_request_id dans telegram_sale_drafts
ALTER TABLE public.telegram_sale_drafts
  ADD COLUMN IF NOT EXISTS trade_in_request_id text REFERENCES public.trade_in_requests(id) ON DELETE SET NULL;

-- 2. Fonction de normalisation de référence du bon
-- Strictement identique à normalizeVoucherLookupRef dans utils/trocVoucherRef.ts
CREATE OR REPLACE FUNCTION public.normalize_voucher_lookup_ref(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text;
BEGIN
  IF p_raw IS NULL THEN
    RETURN '';
  END IF;
  v_ref := upper(regexp_replace(trim(p_raw), '\s+', '', 'g'));
  IF v_ref LIKE 'TR-TRC-%' OR v_ref LIKE 'TR-TRC%' THEN
    v_ref := substr(v_ref, 4);
  END IF;
  RETURN v_ref;
END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_voucher_lookup_ref(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_voucher_lookup_ref(text) TO service_role;

-- 3. Fonction de vérification d'éligibilité d'un bon pour le bot
CREATE OR REPLACE FUNCTION public.telegram_staff_troc_voucher_check(
  p_telegram_user_id text,
  p_voucher_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_norm_ref text;
  v_troc public.trade_in_requests%ROWTYPE;
  v_device text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_staff_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'unauthorized');
  END IF;

  v_norm_ref := public.normalize_voucher_lookup_ref(p_voucher_ref);
  IF v_norm_ref = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_troc
  FROM public.trade_in_requests
  WHERE public.normalize_voucher_lookup_ref(voucher_reference) = v_norm_ref
     OR public.normalize_voucher_lookup_ref(id) = v_norm_ref
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_troc.completed_order_id IS NOT NULL OR v_troc.status = 'completed' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'already_used',
      'order_id', v_troc.completed_order_id,
      'trade_in_id', v_troc.id
    );
  END IF;

  IF v_troc.status IN ('refused', 'cancelled') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'terminal_status',
      'status', v_troc.status,
      'trade_in_id', v_troc.id
    );
  END IF;

  IF v_troc.status <> 'validated' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'not_validated',
      'status', v_troc.status,
      'trade_in_id', v_troc.id
    );
  END IF;

  IF v_troc.voucher_expires_at IS NOT NULL AND v_troc.voucher_expires_at < now() THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'expired',
      'trade_in_id', v_troc.id,
      'voucher_expires_at', v_troc.voucher_expires_at
    );
  END IF;

  IF coalesce(v_troc.trade_in_value, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'zero_value',
      'trade_in_id', v_troc.id
    );
  END IF;

  v_device := concat_ws(' ', trim(coalesce(v_troc.device_brand, '') || ' ' || coalesce(v_troc.device_model, '')));
  IF v_troc.device_storage IS NOT NULL AND v_troc.device_storage <> '' THEN
    v_device := v_device || ' ' || v_troc.device_storage;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'trade_in_id', v_troc.id,
    'voucher_reference', coalesce(v_troc.voucher_reference, v_troc.id),
    'device_name', coalesce(nullif(v_device, ''), 'Appareil repris'),
    'trade_in_value', v_troc.trade_in_value,
    'customer_name', v_troc.customer_name,
    'customer_phone', v_troc.customer_phone,
    'target_product_id', v_troc.target_product_id,
    'target_product_name', v_troc.target_product_name,
    'voucher_expires_at', v_troc.voucher_expires_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_troc_voucher_check(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_troc_voucher_check(text, text) TO service_role;

-- 4. Recréation de telegram_staff_sale_draft_open avec support de trade_in_request_id
DROP FUNCTION IF EXISTS public.telegram_staff_sale_draft_open(text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_open(
  p_telegram_user_id text,
  p_product_id text,
  p_payment_method text,
  p_payment_split jsonb DEFAULT NULL,
  p_trade_in_request_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_product record;
  v_available int;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_split_len int;
  v_ch1 text;
  v_ch2 text;
  v_amt1 numeric;
  v_amt2 numeric;
  v_troc public.trade_in_requests%ROWTYPE;
  v_subtotal numeric;
  v_troc_credit numeric := 0;
  v_discount numeric := 0;
  v_remaining numeric;
  v_cust_name text := NULL;
  v_cust_phone text := NULL;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('CASH', 'OM', 'MOMO', 'MIXED', 'TROC') THEN
    RAISE EXCEPTION 'Invalid payment method' USING ERRCODE = '22023';
  END IF;
  IF v_actor.o_store_id IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;

  SELECT p.id, p.name, p.price INTO v_product FROM public.products p WHERE p.id = p_product_id;
  IF NOT FOUND OR coalesce(v_product.price, 0) <= 0 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  v_subtotal := v_product.price;

  -- Validation du dossier troc si fourni
  IF p_trade_in_request_id IS NOT NULL AND p_trade_in_request_id <> '' THEN
    SELECT * INTO v_troc FROM public.trade_in_requests WHERE id = p_trade_in_request_id;
    IF NOT FOUND OR v_troc.status <> 'validated' OR v_troc.completed_order_id IS NOT NULL THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'voucher_invalid');
    END IF;
    IF v_troc.voucher_expires_at IS NOT NULL AND v_troc.voucher_expires_at < now() THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'voucher_expired');
    END IF;

    v_troc_credit := coalesce(v_troc.trade_in_value, 0);
    v_discount := LEAST(v_subtotal, v_troc_credit);
    v_remaining := v_subtotal - v_discount;
    v_cust_name := nullif(trim(v_troc.customer_name), '');
    v_cust_phone := regexp_replace(coalesce(v_troc.customer_phone, ''), '\D', '', 'g');
    IF v_cust_phone LIKE '00237%' THEN
      v_cust_phone := substr(v_cust_phone, 6);
    ELSIF v_cust_phone LIKE '237%' AND length(v_cust_phone) = 12 THEN
      v_cust_phone := substr(v_cust_phone, 4);
    END IF;
    IF v_cust_phone !~ '^6[0-9]{8}$' THEN
      v_cust_phone := NULL;
    END IF;

    IF v_remaining = 0 THEN
      p_payment_method := 'TROC';
      p_payment_split := NULL;
    ELSE
      IF p_payment_method = 'TROC' THEN
        RAISE EXCEPTION 'Voucher does not cover full price' USING ERRCODE = '22023';
      END IF;
    END IF;
  ELSE
    v_discount := 0;
    v_remaining := v_subtotal;
    p_trade_in_request_id := NULL;
    IF p_payment_method = 'TROC' THEN
      RAISE EXCEPTION 'TROC payment requires a trade-in voucher' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Validation stricte du paiement mixte
  IF p_payment_method = 'MIXED' THEN
    IF p_payment_split IS NULL OR jsonb_typeof(p_payment_split) <> 'array' THEN
      RAISE EXCEPTION 'Invalid payment split' USING ERRCODE = '22023';
    END IF;
    v_split_len := jsonb_array_length(p_payment_split);
    IF v_split_len <> 2 THEN
      RAISE EXCEPTION 'Payment split must have exactly 2 channels' USING ERRCODE = '22023';
    END IF;

    v_ch1 := lower(trim(coalesce(p_payment_split->0->>'channel', '')));
    v_ch2 := lower(trim(coalesce(p_payment_split->1->>'channel', '')));
    IF v_ch1 NOT IN ('cash', 'om', 'momo') OR v_ch2 NOT IN ('cash', 'om', 'momo') OR v_ch1 = v_ch2 THEN
      RAISE EXCEPTION 'Payment split channels must be distinct among cash, om, momo' USING ERRCODE = '22023';
    END IF;

    v_amt1 := (p_payment_split->0->>'amount')::numeric;
    v_amt2 := (p_payment_split->1->>'amount')::numeric;
    IF v_amt1 IS NULL OR v_amt2 IS NULL OR v_amt1 <= 0 OR v_amt2 <= 0
       OR round(v_amt1) <> v_amt1 OR round(v_amt2) <> v_amt2 THEN
      RAISE EXCEPTION 'Payment split amounts must be positive integers' USING ERRCODE = '22023';
    END IF;

    IF (v_amt1 + v_amt2) <> v_remaining THEN
      RAISE EXCEPTION 'Payment split sum (%) must match remaining amount (%)', (v_amt1 + v_amt2), v_remaining USING ERRCODE = '22023';
    END IF;
  ELSE
    p_payment_split := NULL;
  END IF;

  -- Pré-contrôle stock
  SELECT coalesce(ss.quantity, 0) - coalesce(ss.reserved, 0) INTO v_available
  FROM public.store_stock ss
  WHERE ss.store_id = v_actor.o_store_id AND ss.product_id = p_product_id;
  IF coalesce(v_available, 0) < 1 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'out_of_stock', 'product_name', v_product.name);
  END IF;

  -- Purge à la volée des brouillons morts
  DELETE FROM public.telegram_sale_drafts
  WHERE telegram_user_id = p_telegram_user_id AND status <> 'completed'
    AND expires_at < now() - interval '1 day';

  v_draft.id := gen_random_uuid();
  INSERT INTO public.telegram_sale_drafts (
    id, telegram_user_id, auth_user_id, staff_id, store_id, lines,
    discount_amount, payment_method, payment_split, trade_in_request_id,
    customer_name, customer_phone, order_id
  ) VALUES (
    v_draft.id, p_telegram_user_id, v_actor.o_auth_user_id, v_actor.o_staff_id, v_actor.o_store_id,
    jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'quantity', 1, 'unit_price', v_product.price
    )),
    v_discount,
    p_payment_method,
    p_payment_split,
    p_trade_in_request_id,
    NULL,
    NULL,
    'POS-TG-' || upper(substr(replace(v_draft.id::text, '-', ''), 1, 10))
  );

  RETURN jsonb_build_object(
    'changed', true, 'draft_id', v_draft.id, 'product_name', v_product.name,
    'price', v_product.price, 'discount_amount', v_discount,
    'payment_method', p_payment_method,
    'payment_split', p_payment_split,
    'trade_in_request_id', p_trade_in_request_id,
    'customer_name', v_cust_name,
    'customer_phone', v_cust_phone
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb, text) TO service_role;

-- 5. Mise à jour de telegram_staff_sale_draft_set_customer pour renvoyer trade_in_request_id
CREATE OR REPLACE FUNCTION public.telegram_staff_sale_draft_set_customer(
  p_telegram_user_id text,
  p_draft_id uuid,
  p_customer_name text,
  p_customer_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_name text := nullif(trim(coalesce(p_customer_name, '')), '');
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
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
    'payment_method', v_draft.payment_method, 'payment_split', v_draft.payment_split,
    'discount_amount', v_draft.discount_amount,
    'trade_in_request_id', v_draft.trade_in_request_id,
    'customer_name', v_name, 'customer_phone', p_customer_phone
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) TO service_role;

-- 6. Mise à jour de telegram_staff_complete_sale avec déduction sous verrou, clôture troc atomique et traçabilité
CREATE OR REPLACE FUNCTION public.telegram_staff_complete_sale(
  p_telegram_user_id text,
  p_draft_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_draft public.telegram_sale_drafts%ROWTYPE;
  v_line jsonb;
  v_price numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_manual_discount numeric := 0;
  v_troc_discount numeric := 0;
  v_total_discount numeric := 0;
  v_total numeric;
  v_res jsonb;
  v_store_name text;
  v_split_elem jsonb;
  v_ch1 text;
  v_ch2 text;
  v_amt1 numeric;
  v_amt2 numeric;
  v_pay_detail text;
  v_troc public.trade_in_requests%ROWTYPE;
  v_troc_credit numeric := 0;
  v_credit_lost numeric := 0;
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
  IF v_actor.o_store_id IS DISTINCT FROM v_draft.store_id THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_store');
  END IF;
  IF v_draft.customer_name IS NULL OR v_draft.customer_phone IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_customer');
  END IF;

  -- Calcul du sous-total sur l'ensemble des lignes du panier
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

  -- Traitement sous verrou du dossier troc éventuel
  IF v_draft.trade_in_request_id IS NOT NULL THEN
    SELECT * INTO v_troc
    FROM public.trade_in_requests
    WHERE id = v_draft.trade_in_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_troc.status <> 'validated' OR v_troc.completed_order_id IS NOT NULL THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'voucher_invalid');
    END IF;

    IF v_troc.voucher_expires_at IS NOT NULL AND v_troc.voucher_expires_at < now() THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'voucher_expired');
    END IF;

    v_troc_credit := coalesce(v_troc.trade_in_value, 0);
    IF v_troc_credit <= 0 THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'voucher_invalid');
    END IF;

    -- Recalcul de la déduction troc sur l'ensemble du sous-total du panier
    v_troc_discount := LEAST(v_subtotal, v_troc_credit);
    v_credit_lost := GREATEST(0, v_troc_credit - v_subtotal);
  ELSE
    v_manual_discount := coalesce(v_draft.discount_amount, 0);
  END IF;

  v_total_discount := v_manual_discount + v_troc_discount;
  v_total := GREATEST(0, v_subtotal - v_total_discount);

  -- Contrôle anti-crash : si le mode est TROC mais qu'il reste un solde à payer
  -- (ex. baisse de valeur du bon entre l'ouverture et la finalisation), refuser pour
  -- éviter de violer order_payments_channel_check et demander au vendeur de recommencer.
  IF v_draft.payment_method = 'TROC' AND v_total > 0 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'voucher_changed');
  END IF;

  -- Si le montant de crédit déduit a varié par rapport au brouillon
  IF v_draft.trade_in_request_id IS NOT NULL AND v_troc_discount <> coalesce(v_draft.discount_amount, 0) THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'voucher_changed');
  END IF;

  -- Si total = 0 avec bon troc, la méthode est TROC
  IF v_total = 0 AND v_draft.trade_in_request_id IS NOT NULL THEN
    v_draft.payment_method := 'TROC';
  END IF;

  -- Validation stricte du paiement mixte pour le reliquat éventuel
  IF v_draft.payment_method = 'MIXED' THEN
    IF v_draft.payment_split IS NULL OR jsonb_typeof(v_draft.payment_split) <> 'array'
       OR jsonb_array_length(v_draft.payment_split) <> 2 THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
    v_ch1 := lower(trim(coalesce(v_draft.payment_split->0->>'channel', '')));
    v_ch2 := lower(trim(coalesce(v_draft.payment_split->1->>'channel', '')));
    IF v_ch1 NOT IN ('cash', 'om', 'momo') OR v_ch2 NOT IN ('cash', 'om', 'momo') OR v_ch1 = v_ch2 THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
    v_amt1 := (v_draft.payment_split->0->>'amount')::numeric;
    v_amt2 := (v_draft.payment_split->1->>'amount')::numeric;
    IF v_amt1 IS NULL OR v_amt2 IS NULL OR v_amt1 <= 0 OR v_amt2 <= 0
       OR round(v_amt1) <> v_amt1 OR round(v_amt2) <> v_amt2
       OR (v_amt1 + v_amt2) <> v_total THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'invalid_payment_split');
    END IF;
  END IF;

  -- Exécution atomique de la vente via _pos_sale_core
  BEGIN
    v_res := public._pos_sale_core(
      v_draft.order_id, v_draft.customer_name, NULL, v_draft.customer_phone,
      'Retrait Boutique (POS)', 'pickup', v_draft.payment_method, v_total, v_items,
      now()::text, 'delivered', v_draft.store_id, v_actor.o_staff_id, v_total_discount
    );
    IF coalesce((v_res->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = coalesce(v_res->>'error', 'Vente refusée');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'sale_failed', 'error', SQLERRM);
  END;

  -- Clôture atomique du dossier troc lié dans la même transaction
  IF v_draft.trade_in_request_id IS NOT NULL THEN
    UPDATE public.trade_in_requests
    SET
      status = 'completed',
      completed_at = now(),
      completed_order_id = v_draft.order_id,
      credit_applied = v_troc_discount,
      admin_notes = concat_ws(E'\n',
        nullif(trim(admin_notes), ''),
        format('Utilisé en vente comptoir %s par %s le %s%s',
          v_draft.order_id,
          coalesce(v_actor.o_staff_name, p_telegram_user_id),
          to_char(now() AT TIME ZONE 'Africa/Douala', 'DD/MM/YYYY HH24:MI'),
          CASE WHEN v_credit_lost > 0 THEN format(' (perte crédit non utilisé : %s FCFA)', to_char(v_credit_lost, 'FM999G999G999')) ELSE '' END
        )
      )
    WHERE id = v_draft.trade_in_request_id;
  END IF;

  -- Enregistrement déterministe dans order_payments pour les encaissements réels (v_total > 0)
  IF v_total > 0 THEN
    IF v_draft.payment_method = 'MIXED' THEN
      FOR v_split_elem IN SELECT value FROM jsonb_array_elements(v_draft.payment_split)
      LOOP
        INSERT INTO public.order_payments (
          order_id, reference, provider, amount, currency, channel, status, paid_at, staff_id
        ) VALUES (
          v_draft.order_id,
          'POS-' || v_draft.order_id || '-' || lower(trim(v_split_elem->>'channel')),
          'pos',
          (v_split_elem->>'amount')::numeric,
          'XAF',
          lower(trim(v_split_elem->>'channel')),
          'paid',
          now(),
          v_actor.o_staff_id
        )
        ON CONFLICT (reference) DO NOTHING;
      END LOOP;
    ELSE
      INSERT INTO public.order_payments (
        order_id, reference, provider, amount, currency, channel, status, paid_at, staff_id
      ) VALUES (
        v_draft.order_id,
        'POS-' || v_draft.order_id || '-' || lower(trim(v_draft.payment_method)),
        'pos',
        v_total,
        'XAF',
        lower(trim(v_draft.payment_method)),
        'paid',
        now(),
        v_actor.o_staff_id
      )
      ON CONFLICT (reference) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.telegram_sale_drafts SET status = 'completed', updated_at = now() WHERE id = v_draft.id;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id, 'sale.complete', v_draft.order_id);

  SELECT st.name INTO v_store_name FROM public.stores st WHERE st.id = v_draft.store_id;

  IF v_draft.payment_method = 'MIXED' THEN
    v_pay_detail := 'Mixte (' || (
      SELECT string_agg(
        CASE lower(trim(e->>'channel')) WHEN 'cash' THEN 'Espèces ' WHEN 'om' THEN 'OM ' WHEN 'momo' THEN 'MoMo ' ELSE lower(trim(e->>'channel')) || ' ' END ||
        to_char((e->>'amount')::numeric, 'FM999G999G999'),
        ' + '
      )
      FROM jsonb_array_elements(v_draft.payment_split) e
    ) || ')';
  ELSIF v_draft.payment_method = 'TROC' THEN
    v_pay_detail := 'Bon Troc (100%)';
  ELSE
    v_pay_detail := CASE v_draft.payment_method
      WHEN 'CASH' THEN 'Espèces'
      WHEN 'OM' THEN 'Orange Money'
      WHEN 'MOMO' THEN 'MTN MoMo'
      ELSE v_draft.payment_method
    END;
  END IF;

  INSERT INTO public.admin_notifications (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
  VALUES (
    'pos_sale.' || v_draft.order_id, 'pos_sale', 'Vente comptoir',
    format('%s — %s FCFA%s — %s — %s',
      (SELECT string_agg(l->>'name', ', ') FROM jsonb_array_elements(v_draft.lines) l),
      to_char(v_total, 'FM999G999G999'),
      CASE WHEN v_troc_discount > 0 THEN format(' (Reprise bon %s : −%s FCFA)', coalesce(v_troc.voucher_reference, v_troc.id), to_char(v_troc_discount, 'FM999G999G999')) ELSE '' END,
      v_pay_detail,
      coalesce(v_store_name, 'Boutique')),
    'orders', v_draft.order_id, 'telegram'
  )
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN jsonb_build_object(
    'changed', true, 'order_id', v_draft.order_id, 'total', v_total,
    'discount_amount', v_total_discount,
    'trade_in_request_id', v_draft.trade_in_request_id,
    'credit_applied', v_troc_discount,
    'customer_name', v_draft.customer_name,
    'payment_method', v_draft.payment_method,
    'payment_split', v_draft.payment_split
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.telegram_staff_complete_sale(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_complete_sale(text, uuid) TO service_role;

COMMIT;

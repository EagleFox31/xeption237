-- Bot Telegram staff : ventilation / répartition des stocks par boutique.
-- Réservé exclusivement à la direction (Jordan & Jennifer, rank >= 2).
-- Permet la répartition d'un modèle précis ou en masse (par marque / catégorie / global).
-- Utilise le moteur canonique _store_stock_delta avec motif 'redistribution'.
-- La somme totale du stock est strictement invariante.

BEGIN;

-- 1. Répartition pour un modèle précis
CREATE OR REPLACE FUNCTION public.telegram_staff_redistribute_product(
  p_telegram_user_id text,
  p_product_id text,
  p_mfoundi_qty integer,
  p_olembe_qty integer,
  p_siege_qty integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_prod record;
  v_total_stock int;
  v_target_total int;
  v_mfoundi_id uuid;
  v_olembe_id uuid;
  v_siege_id uuid;
  v_cur_mfoundi int := 0;
  v_cur_olembe int := 0;
  v_cur_siege int := 0;
  v_delta_mfoundi int;
  v_delta_olembe int;
  v_delta_siege int;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  SELECT id, name, stock INTO v_prod FROM public.products WHERE id = p_product_id;
  IF v_prod.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'product_not_found');
  END IF;

  IF p_mfoundi_qty < 0 OR p_olembe_qty < 0 OR p_siege_qty < 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'negative_quantity');
  END IF;

  v_total_stock := coalesce(v_prod.stock, 0);
  v_target_total := p_mfoundi_qty + p_olembe_qty + p_siege_qty;
  IF v_target_total <> v_total_stock THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'sum_mismatch',
      'expected', v_total_stock,
      'given', v_target_total
    );
  END IF;

  SELECT id INTO v_mfoundi_id FROM public.stores WHERE code = 'MFOUNDI';
  SELECT id INTO v_olembe_id FROM public.stores WHERE code = 'OLEMBE';
  SELECT id INTO v_siege_id FROM public.stores WHERE code = 'siege';

  IF v_mfoundi_id IS NULL OR v_olembe_id IS NULL OR v_siege_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'stores_not_configured');
  END IF;

  -- Quantités actuelles par boutique
  SELECT coalesce(quantity, 0) INTO v_cur_mfoundi
  FROM public.store_stock WHERE store_id = v_mfoundi_id AND product_id = p_product_id;

  SELECT coalesce(quantity, 0) INTO v_cur_olembe
  FROM public.store_stock WHERE store_id = v_olembe_id AND product_id = p_product_id;

  SELECT coalesce(quantity, 0) INTO v_cur_siege
  FROM public.store_stock WHERE store_id = v_siege_id AND product_id = p_product_id;

  v_delta_mfoundi := p_mfoundi_qty - v_cur_mfoundi;
  v_delta_olembe  := p_olembe_qty - v_cur_olembe;
  v_delta_siege   := p_siege_qty - v_cur_siege;

  IF v_delta_mfoundi = 0 AND v_delta_olembe = 0 AND v_delta_siege = 0 THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'no_change');
  END IF;

  -- 1ère passe : deltas négatifs (libération du stock source)
  IF v_delta_mfoundi < 0 THEN
    PERFORM public._store_stock_delta(
      v_mfoundi_id, p_product_id, v_delta_mfoundi,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;
  IF v_delta_olembe < 0 THEN
    PERFORM public._store_stock_delta(
      v_olembe_id, p_product_id, v_delta_olembe,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;
  IF v_delta_siege < 0 THEN
    PERFORM public._store_stock_delta(
      v_siege_id, p_product_id, v_delta_siege,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;

  -- 2ème passe : deltas positifs (attribution aux boutiques cibles)
  IF v_delta_mfoundi > 0 THEN
    PERFORM public._store_stock_delta(
      v_mfoundi_id, p_product_id, v_delta_mfoundi,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;
  IF v_delta_olembe > 0 THEN
    PERFORM public._store_stock_delta(
      v_olembe_id, p_product_id, v_delta_olembe,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;
  IF v_delta_siege > 0 THEN
    PERFORM public._store_stock_delta(
      v_siege_id, p_product_id, v_delta_siege,
      'redistribution'::public.stock_movement_reason,
      'telegram_redistribute', p_product_id, v_actor.o_staff_id, 'Ventilation Telegram'
    );
  END IF;

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (
    p_telegram_user_id,
    v_actor.o_auth_user_id,
    format('stock.redistribute:%s:M=%s,O=%s,S=%s', p_product_id, p_mfoundi_qty, p_olembe_qty, p_siege_qty),
    p_product_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'changed', true,
    'product_id', p_product_id,
    'product_name', v_prod.name,
    'mfoundi', p_mfoundi_qty,
    'olembe', p_olembe_qty,
    'siege', p_siege_qty
  );
END;
$$;

-- 2. Répartition en masse (par marque, catégorie ou global)
CREATE OR REPLACE FUNCTION public.telegram_staff_redistribute_bulk(
  p_telegram_user_id text,
  p_filter_type text,       -- 'all' | 'category' | 'brand'
  p_filter_value text,      -- 'phones', 'Samsung', ou uuid brand
  p_mfoundi_pct integer,    -- pourcentage cible (ex: 50)
  p_olembe_pct integer,     -- pourcentage cible (ex: 50)
  p_siege_pct integer       -- pourcentage cible (ex: 0)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_mfoundi_id uuid;
  v_olembe_id uuid;
  v_siege_id uuid;
  v_prod record;
  v_stock int;
  v_tgt_mfoundi int;
  v_tgt_olembe int;
  v_tgt_siege int;
  v_cur_mfoundi int;
  v_cur_olembe int;
  v_cur_siege int;
  v_delta_mfoundi int;
  v_delta_olembe int;
  v_delta_siege int;
  v_count_products int := 0;
  v_total_units int := 0;
  v_sum_mfoundi int := 0;
  v_sum_olembe int := 0;
  v_sum_siege int := 0;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  IF p_mfoundi_pct < 0 OR p_olembe_pct < 0 OR p_siege_pct < 0
     OR (p_mfoundi_pct + p_olembe_pct + p_siege_pct) <> 100 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_percentages');
  END IF;

  SELECT id INTO v_mfoundi_id FROM public.stores WHERE code = 'MFOUNDI';
  SELECT id INTO v_olembe_id FROM public.stores WHERE code = 'OLEMBE';
  SELECT id INTO v_siege_id FROM public.stores WHERE code = 'siege';

  IF v_mfoundi_id IS NULL OR v_olembe_id IS NULL OR v_siege_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'stores_not_configured');
  END IF;

  -- Parcourir chaque produit concerné ayant du stock > 0
  FOR v_prod IN
    SELECT p.id, p.name, p.stock
    FROM public.products p
    LEFT JOIN public.brands b ON b.id = p.brand
    WHERE p.stock > 0
      AND (
        p_filter_type = 'all'
        OR (p_filter_type = 'category' AND lower(p.category) = lower(p_filter_value))
        OR (p_filter_type = 'brand' AND (b.id::text = p_filter_value OR lower(b.name) = lower(p_filter_value)))
      )
    ORDER BY p.name
  LOOP
    v_stock := v_prod.stock;

    -- Répartition par produit : Mfoundi et Olembé selon ratios, reliquat exact au Siège
    v_tgt_mfoundi := floor((v_stock * p_mfoundi_pct) / 100);
    v_tgt_olembe  := floor((v_stock * p_olembe_pct) / 100);
    v_tgt_siege   := v_stock - v_tgt_mfoundi - v_tgt_olembe;

    SELECT coalesce(quantity, 0) INTO v_cur_mfoundi
    FROM public.store_stock WHERE store_id = v_mfoundi_id AND product_id = v_prod.id;

    SELECT coalesce(quantity, 0) INTO v_cur_olembe
    FROM public.store_stock WHERE store_id = v_olembe_id AND product_id = v_prod.id;

    SELECT coalesce(quantity, 0) INTO v_cur_siege
    FROM public.store_stock WHERE store_id = v_siege_id AND product_id = v_prod.id;

    v_delta_mfoundi := v_tgt_mfoundi - v_cur_mfoundi;
    v_delta_olembe  := v_tgt_olembe - v_cur_olembe;
    v_delta_siege   := v_tgt_siege - v_cur_siege;

    IF v_delta_mfoundi <> 0 OR v_delta_olembe <> 0 OR v_delta_siege <> 0 THEN
      -- Deltas négatifs d'abord
      IF v_delta_mfoundi < 0 THEN
        PERFORM public._store_stock_delta(
          v_mfoundi_id, v_prod.id, v_delta_mfoundi,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;
      IF v_delta_olembe < 0 THEN
        PERFORM public._store_stock_delta(
          v_olembe_id, v_prod.id, v_delta_olembe,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;
      IF v_delta_siege < 0 THEN
        PERFORM public._store_stock_delta(
          v_siege_id, v_prod.id, v_delta_siege,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;

      -- Deltas positifs ensuite
      IF v_delta_mfoundi > 0 THEN
        PERFORM public._store_stock_delta(
          v_mfoundi_id, v_prod.id, v_delta_mfoundi,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;
      IF v_delta_olembe > 0 THEN
        PERFORM public._store_stock_delta(
          v_olembe_id, v_prod.id, v_delta_olembe,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;
      IF v_delta_siege > 0 THEN
        PERFORM public._store_stock_delta(
          v_siege_id, v_prod.id, v_delta_siege,
          'redistribution'::public.stock_movement_reason,
          'telegram_bulk_redistribute', v_prod.id, v_actor.o_staff_id, 'Ventilation Masse Telegram'
        );
      END IF;

      v_count_products := v_count_products + 1;
    END IF;

    v_total_units := v_total_units + v_stock;
    v_sum_mfoundi := v_sum_mfoundi + v_tgt_mfoundi;
    v_sum_olembe  := v_sum_olembe + v_tgt_olembe;
    v_sum_siege   := v_sum_siege + v_tgt_siege;
  END LOOP;

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (
    p_telegram_user_id,
    v_actor.o_auth_user_id,
    format('stock.redistribute_bulk:%s:%s:M=%s%%,O=%s%%,S=%s%%', p_filter_type, coalesce(p_filter_value, 'all'), p_mfoundi_pct, p_olembe_pct, p_siege_pct),
    format('%s:%s', p_filter_type, coalesce(p_filter_value, 'all'))
  );

  RETURN jsonb_build_object(
    'success', true,
    'filter_type', p_filter_type,
    'filter_value', p_filter_value,
    'products_updated', v_count_products,
    'total_units', v_total_units,
    'allocated_mfoundi', v_sum_mfoundi,
    'allocated_olembe', v_sum_olembe,
    'allocated_siege', v_sum_siege
  );
END;
$$;

-- 3. Aperçu avant validation en masse (lecture seule pour confirmation)
CREATE OR REPLACE FUNCTION public.telegram_staff_redistribute_preview(
  p_telegram_user_id text,
  p_filter_type text,
  p_filter_value text,
  p_mfoundi_pct integer,
  p_olembe_pct integer,
  p_siege_pct integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_prod record;
  v_stock int;
  v_tgt_mfoundi int;
  v_tgt_olembe int;
  v_tgt_siege int;
  v_count_products int := 0;
  v_total_units int := 0;
  v_sum_mfoundi int := 0;
  v_sum_olembe int := 0;
  v_sum_siege int := 0;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  FOR v_prod IN
    SELECT p.id, p.name, p.stock
    FROM public.products p
    LEFT JOIN public.brands b ON b.id = p.brand
    WHERE p.stock > 0
      AND (
        p_filter_type = 'all'
        OR (p_filter_type = 'category' AND lower(p.category) = lower(p_filter_value))
        OR (p_filter_type = 'brand' AND (b.id::text = p_filter_value OR lower(b.name) = lower(p_filter_value)))
      )
  LOOP
    v_stock := v_prod.stock;
    v_tgt_mfoundi := floor((v_stock * p_mfoundi_pct) / 100);
    v_tgt_olembe  := floor((v_stock * p_olembe_pct) / 100);
    v_tgt_siege   := v_stock - v_tgt_mfoundi - v_tgt_olembe;

    v_count_products := v_count_products + 1;
    v_total_units    := v_total_units + v_stock;
    v_sum_mfoundi    := v_sum_mfoundi + v_tgt_mfoundi;
    v_sum_olembe     := v_sum_olembe + v_tgt_olembe;
    v_sum_siege      := v_sum_siege + v_tgt_siege;
  END LOOP;

  RETURN jsonb_build_object(
    'count_products', v_count_products,
    'total_units', v_total_units,
    'mfoundi', v_sum_mfoundi,
    'olembe', v_sum_olembe,
    'siege', v_sum_siege
  );
END;
$$;

-- Permissions strictes : service_role uniquement
REVOKE ALL ON FUNCTION public.telegram_staff_redistribute_product(text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_redistribute_product(text, text, integer, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_redistribute_bulk(text, text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_redistribute_bulk(text, text, text, integer, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_redistribute_preview(text, text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_redistribute_preview(text, text, text, integer, integer, integer) TO service_role;

COMMIT;

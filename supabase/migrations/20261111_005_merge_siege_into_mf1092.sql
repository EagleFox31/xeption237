-- Retrait du magasin test « siege » : la direction (11/11/2026) désigne Mfoundi-Mall 1092
-- (code MF1092) comme siège. Le magasin « siege » (is_default, porteur de tout le stock)
-- est fusionné dans MF1092 : stock, réservation active, session d'inventaire ouverte et
-- brouillon de caisse sont réaffectés ; commandes et mouvements historiques restent
-- rattachés à « siege » (traçabilité, FK RESTRICT). MF1092 devient le magasin par défaut,
-- « siege » est désactivé et renommé. Les fallbacks SQL `code = 'siege'` passent sur
-- public._default_store_id().
-- Idempotent : no-op si « siege » est déjà inactif ; refuse si un produit a déjà du stock
-- dans les deux magasins (fusion manuelle requise) ou si MF1092 est absent.
-- Prérequis vérifiés en prod le 11/11/2026 : 0 doublon store_stock siege/MF1092,
-- products.stock recalculé par trigger (somme invariante lors du transfert).
BEGIN;

DO $mig$
DECLARE
  v_old uuid;
  v_old_active boolean;
  v_new uuid;
  v_ref constant text := '20261111_005_merge_siege_into_mf1092';
BEGIN
  SELECT id, active INTO v_old, v_old_active FROM public.stores WHERE code = 'siege';
  SELECT id INTO v_new FROM public.stores WHERE code = 'MF1092' AND active = true;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Magasin MF1092 absent ou inactif : fusion impossible';
  END IF;

  IF v_old IS NOT NULL AND v_old_active THEN
    IF EXISTS (
      SELECT 1 FROM public.store_stock a
      JOIN public.store_stock b ON b.product_id = a.product_id AND b.store_id = v_new
      WHERE a.store_id = v_old
    ) THEN
      RAISE EXCEPTION 'Produits avec stock dans siege ET MF1092 : fusion manuelle requise';
    END IF;

    -- Trace comptable du transfert (somme invariante), avant la réaffectation.
    INSERT INTO public.stock_movements (store_id, product_id, delta, reason, ref_type, ref_id, note)
    SELECT ss.store_id, ss.product_id, -ss.quantity, 'transfer_out', 'migration', v_ref,
           'Fusion du magasin siege dans MF1092'
    FROM public.store_stock ss
    WHERE ss.store_id = v_old AND ss.quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements m
        WHERE m.ref_type = 'migration' AND m.ref_id = v_ref AND m.reason = 'transfer_out'
          AND m.product_id = ss.product_id
      );

    INSERT INTO public.stock_movements (store_id, product_id, delta, reason, ref_type, ref_id, note)
    SELECT v_new, ss.product_id, ss.quantity, 'transfer_in', 'migration', v_ref,
           'Fusion du magasin siege dans MF1092'
    FROM public.store_stock ss
    WHERE ss.store_id = v_old AND ss.quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements m
        WHERE m.ref_type = 'migration' AND m.ref_id = v_ref AND m.reason = 'transfer_in'
          AND m.product_id = ss.product_id
      );

    -- Réaffectation 1:1 (PK store_id+product_id sans conflit, cf. garde ci-dessus).
    UPDATE public.store_stock SET store_id = v_new, updated_at = now() WHERE store_id = v_old;

    UPDATE public.stock_reservations SET store_id = v_new
    WHERE store_id = v_old AND status = 'active';

    UPDATE public.stock_inventory_sessions SET store_id = v_new
    WHERE store_id = v_old AND status = 'open';

    UPDATE public.store_cash_drafts SET store_id = v_new WHERE store_id = v_old;

    UPDATE public.stores
    SET active = false, is_default = false, name = 'Ancien siège (archivé)', updated_at = now()
    WHERE id = v_old;
  END IF;

  -- Magasin par défaut = MF1092 (index unique partiel sur is_default = true).
  UPDATE public.stores SET is_default = false, updated_at = now()
  WHERE is_default = true AND id <> v_new;
  UPDATE public.stores SET is_default = true, updated_at = now()
  WHERE id = v_new AND is_default = false;
END
$mig$;

-- Fallbacks « siege » → magasin par défaut (définitions reprises de la prod, seule la
-- résolution du magasin change).
CREATE OR REPLACE FUNCTION public.telegram_staff_product_draft_upsert(p_telegram_user_id text, p_store_code text, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor record;
  v_store_id uuid;
  v_draft record;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 1 THEN
    RAISE EXCEPTION 'Staff responsable only' USING ERRCODE = '42501';
  END IF;

  -- Résolution de la boutique : Direction choisit ou utilise la sienne ; Responsable est borné à sa boutique
  IF v_actor.o_rank >= 2 AND p_store_code IS NOT NULL THEN
    SELECT s.id INTO v_store_id FROM public.stores s WHERE s.code = p_store_code;
  ELSE
    v_store_id := v_actor.o_store_id;
  END IF;

  IF v_store_id IS NULL THEN
    v_store_id := public._default_store_id();
  END IF;

  INSERT INTO public.telegram_product_drafts (
    telegram_user_id,
    auth_user_id,
    store_id,
    step
  )
  VALUES (
    p_telegram_user_id,
    v_actor.o_auth_user_id,
    v_store_id,
    'name'
  )
  ON CONFLICT (telegram_user_id) DO UPDATE SET
    store_id = coalesce(v_store_id, public.telegram_product_drafts.store_id),
    category = coalesce(p_patch->>'category', public.telegram_product_drafts.category),
    brand_id = CASE
      WHEN p_patch ? 'brand_id' THEN (p_patch->>'brand_id')::uuid
      ELSE public.telegram_product_drafts.brand_id
    END,
    name = coalesce(p_patch->>'name', public.telegram_product_drafts.name),
    condition = coalesce(p_patch->>'condition', public.telegram_product_drafts.condition),
    storage = coalesce(p_patch->>'storage', public.telegram_product_drafts.storage),
    ram = coalesce(p_patch->>'ram', public.telegram_product_drafts.ram),
    price = CASE
      WHEN p_patch ? 'price' THEN (p_patch->>'price')::numeric
      ELSE public.telegram_product_drafts.price
    END,
    stock = CASE
      WHEN p_patch ? 'stock' THEN (p_patch->>'stock')::integer
      ELSE public.telegram_product_drafts.stock
    END,
    images = CASE
      WHEN p_patch ? 'append_image' THEN array_append(coalesce(public.telegram_product_drafts.images, '{}'::text[]), p_patch->>'append_image')
      WHEN p_patch ? 'images' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'images'))
      ELSE public.telegram_product_drafts.images
    END,
    photo_message_id = CASE
      WHEN p_patch ? 'photo_message_id' THEN (p_patch->>'photo_message_id')::bigint
      ELSE public.telegram_product_drafts.photo_message_id
    END,
    step = coalesce(p_patch->>'step', public.telegram_product_drafts.step),
    fuzzy_match_id = CASE
      WHEN p_patch ? 'fuzzy_match_id' THEN p_patch->>'fuzzy_match_id'
      ELSE public.telegram_product_drafts.fuzzy_match_id
    END,
    updated_at = now()
  RETURNING * INTO v_draft;

  RETURN to_jsonb(v_draft);
END;
$function$

;

CREATE OR REPLACE FUNCTION public._telegram_staff_actor(p_telegram_user_id text, OUT o_auth_user_id uuid, OUT o_staff_id uuid, OUT o_staff_name text, OUT o_rank integer, OUT o_store_id uuid)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SELECT l.auth_user_id, s.id, s.name, public._staff_role_rank(s.role),
    coalesce(
      s.store_id,
      (SELECT st.id FROM public.stores st WHERE st.code = l.scope_store_code LIMIT 1),
      public._default_store_id(),
      (SELECT st.id FROM public.stores st ORDER BY st.created_at ASC LIMIT 1)
    )
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
$function$

;

COMMIT;

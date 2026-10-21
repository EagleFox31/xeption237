-- Migration 20261021_007 : Visibilité du catalogue (is_published) et création de produit Telegram masqué
-- 1. Ajoute `is_published` sur public.products (rétrocompatible : existants = true)
-- 2. Met à jour la RLS products_public_read pour que les visiteurs anonymes ne voient QUE les produits publiés
-- 3. Table telegram_product_drafts pour un parcours conversationnel sans risque de doublon
-- 4. RPCs telegram_staff_product_draft_upsert, telegram_staff_product_draft_cancel, telegram_staff_product_commit

BEGIN;

-- 1. Visibilité du produit sur le site
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Backfill immédiat : tous les produits existants sont publiés
UPDATE public.products
SET is_published = true
WHERE is_published = false;

CREATE INDEX IF NOT EXISTS products_is_published_idx
  ON public.products (is_published)
  WHERE is_published = true;

-- Mise à jour de la politique de lecture publique (RLS) :
-- Seuls les produits publiés sont visibles par le public (anon / authenticated non-staff)
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_staff_member());

-- 2. Table des brouillons de création de produit par Telegram
-- Une seule entrée active par utilisateur Telegram (idempotence, pas de doublon)
CREATE TABLE IF NOT EXISTS public.telegram_product_drafts (
  telegram_user_id text PRIMARY KEY,
  auth_user_id uuid,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  category text,                     -- 'phones' | 'computer' | 'accessories' | 'tablettes'
  brand_id uuid REFERENCES public.brands(id),
  name text,
  condition text DEFAULT 'refurbished', -- 'refurbished' | 'new'
  storage text,                      -- '64 Go', '128 Go', etc.
  ram text,                          -- '4 Go', '8 Go', etc.
  price numeric,
  stock integer DEFAULT 1,
  images text[] DEFAULT '{}'::text[],
  step text NOT NULL DEFAULT 'name', -- 'name' | 'duplicate_check' | 'category' | 'brand' | 'specs' | 'price' | 'stock' | 'photos' | 'confirm'
  fuzzy_match_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_product_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_product_drafts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.telegram_product_drafts TO service_role;

-- 3. RPC : Démarrer ou mettre à jour un brouillon
CREATE OR REPLACE FUNCTION public.telegram_staff_product_draft_upsert(
  p_telegram_user_id text,
  p_store_code text,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT s.id INTO v_store_id FROM public.stores s WHERE s.code = 'siege';
  END IF;

  INSERT INTO public.telegram_product_drafts (
    telegram_user_id, auth_user_id, store_id, step, updated_at
  ) VALUES (
    p_telegram_user_id, v_actor.o_auth_user_id, v_store_id, coalesce(p_patch->>'step', 'name'), now()
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
      WHEN p_patch ? 'images' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'images'))
      ELSE public.telegram_product_drafts.images
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
$$;

-- 4. RPC : Annuler un brouillon
CREATE OR REPLACE FUNCTION public.telegram_staff_product_draft_cancel(
  p_telegram_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.telegram_product_drafts WHERE telegram_user_id = p_telegram_user_id;
  RETURN true;
END;
$$;

-- 5. RPC : Finaliser et créer le produit (Masqué / Brouillon pour validation direction)
CREATE OR REPLACE FUNCTION public.telegram_staff_product_commit(
  p_telegram_user_id text,
  p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_draft record;
  v_product_id text;
  v_store_name text;
  v_store_code text;
  v_specs jsonb := '[]'::jsonb;
  v_main_image text;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_staff_actor(p_telegram_user_id);
  IF v_actor.o_rank < 1 THEN
    RAISE EXCEPTION 'Staff responsable only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_draft
  FROM public.telegram_product_drafts
  WHERE telegram_user_id = p_telegram_user_id;

  IF v_draft.telegram_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'draft_not_found');
  END IF;

  IF coalesce(length(trim(v_draft.name)), 0) < 3 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_name');
  END IF;

  IF v_draft.price IS NULL OR v_draft.price < 500 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_price');
  END IF;

  IF v_draft.stock IS NULL OR v_draft.stock < 1 OR v_draft.stock > 500 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_stock');
  END IF;

  -- Verrouillage d'idempotence
  PERFORM pg_advisory_xact_lock(hashtext('telegram_product_commit:' || p_request_key));

  SELECT s.name, s.code INTO v_store_name, v_store_code
  FROM public.stores s WHERE s.id = v_draft.store_id;

  -- Construction des specs
  IF v_draft.storage IS NOT NULL AND v_draft.storage <> '' THEN
    v_specs := v_specs || jsonb_build_object('label', 'Stockage', 'value', v_draft.storage);
  END IF;
  IF v_draft.ram IS NOT NULL AND v_draft.ram <> '' THEN
    v_specs := v_specs || jsonb_build_object('label', 'RAM', 'value', v_draft.ram);
  END IF;

  v_main_image := CASE
    WHEN coalesce(array_length(v_draft.images, 1), 0) > 0 THEN v_draft.images[1]
    ELSE NULL
  END;

  v_product_id := gen_random_uuid()::text;

  -- Insertion du produit en mode MASQUÉ (is_published = false)
  INSERT INTO public.products (
    id, name, price, category, brand, condition, stock, images, image, is_published, specs, updated_at
  ) VALUES (
    v_product_id,
    trim(v_draft.name),
    v_draft.price,
    coalesce(v_draft.category, 'phones'),
    v_draft.brand_id,
    coalesce(v_draft.condition, 'refurbished'),
    0, -- Initialisé à 0, le trigger répercutera store_stock_delta
    v_draft.images,
    v_main_image,
    false, -- STRICTEMENT MASQUÉ DU SITE PUBLIC TANT QUE NON VALIDÉ
    v_specs,
    now()
  );

  -- Attribution du stock initial dans la boutique via le moteur canonique
  PERFORM public._store_stock_delta(
    v_draft.store_id,
    v_product_id,
    v_draft.stock,
    'inventory_adjust'::public.stock_movement_reason,
    'telegram_product_create',
    p_request_key,
    v_actor.o_staff_id,
    'Création Telegram boutique ' || coalesce(v_store_name, '')
  );

  -- Suppression du brouillon complété
  DELETE FROM public.telegram_product_drafts WHERE telegram_user_id = p_telegram_user_id;

  -- Audit traçable
  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (
    p_telegram_user_id,
    v_actor.o_auth_user_id,
    format('product.create:%s:store=%s,stock=%s,price=%s', v_product_id, v_store_code, v_draft.stock, v_draft.price),
    v_product_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'name', trim(v_draft.name),
    'store_name', v_store_name,
    'store_code', v_store_code,
    'stock', v_draft.stock,
    'price', v_draft.price,
    'is_published', false
  );
END;
$$;

-- Permissions strictes : service_role uniquement
REVOKE ALL ON FUNCTION public.telegram_staff_product_draft_upsert(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_draft_upsert(text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_product_draft_cancel(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_draft_cancel(text) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_product_commit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_commit(text, text) TO service_role;

COMMIT;

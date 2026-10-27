-- Migration pour enregistrement en place des photos (éviter le spam lors de l'envoi d'albums)
-- et ajout atomique d'images via append_image

ALTER TABLE public.telegram_product_drafts
  ADD COLUMN IF NOT EXISTS photo_message_id bigint;

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
    SELECT s.id INTO v_store_id FROM public.stores s WHERE s.code = 'siege' LIMIT 1;
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
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_product_draft_upsert(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_draft_upsert(text, text, jsonb) TO service_role;

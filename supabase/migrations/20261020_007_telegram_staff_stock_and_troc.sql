-- Mini App / bot Telegram staff : recherche produit, réappro rapide, validation de troc.
-- Toutes les RPC sont réservées au service_role (edge functions) et ré-identifient
-- le staff via telegram_staff_links : un compte Telegram non associé n'obtient rien.

BEGIN;

-- ── Recherche produit (/stock, /prix) : tout staff associé ──────────────────
CREATE OR REPLACE FUNCTION public.telegram_staff_product_lookup(
  p_query text,
  p_telegram_user_id text
)
RETURNS TABLE (id text, name text, stock integer, price numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terms text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.telegram_staff_links l
    JOIN auth.users u ON u.id = l.auth_user_id
    JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Telegram account not linked to staff' USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(t) INTO v_terms
  FROM (
    SELECT t FROM regexp_split_to_table(lower(trim(coalesce(p_query, ''))), '\s+') t
    WHERE length(t) > 0 LIMIT 6
  ) x;

  IF v_terms IS NULL OR length(trim(p_query)) > 80 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id::text, p.name::text, coalesce(p.stock, 0)::integer, p.price::numeric
  FROM public.products p
  WHERE NOT EXISTS (
    SELECT 1 FROM unnest(v_terms) t
    WHERE p.name NOT ILIKE '%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  )
  ORDER BY coalesce(p.stock, 0) DESC, p.name
  LIMIT 8;
END;
$$;

-- ── Réappro rapide : responsable / manager, admin (direction), super_admin ──
-- Passe par _store_stock_delta (boutique par défaut) : store_stock, products.stock
-- (trigger de synchro) et stock_movements restent cohérents et tracés.
-- p_request_id est généré par le client : un rejeu (double tap, retry réseau) est un no-op.
CREATE OR REPLACE FUNCTION public.telegram_staff_restock(
  p_product_id text,
  p_quantity integer,
  p_request_id uuid,
  p_telegram_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
  v_staff_id uuid;
  v_staff_role text;
  v_store_id uuid;
  v_stock integer;
BEGIN
  SELECT l.auth_user_id, s.id, lower(s.role) INTO v_auth_user_id, v_staff_id, v_staff_role
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL OR v_staff_role NOT IN
      ('responsable', 'manager', 'manager_vente', 'direction', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Action requires manager or higher' USING ERRCODE = '42501';
  END IF;

  IF p_request_id IS NULL OR p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 50' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('telegram_restock:' || p_request_id::text));

  IF EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE ref_type = 'telegram_restock' AND ref_id = p_request_id::text
  ) THEN
    SELECT coalesce(stock, 0) INTO v_stock FROM public.products WHERE id::text = p_product_id;
    RETURN jsonb_build_object('changed', false, 'stock', v_stock);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id::text = p_product_id) THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  v_store_id := public._default_store_id();
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No default store configured' USING ERRCODE = '55000';
  END IF;

  PERFORM public._store_stock_delta(
    v_store_id, p_product_id, p_quantity, 'inventory_adjust'::public.stock_movement_reason,
    'telegram_restock', p_request_id::text, v_staff_id, 'Réappro depuis Telegram'
  );

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_auth_user_id, 'stock.restock+' || p_quantity, p_product_id);

  SELECT coalesce(stock, 0) INTO v_stock FROM public.products WHERE id::text = p_product_id;
  RETURN jsonb_build_object('changed', true, 'stock', v_stock);
END;
$$;

-- ── Troc : ajout de la validation (même transition que l'ERP, horodatée) ───
CREATE OR REPLACE FUNCTION public.telegram_staff_troc_action(
  p_request_id text,
  p_action text,
  p_telegram_user_id text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_staff_role TEXT;
  v_status TEXT;
BEGIN
  SELECT l.auth_user_id, lower(s.role) INTO v_auth_user_id, v_staff_role
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL OR v_staff_role NOT IN
      ('responsable', 'manager', 'manager_vente', 'direction', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Action requires responsable or higher' USING ERRCODE = '42501';
  END IF;

  IF length(p_request_id) < 1 OR length(p_request_id) > 100 THEN
    RAISE EXCEPTION 'Invalid request ID' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_status
  FROM public.trade_in_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;

  IF p_action = 'contacted' THEN
    IF v_status = 'contacted' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status <> 'accepted' THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action = 'validated' THEN
    -- Machine à états ERP (utils/trocRedemption) : pending|accepted|contacted|appointment → validated.
    IF v_status = 'validated' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status NOT IN ('pending','accepted','contacted','appointment') THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action = 'refused' THEN
    IF v_status = 'refused' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status NOT IN ('pending','accepted','contacted','appointment') THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 OR length(trim(p_reason)) > 300 THEN
      RAISE EXCEPTION 'A reason between 5 and 300 characters is required' USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported troc action' USING ERRCODE = '22023';
  END IF;

  UPDATE public.trade_in_requests
    SET status = p_action,
        redemption_reason = CASE WHEN p_action = 'refused' THEN trim(p_reason) ELSE redemption_reason END,
        validated_at = CASE WHEN p_action = 'validated' THEN now() ELSE validated_at END,
        updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.telegram_staff_action_audit
    (telegram_user_id, auth_user_id, action, resource_id)
  VALUES
    (p_telegram_user_id, v_auth_user_id, 'troc.' || p_action, p_request_id);

  RETURN jsonb_build_object('changed', true, 'status', p_action);
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_product_lookup(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_lookup(TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_restock(TEXT, INTEGER, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_restock(TEXT, INTEGER, UUID, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_troc_action(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_troc_action(TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;

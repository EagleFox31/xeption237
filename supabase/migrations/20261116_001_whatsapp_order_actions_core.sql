-- Migration 20261116_001_whatsapp_order_actions_core.sql
-- ADR-003, étape 2 : actions sur les alertes commande depuis le groupe WhatsApp staff.
--
-- 1. _staff_order_action_core(p_order_id, p_action, p_auth_user_id, p_reason) : la règle métier
--    de 20261114_003 extraite telle quelle (rôles, machine d'états, encaissement, annulation),
--    sans identification ni audit. Une seule règle pour Telegram et WhatsApp.
-- 2. telegram_staff_order_action : même signature, mêmes erreurs, même audit ; il identifie le
--    staff par telegram_staff_links puis appelle le cœur.
-- 3. Liaison WhatsApp -> staff : whatsapp_link_codes (code à usage unique, 10 min, SHA-256 seul)
--    et whatsapp_staff_links (empreinte HMAC du numéro calculée par Trigenys Notify : aucun
--    numéro de téléphone n'est stocké chez Xeption).
-- 4. staff_action_receipts : idempotence par (source, external_id) et audit des gestes WhatsApp.
-- 5. whatsapp_staff_order_action(p_notification_id, p_action, p_fingerprint, p_reason,
--    p_external_id) : la commande est retrouvée depuis l'alerte (admin_notifications), jamais
--    depuis un identifiant fourni par le message. Annulation en deux gestes : ❌ enregistre
--    cancel_requested, puis la réponse 1–5 annule dans les 10 minutes, par le même staff.
--
-- Toutes les RPC serveur sont réservées au service_role ; create_whatsapp_link_code à
-- authenticated (staff). Idempotent : rejouable sans erreur.

BEGIN;

-- 1. Cœur commun -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._staff_order_action_core(
  p_order_id text,
  p_action text,
  p_auth_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Miroir de ORDER_CANCEL_REASONS (utils/orderWorkflow.ts), vérifié par tests/whatsapp-order-actions.test.ts
  c_reasons constant text[] := ARRAY['Client injoignable', 'Client a renoncé', 'Rupture de stock', 'Doublon', 'Prix ou délai refusé'];
  c_open    constant text[] := ARRAY['pending', 'confirmed', 'ready', 'shipped'];
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
  SELECT lower(u.email), lower(s.role), nullif(trim(s.name), '')
    INTO v_email, v_role, v_name
  FROM auth.users u
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE u.id = p_auth_user_id
  LIMIT 1;

  IF v_email IS NULL OR v_role NOT IN
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

  -- Locaux à la transaction (20261114_003) : identité du staff lié pour les RPC réutilisées.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', p_auth_user_id, 'email', v_email, 'role', 'authenticated')::text, true);
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

REVOKE ALL ON FUNCTION public._staff_order_action_core(text, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._staff_order_action_core(text, text, uuid, text)
  TO service_role;

-- 2. Telegram : identification + audit, puis le cœur ------------------------------------------
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
  v_auth_user_id uuid;
  v_res jsonb;
BEGIN
  SELECT l.auth_user_id INTO v_auth_user_id
  FROM public.telegram_staff_links l
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Staff link not found' USING ERRCODE = '42501';
  END IF;

  v_res := public._staff_order_action_core(p_order_id, p_action, v_auth_user_id, p_reason);

  IF coalesce((v_res->>'changed')::boolean, false) THEN
    INSERT INTO public.telegram_staff_action_audit
      (telegram_user_id, auth_user_id, action, resource_id)
    VALUES
      (p_telegram_user_id, v_auth_user_id, 'order.' || p_action, p_order_id);
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_order_action(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_order_action(text, text, text, text)
  TO service_role;

-- 3. Liaison WhatsApp -> staff -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_link_codes (
  code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS whatsapp_link_codes_user_idx ON public.whatsapp_link_codes (auth_user_id);
ALTER TABLE public.whatsapp_link_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_link_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whatsapp_link_codes TO service_role;

CREATE TABLE IF NOT EXISTS public.whatsapp_staff_links (
  fingerprint TEXT PRIMARY KEY CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
-- Un seul WhatsApp actif par compte staff.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_staff_links_active_user_idx
  ON public.whatsapp_staff_links (auth_user_id) WHERE revoked_at IS NULL;
ALTER TABLE public.whatsapp_staff_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_staff_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.whatsapp_staff_links TO service_role;

-- Appelée par le staff connecté à l'ERP. Code court lisible (XL-XXXX-XXXX, 40 bits, alphabet
-- sans 0/O/1/I), retourné une seule fois ; seul son SHA-256 est stocké.
CREATE OR REPLACE FUNCTION public.create_whatsapp_link_code()
RETURNS TABLE (code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_user_id UUID := auth.uid();
  v_raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  v_body text := '';
  v_code text;
  v_expires_at TIMESTAMPTZ := now() + interval '10 minutes';
  i int;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE u.id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Staff account required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.whatsapp_link_codes w
  WHERE (w.auth_user_id = v_user_id AND w.used_at IS NULL)
     OR w.expires_at < now() - interval '1 day';

  -- 256 est un multiple de 32 : get_byte % 32 est sans biais. Octets 0..7 de l'UUID v4,
  -- entièrement aléatoires (la version et la variante sont dans les octets 6 et 8 :
  -- l'octet 6 ne garde que 4 bits aléatoires, on saute donc 6 et prend 9).
  FOREACH i IN ARRAY ARRAY[0, 1, 2, 3, 4, 5, 7, 9] LOOP
    v_body := v_body || substr(c_alphabet, get_byte(v_raw, i) % 32 + 1, 1);
  END LOOP;
  v_code := 'XL-' || substr(v_body, 1, 4) || '-' || substr(v_body, 5, 4);

  INSERT INTO public.whatsapp_link_codes (code_hash, auth_user_id, expires_at)
  VALUES (encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), v_user_id, v_expires_at);

  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_whatsapp_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_whatsapp_link_code() TO authenticated;

-- Relais Notify (service_role) : brûle le code en un UPDATE et lie l'empreinte. Une empreinte
-- déjà liée à un autre compte, ou un compte déjà lié à un autre numéro, est déplacée.
CREATE OR REPLACE FUNCTION public.link_whatsapp_staff(p_code text, p_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
BEGIN
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_code IS NULL OR upper(trim(p_code)) !~ '^XL-[A-Z2-9]{4}-[A-Z2-9]{4}$' THEN
    RETURN jsonb_build_object('linked', false, 'outcome', 'invalid_code');
  END IF;

  UPDATE public.whatsapp_link_codes w SET used_at = now()
  WHERE w.code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
    AND w.used_at IS NULL AND w.expires_at > now()
  RETURNING w.auth_user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'outcome', 'invalid_code');
  END IF;

  UPDATE public.whatsapp_staff_links SET revoked_at = now()
  WHERE revoked_at IS NULL AND auth_user_id = v_user_id AND fingerprint <> p_fingerprint;

  INSERT INTO public.whatsapp_staff_links (fingerprint, auth_user_id)
  VALUES (p_fingerprint, v_user_id)
  ON CONFLICT (fingerprint) DO UPDATE
    SET auth_user_id = excluded.auth_user_id, linked_at = now(), revoked_at = NULL;

  SELECT nullif(trim(s.name), '') INTO v_name
  FROM auth.users u JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE u.id = v_user_id LIMIT 1;

  RETURN jsonb_build_object('linked', true, 'outcome', 'linked', 'actor', v_name);
END;
$$;

REVOKE ALL ON FUNCTION public.link_whatsapp_staff(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_whatsapp_staff(text, text) TO service_role;

-- 4. Reçus : idempotence + audit des gestes ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_action_receipts (
  source TEXT NOT NULL CHECK (source IN ('whatsapp')),
  external_id TEXT NOT NULL CHECK (length(external_id) BETWEEN 1 AND 128),
  auth_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (source, external_id)
);
CREATE INDEX IF NOT EXISTS staff_action_receipts_pending_cancel_idx
  ON public.staff_action_receipts (auth_user_id, resource_id, created_at DESC)
  WHERE action = 'order.cancel_requested';
ALTER TABLE public.staff_action_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.staff_action_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_action_receipts TO service_role;

-- 5. Action WhatsApp ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.whatsapp_staff_order_action(
  p_notification_id uuid,
  p_action text,
  p_fingerprint text,
  p_reason text,
  p_external_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Même liste que ORDER_ACTION_EVENT_TYPES (_shared/telegramOrderActions.ts).
  c_event_types constant text[] := ARRAY['order_created', 'order_unreachable', 'order_stale'];
  v_auth_user_id uuid;
  v_role text;
  v_order_id text;
  v_inserted text;
  v_res jsonb;
BEGIN
  IF p_external_id IS NULL OR length(p_external_id) < 1 OR length(p_external_id) > 128 THEN
    RAISE EXCEPTION 'Invalid external ID' USING ERRCODE = '22023';
  END IF;
  IF p_action IS NULL OR p_action NOT IN
      ('delivered', 'cash_delivered', 'unreachable', 'cancel_requested', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported order action' USING ERRCODE = '22023';
  END IF;

  SELECT l.auth_user_id INTO v_auth_user_id
  FROM public.whatsapp_staff_links l
  WHERE l.fingerprint = p_fingerprint AND l.revoked_at IS NULL
  LIMIT 1;
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Staff link not found' USING ERRCODE = '42501';
  END IF;

  SELECT n.link_to_id INTO v_order_id
  FROM public.admin_notifications n
  WHERE n.id = p_notification_id AND n.event_type = ANY (c_event_types);
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'outcome', 'not_actionable');
  END IF;

  -- Idempotence : un même geste (identifiant WAHA) n'agit qu'une fois. En cas d'erreur, la
  -- transaction annule aussi ce reçu : un réessai reste possible.
  INSERT INTO public.staff_action_receipts (source, external_id, auth_user_id, action, resource_id)
  VALUES ('whatsapp', p_external_id, v_auth_user_id, 'order.' || p_action, v_order_id)
  ON CONFLICT (source, external_id) DO NOTHING
  RETURNING external_id INTO v_inserted;
  IF v_inserted IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'outcome', 'duplicate');
  END IF;

  IF p_action = 'cancel_requested' THEN
    SELECT lower(s.role) INTO v_role
    FROM auth.users u JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE u.id = v_auth_user_id LIMIT 1;
    IF v_role IS NULL OR v_role NOT IN ('responsable', 'direction', 'super_admin') THEN
      RAISE EXCEPTION 'Cancellation requires responsable or higher' USING ERRCODE = '42501';
    END IF;
    v_res := jsonb_build_object('changed', false, 'outcome', 'reason_required');

  ELSE
    IF p_action = 'cancelled' AND NOT EXISTS (
      SELECT 1 FROM public.staff_action_receipts r
      WHERE r.source = 'whatsapp' AND r.action = 'order.cancel_requested'
        AND r.auth_user_id = v_auth_user_id AND r.resource_id = v_order_id
        AND r.created_at > now() - interval '10 minutes'
    ) THEN
      v_res := jsonb_build_object('changed', false, 'outcome', 'no_cancel_request');
    ELSE
      v_res := public._staff_order_action_core(v_order_id, p_action, v_auth_user_id, p_reason);
    END IF;
  END IF;

  UPDATE public.staff_action_receipts SET outcome = v_res->>'outcome'
  WHERE source = 'whatsapp' AND external_id = p_external_id;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.whatsapp_staff_order_action(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_staff_order_action(uuid, text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.whatsapp_staff_order_action(uuid, text, text, text, text) IS
  'Order outcome from a WhatsApp staff gesture relayed by Trigenys Notify (ADR-003); linked staff only, idempotent per WAHA event, service-role only.';

COMMIT;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.order_feedback_invites (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(18), 'hex'),
  order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
  repair_ticket_id text,
  kind text NOT NULL CHECK (kind IN ('service', 'product', 'sav')),
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  headline text,
  invite_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_feedback_invites_order_kind_uidx
  ON public.order_feedback_invites (order_id, kind)
  WHERE order_id IS NOT NULL AND kind IN ('service', 'product');

CREATE UNIQUE INDEX IF NOT EXISTS order_feedback_invites_ticket_sav_uidx
  ON public.order_feedback_invites (repair_ticket_id)
  WHERE repair_ticket_id IS NOT NULL AND kind = 'sav';

CREATE INDEX IF NOT EXISTS order_feedback_invites_due_idx
  ON public.order_feedback_invites (invite_at)
  WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.order_feedback (
  id text PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
  invite_id text NOT NULL UNIQUE REFERENCES public.order_feedback_invites(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  product_ratings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_feedback_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.order_feedback_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.order_feedback FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_order_feedback_invites(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_headline text;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande manquante.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
  END IF;
  IF v_order.status IS DISTINCT FROM 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La commande n’est pas encore remise au client.');
  END IF;

  v_headline := COALESCE(
    NULLIF(v_order.items -> 0 ->> 'name', ''),
    'ton appareil'
  );

  INSERT INTO public.order_feedback_invites (
    order_id, kind, customer_name, customer_phone, headline, invite_at
  )
  VALUES (
    v_order.id,
    'service',
    COALESCE(v_order.customer_name, ''),
    COALESCE(v_order.customer_phone, ''),
    'Accueil boutique',
    now()
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.order_feedback_invites (
    order_id, kind, customer_name, customer_phone, headline, invite_at
  )
  VALUES (
    v_order.id,
    'product',
    COALESCE(v_order.customer_name, ''),
    COALESCE(v_order.customer_phone, ''),
    v_headline,
    now() + interval '7 days'
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_sav_feedback_invite(p_ticket_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
BEGIN
  IF p_ticket_id IS NULL OR btrim(p_ticket_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier SAV manquant.');
  END IF;

  IF to_regclass('public.repair_tickets') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table SAV absente.');
  END IF;

  EXECUTE
    'SELECT id, order_id, status, customer_name, customer_phone, product_name
     FROM public.repair_tickets WHERE id = $1'
    INTO v_ticket
    USING p_ticket_id;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dossier SAV introuvable.');
  END IF;
  IF v_ticket.status IS DISTINCT FROM 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le SAV n’est pas encore terminé.');
  END IF;

  INSERT INTO public.order_feedback_invites (
    order_id, repair_ticket_id, kind, customer_name, customer_phone, headline, invite_at
  )
  VALUES (
    v_ticket.order_id,
    v_ticket.id::text,
    'sav',
    COALESCE(v_ticket.customer_name, ''),
    COALESCE(v_ticket.customer_phone, ''),
    COALESCE(NULLIF(v_ticket.product_name, ''), 'ton appareil'),
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_feedback_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'delivered') THEN
    PERFORM public.ensure_order_feedback_invites(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_feedback_invites ON public.orders;
CREATE TRIGGER trg_orders_feedback_invites
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_feedback_invites();

CREATE OR REPLACE FUNCTION public.trg_repair_tickets_feedback_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.ensure_sav_feedback_invite(NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.repair_tickets') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_repair_tickets_feedback_invite ON public.repair_tickets;
    CREATE TRIGGER trg_repair_tickets_feedback_invite
      AFTER INSERT OR UPDATE OF status ON public.repair_tickets
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_repair_tickets_feedback_invite();
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_feedback_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.order_feedback_invites%ROWTYPE;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien invalide.');
  END IF;

  SELECT * INTO v_inv FROM public.order_feedback_invites WHERE id = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien introuvable.');
  END IF;

  IF v_inv.invite_at > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'too_early',
      'invite_at', v_inv.invite_at
    );
  END IF;

  IF v_inv.order_id IS NOT NULL THEN
    SELECT COALESCE(items, '[]'::jsonb) INTO v_items
    FROM public.orders WHERE id = v_inv.order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already', v_inv.completed_at IS NOT NULL,
    'kind', v_inv.kind,
    'headline', v_inv.headline,
    'first_name', split_part(btrim(v_inv.customer_name), ' ', 1),
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_token text,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_product_ratings jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.order_feedback_invites%ROWTYPE;
  v_comment text;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien invalide.');
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Choisis une note de 1 à 5.');
  END IF;

  SELECT * INTO v_inv FROM public.order_feedback_invites WHERE id = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lien introuvable.');
  END IF;
  IF v_inv.invite_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce lien n’est pas encore ouvert.');
  END IF;
  IF v_inv.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already', true);
  END IF;

  v_comment := NULLIF(btrim(COALESCE(p_comment, '')), '');
  IF v_comment IS NOT NULL AND length(v_comment) > 500 THEN
    v_comment := left(v_comment, 500);
  END IF;

  INSERT INTO public.order_feedback (invite_id, rating, comment, product_ratings)
  VALUES (v_inv.id, p_rating, v_comment, COALESCE(p_product_ratings, '[]'::jsonb));

  UPDATE public.order_feedback_invites
  SET completed_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_due_feedback_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.invite_at ASC)
      FROM (
        SELECT
          i.id AS token,
          i.order_id,
          i.repair_ticket_id,
          i.kind,
          i.customer_name,
          i.customer_phone,
          i.headline,
          i.invite_at,
          i.sent_at,
          i.completed_at
        FROM public.order_feedback_invites i
        WHERE i.completed_at IS NULL
          AND i.invite_at <= now()
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_feedback_invite_sent(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_feedback_invites
  SET sent_at = COALESCE(sent_at, now())
  WHERE id = p_token AND completed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation introuvable.');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_order_feedback_invites(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_sav_feedback_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_feedback_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_feedback(text, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_due_feedback_invites() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_feedback_invite_sent(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_order_feedback_invites(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_sav_feedback_invite(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_feedback_invite(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_feedback(text, integer, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_due_feedback_invites() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_feedback_invite_sent(text) TO anon, authenticated, service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE status = 'delivered' LOOP
    PERFORM public.ensure_order_feedback_invites(r.id);
  END LOOP;
END
$$;

COMMIT;

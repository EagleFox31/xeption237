-- Migration: 20260910_004_fix_mark_order_cash_paid.sql
-- 1. Autoriser le canal 'cash' sur order_payments
-- 2. Rendre la colonne 'phone' nullable pour les règlements en espèces
-- 3. Ajouter la colonne 'staff_id' sur order_payments pour tracer qui a encaissé
-- 4. Corriger la fonction mark_order_cash_paid pour être idempotente et accepter toutes les formulations d'espèces

ALTER TABLE public.order_payments DROP CONSTRAINT IF EXISTS order_payments_channel_check;
ALTER TABLE public.order_payments ADD CONSTRAINT order_payments_channel_check CHECK (channel IN ('om', 'momo', 'cash'));
ALTER TABLE public.order_payments ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.order_payments ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.mark_order_cash_paid(text);

CREATE OR REPLACE FUNCTION public.mark_order_cash_paid(p_order_id text, p_staff_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_staff_id uuid;
  v_email text;
BEGIN
  -- 1. Vérifier la commande
  SELECT id, total, status, payment_status, payment_method, customer_phone
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable');
  END IF;

  -- 2. Idempotence : si déjà payée, succès immédiat sans erreur
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'message', 'Commande déjà enregistrée comme payée');
  END IF;

  -- 3. Résolution du staff
  v_email := lower(COALESCE(NULLIF(trim(p_staff_email), ''), auth.jwt() ->> 'email', ''));

  IF v_email <> '' THEN
    SELECT id INTO v_staff_id FROM public.staff WHERE lower(email) = v_email LIMIT 1;
  END IF;

  IF v_staff_id IS NULL THEN
    SELECT id INTO v_staff_id FROM public.staff ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 4. Mettre à jour le staff sur orders si présent
  IF v_staff_id IS NOT NULL THEN
    UPDATE public.orders
    SET staff_id = COALESCE(staff_id, v_staff_id)
    WHERE id = p_order_id AND staff_id IS NULL;
  END IF;

  -- 5. Insérer dans order_payments
  INSERT INTO public.order_payments (
    order_id, reference, amount, currency, channel, provider, phone, status, paid_at, staff_id
  ) VALUES (
    v_order.id,
    'CASH-' || v_order.id || '-' || floor(extract(epoch FROM now()))::bigint,
    GREATEST(v_order.total::integer, 0),
    'XAF',
    'cash',
    'cash',
    COALESCE(NULLIF(trim(v_order.customer_phone), ''), '23700000000'),
    'paid',
    now(),
    v_staff_id
  );

  RETURN public.confirm_order_payment_and_consume_stock(p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_cash_paid(text, text) TO anon, authenticated, service_role;

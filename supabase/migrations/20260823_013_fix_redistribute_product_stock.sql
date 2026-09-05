-- Correctifs redistribute_product_stock :
-- 1. Valider toutes les boutiques AVANT le DELETE (évite perte de stock sur RETURN)
-- 2. Refuser si réservations actives (reserved / stock_reservations)
-- 3. Journal stock_movements (reason = redistribution)

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'stock_movement_reason' AND e.enumlabel = 'redistribution'
  ) THEN
    ALTER TYPE public.stock_movement_reason ADD VALUE 'redistribution';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.redistribute_product_stock(
  p_product_id text,
  p_allocations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected integer;
  allocated integer;
  row jsonb;
  store_uuid uuid;
  qty integer;
  old_qty integer;
  staff_uuid uuid;
BEGIN
  IF auth.jwt() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session requise');
  END IF;

  SELECT s.id INTO staff_uuid
  FROM public.staff s
  WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1;

  IF staff_uuid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  IF p_product_id IS NULL OR trim(p_product_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produit invalide');
  END IF;

  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Répartition invalide');
  END IF;

  SELECT stock INTO expected FROM public.products WHERE id = p_product_id;
  IF expected IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  SELECT COALESCE(SUM(GREATEST((elem->>'quantity')::integer, 0)), 0)::integer
  INTO allocated
  FROM jsonb_array_elements(p_allocations) AS elem;

  IF allocated <> expected THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Total réparti (%s) ≠ stock catalogue (%s)', allocated, expected)
    );
  END IF;

  -- Toutes les boutiques valides et actives AVANT toute écriture
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) e
    WHERE NULLIF(trim(e->>'store_id'), '') IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.stores st
         WHERE st.id = (NULLIF(trim(e->>'store_id'), ''))::uuid
           AND st.active = true
       )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Boutique inactive ou introuvable');
  END IF;

  -- Refuser si du stock est réservé (commandes web en attente)
  IF EXISTS (
    SELECT 1 FROM public.stock_reservations sr
    WHERE sr.product_id = p_product_id AND sr.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.store_stock ss
    WHERE ss.product_id = p_product_id AND ss.reserved > 0
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Répartition impossible : du stock est réservé sur ce produit'
    );
  END IF;

  CREATE TEMP TABLE _redist_before ON COMMIT DROP AS
  SELECT store_id, quantity
  FROM public.store_stock
  WHERE product_id = p_product_id;

  DELETE FROM public.store_stock WHERE product_id = p_product_id;

  FOR row IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    store_uuid := NULLIF(trim(row->>'store_id'), '')::uuid;
    qty := GREATEST(COALESCE((row->>'quantity')::integer, 0), 0);

    SELECT COALESCE((
      SELECT b.quantity FROM _redist_before b WHERE b.store_id = store_uuid
    ), 0) INTO old_qty;

    IF qty > 0 THEN
      INSERT INTO public.store_stock (store_id, product_id, quantity, reserved)
      VALUES (store_uuid, p_product_id, qty, 0);
    END IF;

    IF qty <> old_qty THEN
      INSERT INTO public.stock_movements (
        store_id, product_id, delta, reason, ref_type, ref_id, staff_id, note
      ) VALUES (
        store_uuid,
        p_product_id,
        qty - old_qty,
        'redistribution'::public.stock_movement_reason,
        'product',
        p_product_id,
        staff_uuid,
        format('%s → %s', old_qty, qty)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'total', expected);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.redistribute_product_stock IS
  'Répartit products.stock entre boutiques. Valide tout avant DELETE ; refuse si réservations actives ; journalise dans stock_movements.';

COMMIT;

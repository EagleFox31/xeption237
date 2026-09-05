-- ERP étape 3 : RPC répartition stock par boutique (validation somme = products.stock)

BEGIN;

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
BEGIN
  IF auth.jwt() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session requise');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
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

  DELETE FROM public.store_stock WHERE product_id = p_product_id;

  FOR row IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    store_uuid := NULLIF(trim(row->>'store_id'), '')::uuid;
    qty := GREATEST(COALESCE((row->>'quantity')::integer, 0), 0);

    IF store_uuid IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Boutique invalide dans la répartition');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.stores st WHERE st.id = store_uuid AND st.active = true) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Boutique inactive ou introuvable');
    END IF;

    IF qty > 0 THEN
      INSERT INTO public.store_stock (store_id, product_id, quantity, reserved)
      VALUES (store_uuid, p_product_id, qty, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'product_id', p_product_id, 'total', expected);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redistribute_product_stock(text, jsonb)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.redistribute_product_stock IS
  'Répartit products.stock entre boutiques (store_stock). Somme des quantités doit égaler products.stock.';

CREATE OR REPLACE FUNCTION public.get_product_stock_mismatches()
RETURNS TABLE (
  product_id text,
  product_name text,
  catalog_stock integer,
  distributed_stock bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.stock AS catalog_stock,
    COALESCE(SUM(ss.quantity), 0)::bigint AS distributed_stock
  FROM public.products p
  LEFT JOIN public.store_stock ss ON ss.product_id = p.id
  GROUP BY p.id, p.name, p.stock
  HAVING COALESCE(SUM(ss.quantity), 0) <> p.stock
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_stock_mismatches()
  TO authenticated, service_role;

COMMIT;

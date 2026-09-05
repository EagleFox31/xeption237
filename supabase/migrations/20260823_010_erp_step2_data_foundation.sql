-- ERP étape 2 : socle données (stores, store_stock, stock_movements, order_items)
-- 100 % additif — products.stock reste la vérité jusqu'à l'étape 4.
-- Spec : docs/next-step/ETAPE_2_SOCLE_DONNEES.md

BEGIN;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'stock_movement_reason'
  ) THEN
    CREATE TYPE public.stock_movement_reason AS ENUM (
      'sale',
      'online_sale',
      'return',
      'transfer_out',
      'transfer_in',
      'inventory_adjust',
      'troc_intake',
      'reservation_release',
      'initial_backfill'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- stores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  city        text,
  address     text,
  active      boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stores_one_default_idx
  ON public.stores (is_default) WHERE is_default = true;

COMMENT ON TABLE public.stores IS
  'Points de vente Xeption. Étape 2 : une boutique default ; étape 3+ : répartition multi-boutiques.';

-- ---------------------------------------------------------------------------
-- store_stock
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_stock (
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved    integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id),
  CHECK (reserved <= quantity)
);

CREATE INDEX IF NOT EXISTS store_stock_product_idx ON public.store_stock (product_id);
CREATE INDEX IF NOT EXISTS store_stock_store_idx ON public.store_stock (store_id);

COMMENT ON TABLE public.store_stock IS
  'Stock par boutique. Étape 2 : miroir de products.stock sur la boutique default. Vérité à partir de l''étape 4.';

-- ---------------------------------------------------------------------------
-- stock_movements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id),
  product_id  text NOT NULL REFERENCES public.products(id),
  delta       integer NOT NULL,
  reason      public.stock_movement_reason NOT NULL,
  ref_type    text,
  ref_id      text,
  staff_id    uuid REFERENCES public.staff(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_store_created_idx
  ON public.stock_movements (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx
  ON public.stock_movements (product_id, created_at DESC);

COMMENT ON TABLE public.stock_movements IS
  'Journal append-only des mouvements de stock par boutique.';

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  line_index    smallint NOT NULL DEFAULT 0,
  product_id    text REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  unit_price    numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity      integer NOT NULL CHECK (quantity > 0),
  line_total    numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, line_index)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS order_items_created_idx ON public.order_items (created_at DESC);

COMMENT ON TABLE public.order_items IS
  'Lignes structurées par commande (pilotage ERP). orders.items jsonb conservé en parallèle.';

-- ---------------------------------------------------------------------------
-- Colonnes orders / staff
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id);

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS orders_staff_id_idx ON public.orders (staff_id);
CREATE INDEX IF NOT EXISTS orders_date_store_idx ON public.orders (date DESC, store_id);
CREATE INDEX IF NOT EXISTS staff_store_id_idx ON public.staff (store_id);

-- ---------------------------------------------------------------------------
-- Seed boutique default
-- ---------------------------------------------------------------------------
INSERT INTO public.stores (code, name, city, is_default, active)
SELECT 'siege', 'Xeption — Siège', 'Yaoundé', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE is_default = true);

-- ---------------------------------------------------------------------------
-- Backfill store_stock (produits stock > 0 uniquement)
-- ---------------------------------------------------------------------------
INSERT INTO public.store_stock (store_id, product_id, quantity, reserved)
SELECT s.id, p.id, p.stock, 0
FROM public.products p
CROSS JOIN public.stores s
WHERE s.is_default = true
  AND p.stock > 0
ON CONFLICT (store_id, product_id) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      updated_at = now()
WHERE public.store_stock.quantity IS DISTINCT FROM EXCLUDED.quantity;

-- Trace optionnelle du backfill initial
INSERT INTO public.stock_movements (store_id, product_id, delta, reason, ref_type, note)
SELECT ss.store_id, ss.product_id, ss.quantity, 'initial_backfill'::public.stock_movement_reason,
       'migration', '20260823_010_erp_step2_data_foundation'
FROM public.store_stock ss
JOIN public.stores s ON s.id = ss.store_id AND s.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.stock_movements sm
  WHERE sm.reason = 'initial_backfill'
    AND sm.product_id = ss.product_id
    AND sm.store_id = ss.store_id
);

-- ---------------------------------------------------------------------------
-- Backfill order_items depuis orders.items jsonb
-- ---------------------------------------------------------------------------
INSERT INTO public.order_items (
  order_id,
  line_index,
  product_id,
  product_name,
  unit_price,
  quantity,
  line_total
)
SELECT
  o.id,
  (t.ord - 1)::smallint AS line_index,
  CASE
    WHEN NULLIF(trim(t.elem->>'id'), '') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.products p
       WHERE p.id = NULLIF(trim(t.elem->>'id'), '')
     )
    THEN NULLIF(trim(t.elem->>'id'), '')
    ELSE NULL
  END AS product_id,
  COALESCE(NULLIF(trim(t.elem->>'name'), ''), NULLIF(trim(t.elem->>'id'), ''), 'Article') AS product_name,
  GREATEST(COALESCE((t.elem->>'price')::numeric, 0), 0) AS unit_price,
  GREATEST(COALESCE((t.elem->>'quantity')::integer, 1), 1) AS quantity,
  GREATEST(COALESCE((t.elem->>'price')::numeric, 0), 0)
    * GREATEST(COALESCE((t.elem->>'quantity')::integer, 1), 1) AS line_total
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(COALESCE(o.items, '[]'::jsonb)) = 'array' THEN COALESCE(o.items, '[]'::jsonb)
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS t(elem, ord)
WHERE jsonb_array_length(
  CASE
    WHEN jsonb_typeof(COALESCE(o.items, '[]'::jsonb)) = 'array' THEN COALESCE(o.items, '[]'::jsonb)
    ELSE '[]'::jsonb
  END
) > 0
ON CONFLICT (order_id, line_index) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS — staff par email
-- ---------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stores_staff_all ON public.stores;
CREATE POLICY stores_staff_all ON public.stores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS store_stock_staff_all ON public.store_stock;
CREATE POLICY store_stock_staff_all ON public.store_stock
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS stock_movements_staff_all ON public.stock_movements;
CREATE POLICY stock_movements_staff_all ON public.stock_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS order_items_staff_all ON public.order_items;
CREATE POLICY order_items_staff_all ON public.order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

COMMIT;

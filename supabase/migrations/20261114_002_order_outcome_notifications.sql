-- Migration 20261114_002_order_outcome_notifications.sql
-- Suivi de commande : issue (livrée / annulée), client injoignable, relance des commandes sans suivi.
--
-- 1. orders.unreachable_count / orders.last_unreachable_at : « Client injoignable » est un compteur,
--    pas un statut (orders_status_check et sync_order_stock_on_status inchangés).
-- 2. notify_order_outcome() : trigger AFTER UPDATE OF status -> order_delivered / order_cancelled
--    (dedup order.<status>.<id>). Le motif n'est relayé que s'il appartient à la liste fermée
--    ORDER_CANCEL_REASONS (utils/orderWorkflow.ts) : aucun texte libre dans le groupe WhatsApp.
-- 3. mark_order_unreachable(p_order_id) : RPC staff, une tentative au plus toutes les 10 min,
--    notification order_unreachable (dedup order.unreachable.<id>.<n>).
-- 4. notify_order_stale() : relance à paliers 48 h puis 7 j (dedup order.stale.<id>.<palier>),
--    commandes ouvertes de moins de 30 j, 20 au plus par passage. pg_cron '15 7-19 * * *' UTC.
--
-- Statuts ouverts (même liste que ORDER_OPEN_STATUSES) : pending, confirmed, ready, shipped.
-- Ventes comptoir exclues (delivery_mode = 'pos') ; la date de commande est orders.date
-- (la table n'a pas de colonne created_at).
-- L'acteur (« — Par : X ») est ajouté par stamp_admin_notification_actor (20261020_014).

BEGIN;

-- 1. Compteur de tentatives de contact sans réponse -------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS unreachable_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_unreachable_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_unreachable_count_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_unreachable_count_check CHECK (unreachable_count >= 0);
  END IF;
END $$;

-- 2. Issue de la commande (livrée / annulée) -------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_order_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Miroir de ORDER_CANCEL_REASONS (utils/orderWorkflow.ts), vérifié par tests/order-outcome-notifications.test.ts
  c_reasons constant text[] := ARRAY['Client injoignable', 'Client a renoncé', 'Rupture de stock', 'Doublon', 'Prix ou délai refusé'];
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
     OR NEW.status NOT IN ('delivered', 'cancelled')
     OR NEW.delivery_mode = 'pos' THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.admin_notifications (
      dedup_key,
      event_type,
      title,
      message,
      link_to_tab,
      link_to_id,
      created_by
    ) VALUES (
      format('order.%s.%s', NEW.status, NEW.id),
      'order_' || NEW.status,
      CASE NEW.status WHEN 'delivered' THEN 'Commande livrée' ELSE 'Commande annulée' END,
      concat_ws(' — ',
        '#' || NEW.id,
        format('%s FCFA', trim(to_char(coalesce(NEW.total, 0), 'FM999G999G999'))),
        CASE WHEN NEW.status = 'cancelled' AND NEW.cancellation_reason = ANY (c_reasons)
             THEN 'Motif : ' || NEW.cancellation_reason END
      ),
      'orders',
      NEW.id,
      'trigger'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Une alerte ne doit jamais bloquer le changement de statut.
    RAISE WARNING 'notify_order_outcome(%): %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_order_outcome() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_order_outcome ON public.orders;
CREATE TRIGGER trg_notify_order_outcome
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_outcome();

-- 3. Client injoignable (RPC staff) ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_order_unreachable(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_id uuid;
  v_order    public.orders%ROWTYPE;
  v_count    integer;
  v_at       timestamptz := now();
BEGIN
  SELECT c.staff_id INTO v_staff_id FROM public._current_staff_ctx() c;
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_order.status NOT IN ('pending', 'confirmed', 'ready', 'shipped') THEN
    RAISE EXCEPTION 'Commande déjà clôturée : tentative non enregistrée';
  END IF;

  -- Double appui ou deux vendeurs en même temps : aucune écriture, aucune alerte en double.
  IF v_order.last_unreachable_at IS NOT NULL
     AND v_order.last_unreachable_at > v_at - interval '10 minutes' THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'count', v_order.unreachable_count,
      'last_unreachable_at', v_order.last_unreachable_at
    );
  END IF;

  v_count := v_order.unreachable_count + 1;

  UPDATE public.orders
  SET unreachable_count = v_count,
      last_unreachable_at = v_at
  WHERE id = p_order_id;

  BEGIN
    INSERT INTO public.admin_notifications (
      dedup_key,
      event_type,
      title,
      message,
      link_to_tab,
      link_to_id,
      created_by
    ) VALUES (
      format('order.unreachable.%s.%s', p_order_id, v_count),
      'order_unreachable',
      'Client injoignable',
      concat_ws(' — ',
        '#' || p_order_id,
        format('%s FCFA', trim(to_char(coalesce(v_order.total, 0), 'FM999G999G999'))),
        format('tentative n°%s', v_count)
      ),
      'orders',
      p_order_id,
      'staff'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'mark_order_unreachable(%): %', p_order_id, SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'count', v_count,
    'last_unreachable_at', v_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_unreachable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_unreachable(text) TO authenticated;

-- 4. Relance des commandes sans suivi (pg_cron) ----------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_order_stale()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first_threshold  constant interval := interval '48 hours';
  v_second_threshold constant interval := interval '7 days';
  v_max_age          constant interval := interval '30 days';
  v_batch_limit      constant integer  := 20;
  v_inserted         integer := 0;
BEGIN
  WITH candidates AS (
    SELECT
      o.id,
      o.total,
      o.date,
      o.unreachable_count,
      CASE WHEN o.date < now() - v_second_threshold THEN '7d' ELSE '48h' END AS tier
    FROM public.orders o
    WHERE o.status IN ('pending', 'confirmed', 'ready', 'shipped')
      AND o.delivery_mode IS DISTINCT FROM 'pos'
      AND o.date < now() - v_first_threshold
      AND o.date >= now() - v_max_age
  ),
  due AS (
    SELECT c.*
    FROM candidates c
    -- NOT EXISTS avant LIMIT : les commandes déjà relancées à ce palier ne consomment pas le lot.
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_notifications n
      WHERE n.dedup_key = format('order.stale.%s.%s', c.id, c.tier)
    )
    ORDER BY c.date
    LIMIT v_batch_limit
  )
  INSERT INTO public.admin_notifications (
    dedup_key,
    event_type,
    title,
    message,
    link_to_tab,
    link_to_id,
    created_by
  )
  SELECT
    format('order.stale.%s.%s', d.id, d.tier),
    'order_stale',
    'Commande sans suivi',
    concat_ws(' — ',
      '#' || d.id,
      format('%s FCFA', trim(to_char(coalesce(d.total, 0), 'FM999G999G999'))),
      format('en attente depuis %s h', floor(extract(epoch FROM (now() - d.date)) / 3600)::integer),
      CASE WHEN d.unreachable_count > 0 THEN format('injoignable ×%s', d.unreachable_count) END
    ),
    'orders',
    d.id,
    'system'
  FROM due d
  ON CONFLICT (dedup_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_order_stale() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_order_stale() TO service_role;

-- Enregistrement idempotent du job pg_cron (8 h 15 - 20 h 15 Douala, soit 7 h 15 - 19 h 15 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'order-stale-hourly';

    PERFORM cron.schedule(
      'order-stale-hourly',
      '15 7-19 * * *',
      $cron$SELECT public.notify_order_stale();$cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;

COMMIT;

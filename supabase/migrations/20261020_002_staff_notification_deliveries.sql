-- Notifications staff relayées vers des canaux externes (Telegram aujourd'hui, WhatsApp demain).
--
-- admin_notifications sert de boîte d'envoi : chaque événement y est inséré une seule fois
-- (dedup_key UNIQUE), indépendamment de tout canal. notification_deliveries trace l'envoi
-- par (notification, canal) : ajouter un canal = un adaptateur dans l'Edge Function notify-staff,
-- aucune migration.
--
-- Nouveaux événements :
--   stock_low / stock_out     : products.stock passe sous le seuil (stock synchronisé depuis store_stock)
--   marketplace_listed        : nouvelle annonce marketplace
-- Le troc (troc_submitted…) est déjà émis par notify_trade_in_status_change.
--
-- Secret : le job lit CRON_SECRET dans Vault (nom 'cron_secret'), jamais en clair ici.
--   select vault.create_secret('<valeur de CRON_SECRET>', 'cron_secret');
-- Tant qu'il est absent, l'appel est refusé (401) sans effet de bord.
--
-- Idempotent : rejouable sans erreur ni doublon.

BEGIN;

-- 1. Suivi d'envoi par canal ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  notification_id uuid        NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  channel         text        NOT NULL CHECK (channel ~ '^[a-z][a-z0-9_]{1,31}$'),
  sent_at         timestamptz,
  claimed_at      timestamptz,
  attempts        integer     NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, channel)
);

CREATE INDEX IF NOT EXISTS notification_deliveries_pending_idx
  ON public.notification_deliveries (channel, created_at)
  WHERE sent_at IS NULL;

-- Service role uniquement (Edge Function) : RLS sans policy = aucun accès client.
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 2. Réclamation atomique, générique par canal ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(
  p_channel     text,
  p_event_types text[],
  p_limit       integer DEFAULT 20
)
RETURNS TABLE (
  notification_id uuid,
  event_type      text,
  title           text,
  message         text,
  link_to_tab     text,
  link_to_id      text,
  attempts        integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_attempts CONSTANT integer  := 5;
  -- Les notifications plus anciennes ne sont jamais relayées (évite d'inonder un canal ajouté plus tard).
  c_max_age      CONSTANT interval := interval '24 hours';
  -- Une ligne réclamée mais jamais confirmée (fonction tombée) redevient disponible après ce délai.
  c_claim_ttl    CONSTANT interval := interval '2 minutes';
BEGIN
  INSERT INTO public.notification_deliveries (notification_id, channel)
  SELECT n.id, p_channel
  FROM public.admin_notifications n
  WHERE n.event_type = ANY (p_event_types)
    AND n.created_at > now() - c_max_age
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  WITH claimed AS (
    UPDATE public.notification_deliveries d
    SET claimed_at = now(),
        attempts   = d.attempts + 1
    WHERE (d.notification_id, d.channel) IN (
      SELECT x.notification_id, x.channel
      FROM public.notification_deliveries x
      JOIN public.admin_notifications n ON n.id = x.notification_id
      WHERE x.channel = p_channel
        AND x.sent_at IS NULL
        AND x.attempts < c_max_attempts
        AND (x.claimed_at IS NULL OR x.claimed_at < now() - c_claim_ttl)
        AND n.event_type = ANY (p_event_types)
        AND n.created_at > now() - c_max_age
      ORDER BY n.created_at
      LIMIT greatest(1, least(p_limit, 50))
      FOR UPDATE OF x SKIP LOCKED
    )
    RETURNING d.notification_id, d.attempts
  )
  SELECT n.id, n.event_type, n.title, n.message, n.link_to_tab, n.link_to_id, c.attempts
  FROM claimed c
  JOIN public.admin_notifications n ON n.id = c.notification_id
  ORDER BY n.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_deliveries(text, text[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(text, text[], integer) TO service_role;

-- 3. Stock bas / rupture --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_product_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Seuil d'alerte : à 2 unités ou moins, il est temps de réapprovisionner.
  c_low_stock_threshold CONSTANT integer := 2;
  v_event_type text;
  v_title      text;
BEGIN
  -- Bloc protégé : une alerte ratée ne doit jamais annuler le mouvement de stock.
  BEGIN
    -- Alerte au franchissement du seuil seulement (pas à chaque mouvement sous le seuil).
    IF NEW.stock IS NULL OR NEW.stock > c_low_stock_threshold
       OR coalesce(OLD.stock, 0) <= NEW.stock
       OR (coalesce(OLD.stock, 0) <= c_low_stock_threshold AND NEW.stock > 0) THEN
      RETURN NEW;
    END IF;

    IF NEW.stock <= 0 THEN
      v_event_type := 'stock_out';
      v_title      := 'Rupture de stock';
    ELSE
      v_event_type := 'stock_low';
      v_title      := 'Stock bas';
    END IF;

    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
    VALUES (
      -- Une alerte par produit, type et jour : un réassort puis une nouvelle baisse re-alertent le lendemain.
      format('%s.%s.%s', v_event_type, NEW.id, to_char(now() AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')),
      v_event_type,
      v_title,
      format('%s — %s restant(s)', NEW.name, greatest(NEW.stock, 0)),
      'inventory',
      NEW.id,
      'trigger'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_product_low_stock: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_product_low_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_product_low_stock ON public.products;
CREATE TRIGGER trg_notify_product_low_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_low_stock();

-- 4. Nouvelle annonce marketplace -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_marketplace_listing_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
    VALUES (
      format('marketplace.listed.%s', NEW.id),
      'marketplace_listed',
      'Nouvelle annonce marketplace',
      concat_ws(' — ',
        trim(coalesce(NEW.device_brand, '') || ' ' || coalesce(NEW.device_model, '')),
        nullif(concat_ws(' / ',
          CASE WHEN NEW.ram_gb IS NOT NULL THEN NEW.ram_gb || ' Go' END,
          CASE WHEN NEW.storage_gb IS NOT NULL THEN NEW.storage_gb || ' Go' END), ''),
        'grade ' || NEW.grade,
        format('%s à %s FCFA', NEW.price_min, NEW.price_max),
        NEW.city),
      'marketplace',
      NEW.id::text,
      'trigger'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_marketplace_listing_created: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_marketplace_listing_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_marketplace_listing_created ON public.marketplace_listings;
CREATE TRIGGER trg_notify_marketplace_listing_created
  AFTER INSERT ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_listing_created();

-- 5. Relais chaque minute (l'Edge Function traite chaque canal configuré) ------------------------
SELECT cron.unschedule('notify-staff-every-minute')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-staff-every-minute');

SELECT cron.schedule(
  'notify-staff-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tawnusmfyvugqczaydat.supabase.co/functions/v1/notify-staff',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'), '')
    ),
    body    := '{}'::jsonb
  )
  -- Rien de récent dans la boîte d'envoi → aucun appel HTTP.
  WHERE EXISTS (
    SELECT 1 FROM public.admin_notifications WHERE created_at > now() - interval '24 hours'
  );
  $$
);

COMMIT;

-- Notifications staff : détails enrichis pour le Smart Troc et alerte produits sans image.
--
-- Événements :
--   1. troc_submitted : enrichi avec téléphone client, stockage/RAM, diagnostic (écran, corps, batterie) et offres.
--   2. product_missing_image : alerte si un produit est ajouté ou si son image est vidée/invalide.
--
-- Idempotent : rejouable sans erreur.

BEGIN;

-- 1. Troc soumis : détail complet dans le message ------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_trade_in_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title       TEXT;
  v_message     TEXT;
  v_event_type  TEXT;
  v_dedup_key   TEXT;
  v_device      TEXT;
  v_customer    TEXT;
  v_condition   TEXT;
  v_offers      TEXT;
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;

    v_device := concat_ws(' ',
      trim(coalesce(NEW.device_brand, '') || ' ' || coalesce(NEW.device_model, '')),
      nullif(concat_ws(' / ',
        CASE WHEN NEW.device_storage IS NOT NULL THEN NEW.device_storage END,
        CASE WHEN NEW.device_ram IS NOT NULL THEN NEW.device_ram END
      ), '')
    );

    v_customer := coalesce(nullif(NEW.customer_name, ''), 'client anonyme');

    IF NEW.status = 'pending' THEN
      v_event_type := 'troc_submitted';
      v_title      := 'Nouveau dossier troc';

      -- Détails de diagnostic
      v_condition := concat_ws(', ',
        CASE WHEN NEW.screen_condition IS NOT NULL THEN 'Écran ' || NEW.screen_condition END,
        CASE WHEN NEW.body_condition IS NOT NULL THEN 'Corps ' || NEW.body_condition END,
        CASE WHEN NEW.battery_health IS NOT NULL THEN 'Batterie ' || NEW.battery_health || '%' END
      );

      -- Offres estimées
      v_offers := concat_ws(' / ',
        CASE WHEN NEW.offer_cash IS NOT NULL THEN NEW.offer_cash || ' FCFA cash' END,
        CASE WHEN NEW.offer_credit IS NOT NULL THEN NEW.offer_credit || ' FCFA bon d''achat' END
      );

      -- Message structuré au format "Sujet — Détail 1 — Détail 2 — ..."
      v_message := concat_ws(' — ',
        coalesce(nullif(v_device, ''), 'Appareil non précisé'),
        'Client : ' || v_customer || CASE WHEN coalesce(NEW.customer_phone, '') <> '' THEN ' (' || NEW.customer_phone || ')' ELSE '' END,
        nullif('État : ' || v_condition, 'État : '),
        nullif('Offre estimée : ' || v_offers, 'Offre estimée : ')
      );

      v_dedup_key  := format('troc.submitted.%s', NEW.id);
    ELSIF NEW.status = 'completed' THEN
      v_event_type := 'troc_completed';
      v_title      := 'Troc clôturé';
      v_message    := format('%s — rachat finalisé pour %s', coalesce(nullif(v_device, ''), 'appareil'), v_customer);
      v_dedup_key  := format('troc.completed.%s', NEW.id);
    ELSIF NEW.status = 'refused' THEN
      v_event_type := 'troc_refused';
      v_title      := 'Troc refusé';
      v_message    := format('%s — %s (motif : %s)',
        coalesce(nullif(v_device, ''), 'appareil'),
        v_customer,
        coalesce(nullif(NEW.redemption_reason, ''), 'non précisé')
      );
      v_dedup_key  := format('troc.refused.%s', NEW.id);
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, target_role, created_by)
    VALUES
      (v_dedup_key, v_event_type, v_title, v_message, 'troc', NEW.id, 'responsable', 'trigger')
    ON CONFLICT (dedup_key) DO UPDATE
      SET message = EXCLUDED.message,
          title   = EXCLUDED.title;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_trade_in_status_change(%): %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_trade_in_status ON public.trade_in_requests;
CREATE TRIGGER trg_notify_trade_in_status
  AFTER INSERT OR UPDATE OF status ON public.trade_in_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_trade_in_status_change();


-- 2. Alerte produit sans image -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_product_missing_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_missing boolean;
BEGIN
  BEGIN
    v_is_missing := (NEW.image IS NULL OR trim(NEW.image) = '' OR NEW.image ILIKE '%placeholder%' OR NEW.image ILIKE '%icon-192%');

    IF NOT v_is_missing THEN
      RETURN NEW;
    END IF;

    -- Sur UPDATE : on alerte seulement si l'image vient d'être vidée ou altérée en placeholder
    IF TG_OP = 'UPDATE' THEN
      IF (OLD.image IS NULL OR trim(OLD.image) = '' OR OLD.image ILIKE '%placeholder%' OR OLD.image ILIKE '%icon-192%') THEN
        RETURN NEW;
      END IF;
    END IF;

    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, created_by)
    VALUES (
      format('product.no_image.%s.%s', NEW.id, to_char(now() AT TIME ZONE 'Africa/Douala', 'YYYY-MM-DD')),
      'product_missing_image',
      'Produit sans image',
      format('%s — Aucune photo HD renseignée — %s FCFA — %s',
        NEW.name,
        coalesce(NEW.price::text, '0'),
        coalesce(NEW.category, 'non catégorisé')
      ),
      'inventory',
      NEW.id,
      'trigger'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_product_missing_image: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_product_missing_image() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_product_missing_image ON public.products;
CREATE TRIGGER trg_notify_product_missing_image
  AFTER INSERT OR UPDATE OF image ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_product_missing_image();

COMMIT;

-- Fix colonnes de montants de troc pour l'alerte staff (trade_in_value_cash et trade_in_value).
--
-- Idempotent : rejouable sans erreur.

BEGIN;

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
  v_target      TEXT;
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

      -- Offres estimées (colonnes réelles de trade_in_requests)
      v_offers := concat_ws(' / ',
        CASE WHEN NEW.trade_in_value_cash IS NOT NULL AND NEW.trade_in_value_cash > 0 THEN NEW.trade_in_value_cash || ' FCFA cash' END,
        CASE WHEN NEW.trade_in_value IS NOT NULL AND NEW.trade_in_value > 0 THEN NEW.trade_in_value || ' FCFA bon d''achat' END
      );

      -- Cible si Smart Troc
      v_target := CASE WHEN NEW.target_product_name IS NOT NULL AND trim(NEW.target_product_name) <> '' THEN 'Cible : ' || NEW.target_product_name END;

      -- Message structuré au format "Sujet — Détail 1 — Détail 2 — ..."
      v_message := concat_ws(' — ',
        coalesce(nullif(v_device, ''), 'Appareil non précisé'),
        'Client : ' || v_customer || CASE WHEN coalesce(NEW.customer_phone, '') <> '' THEN ' (' || NEW.customer_phone || ')' ELSE '' END,
        nullif('État : ' || v_condition, 'État : '),
        nullif('Offre estimée : ' || v_offers, 'Offre estimée : '),
        v_target
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

COMMIT;

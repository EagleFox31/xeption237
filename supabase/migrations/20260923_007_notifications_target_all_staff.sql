-- Les notifs SMART TROC ciblaient `responsable` strictement (RLS égalité) :
-- un `direction` ou `super_admin` ne les voyait PAS (pas d'héritage de rôle).
-- Pour une petite équipe, mieux vaut target_role NULL (toute l'équipe staff)
-- et laisser l'UI filtrer par pertinence (tabs accessibles).
--
-- Rejouable (CREATE OR REPLACE).

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
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;

    v_device   := trim(coalesce(NEW.device_brand, '') || ' ' || coalesce(NEW.device_model, ''));
    v_customer := coalesce(nullif(NEW.customer_name, ''), 'client anonyme');

    IF NEW.status = 'pending' THEN
      v_event_type := 'troc_submitted';
      v_title      := 'Nouveau dossier troc';
      v_message    := format('%s — %s', coalesce(nullif(v_device, ''), 'appareil non précisé'), v_customer);
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

    -- target_role NULL = toute l'équipe staff voit la notif
    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, target_role, created_by)
    VALUES
      (v_dedup_key, v_event_type, v_title, v_message, 'troc', NEW.id, NULL, 'trigger')
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_trade_in_status_change(%): %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMIT;

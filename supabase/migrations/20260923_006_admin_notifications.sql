-- Notifications admin persistées (issue #17 — tranche 1).
--
-- Deux chemins de création :
--   1. DB-triggered (automatique) : trigger AFTER sur trade_in_requests pour
--      les événements SMART TROC (submitted / completed / refused).
--   2. Client-triggered (manuel) : staff peut INSERT via policy RLS. Utilisé
--      par les actions UI (sync offline, feedback, etc.).
--
-- Garanties :
--   • Dédup : UNIQUE constraint sur `dedup_key` → INSERT ON CONFLICT DO NOTHING
--     empêche les doublons même si le trigger refire ou si le client retry.
--   • Non-régressive : trigger ENCAPSULÉ dans BEGIN...EXCEPTION pour que son
--     échec ne roll back JAMAIS la transaction parente (contrat issue #17).
--
-- Rejouable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Signature stable de l'événement (ex: 'troc.submitted.<request_id>') : UNIQUE
  -- pour empêcher les doublons. NULL autorisé pour les notifs sans dédup (ex: toast
  -- ad-hoc manuel).
  dedup_key     TEXT UNIQUE,
  -- Type structuré (ex: 'troc_submitted', 'order_created'). Permet le routing
  -- côté UI et les futurs filtres par type.
  event_type    TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  -- Deep-link UI : ouvre l'onglet admin + optionnellement l'entité pointée.
  link_to_tab   TEXT,
  link_to_id    TEXT,
  -- Null = toute l'équipe staff voit la notif. Sinon doit matcher staff.role.
  target_role   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Marque "lue" global (team shared read) — simpler que per-user pour une
  -- petite équipe. Evolution per-user : table de jointure séparée plus tard.
  read_at       TIMESTAMPTZ,
  created_by    TEXT NOT NULL DEFAULT 'system'
);

-- Lecture : non-lues en premier (90% du traffic)
CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON public.admin_notifications (created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_notifications_type_idx
  ON public.admin_notifications (event_type, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS lecture : staff voit les notifs globales (target_role NULL) ou matchant
-- son rôle.
DROP POLICY IF EXISTS "admin_notifications_select_staff"
  ON public.admin_notifications;
CREATE POLICY "admin_notifications_select_staff"
  ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
        AND (
          admin_notifications.target_role IS NULL
          OR s.role = admin_notifications.target_role
        )
    )
  );

-- RLS update : staff peut marquer lu/non-lu. On ne restreint pas quelles colonnes
-- côté SQL (trop verbeux) — le service côté client limite à `read_at`.
DROP POLICY IF EXISTS "admin_notifications_update_staff"
  ON public.admin_notifications;
CREATE POLICY "admin_notifications_update_staff"
  ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email'))
  )
  WITH CHECK (true);

-- RLS insert : staff authentifié peut créer des notifs (actions UI manuelles).
-- Les notifs auto venant des triggers passent par SECURITY DEFINER → bypass RLS.
DROP POLICY IF EXISTS "admin_notifications_insert_staff"
  ON public.admin_notifications;
CREATE POLICY "admin_notifications_insert_staff"
  ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email'))
  );

-- ─── Trigger notifications SMART TROC ────────────────────────────────────────
-- Génère automatiquement des notifs admin aux moments-clés du pipeline :
--   • status = 'pending' (soumission client) → "Nouveau dossier troc"
--   • status = 'completed'                   → "Troc clôturé"
--   • status = 'refused'                     → "Troc refusé"
-- Les transitions intermédiaires (accepted/contacted/appointment) ne génèrent
-- PAS de notif push : elles sont dans le dashboard pipeline (#11, #12).

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
  -- Bloc protégé : TOUT échec ici ne doit pas rollback la transaction parente.
  BEGIN
    -- On ne notifie que sur les transitions de statut (ou l'INSERT direct en pending)
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
      -- Transitions intermédiaires : pas de notification push
      RETURN NEW;
    END IF;

    INSERT INTO public.admin_notifications
      (dedup_key, event_type, title, message, link_to_tab, link_to_id, target_role, created_by)
    VALUES
      (v_dedup_key, v_event_type, v_title, v_message, 'troc', NEW.id, 'responsable', 'trigger')
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- CONTRAT : le trigger n'est JAMAIS bloquant. On trace la cause dans les
    -- logs Postgres et on laisse la transaction parente aboutir.
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

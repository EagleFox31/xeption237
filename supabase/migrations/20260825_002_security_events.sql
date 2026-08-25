-- Journal des événements de sécurité, lisible par la direction.
--
-- Motif immédiat : un membre du staff peut désormais changer son propre mot de
-- passe, et la direction doit en être informée. Le centre de notifications de
-- l'admin ne pouvait pas servir à ça — `useAdminNotifications` est du simple
-- `useState` : local à un onglet, perdu au rechargement, et il n'atteint jamais
-- un autre utilisateur. Il fallait donc passer par la base.
--
-- La table est volontairement générique : d'autres événements viendront
-- (réinitialisation par un admin, changement de rôle, accès refusé).

CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL CHECK (event_type IN (
                'password_changed_self',
                'password_reset_by_admin',
                'role_changed'
              )),
  actor_email TEXT NOT NULL,
  actor_name  TEXT,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_recent_idx
  ON public.security_events (created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Écriture : un membre du staff ne consigne QUE son propre événement.
-- Le contrôle porte sur l'email du jeton, pas sur une valeur envoyée par le
-- client : sans cela, n'importe qui pourrait fabriquer un événement au nom
-- d'un autre.
DROP POLICY IF EXISTS security_events_self_insert ON public.security_events;
CREATE POLICY security_events_self_insert
  ON public.security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(actor_email) = lower(auth.jwt() ->> 'email')
    AND EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Lecture : direction seulement, comme les objectifs de vente
-- (cf. 20260824_025, `role IN ('direction', 'super_admin')`).
DROP POLICY IF EXISTS security_events_direction_read ON public.security_events;
CREATE POLICY security_events_direction_read
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
        AND s.role IN ('direction', 'super_admin')
    )
  );

-- Pas de politique UPDATE ni DELETE : un journal qu'on peut réécrire ne
-- prouve rien. Seul le service_role, qui contourne la RLS, pourrait purger.

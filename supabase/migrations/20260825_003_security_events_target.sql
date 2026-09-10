-- Qui a fait quoi, et SUR QUI.
--
-- La première version de security_events ne portait qu'un acteur. Suffisant
-- pour « X a changé son mot de passe », inutilisable pour les deux autres
-- événements prévus : « l'admin a réinitialisé le mot de passe de Y » et
-- « le rôle de Y est passé de vendeur à responsable ». Sans la cible, le
-- journal dirait qu'il s'est passé quelque chose, sans dire à qui.

ALTER TABLE public.security_events
  ADD COLUMN IF NOT EXISTS target_email TEXT,
  ADD COLUMN IF NOT EXISTS target_name  TEXT;

COMMENT ON COLUMN public.security_events.target_email IS
  'Personne concernée. NULL quand l''acteur agit sur lui-même (password_changed_self).';

CREATE INDEX IF NOT EXISTS security_events_target_idx
  ON public.security_events (lower(target_email), created_at DESC);

-- La politique d'insertion reste inchangée : `actor_email` doit correspondre à
-- l'email du jeton. Un admin consigne donc l'action EN SON NOM, avec la cible
-- en `target_email` — il ne peut toujours pas écrire au nom de quelqu'un d'autre.

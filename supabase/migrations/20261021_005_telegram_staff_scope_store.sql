-- Bot Telegram staff : boutique consultée par la direction.
-- Un message libre (recherche) n'apporte aucun contexte : sans mémoire, la direction
-- retombait sur « Toutes boutiques » après avoir choisi une boutique. Le bot écrit ici le
-- code de la boutique ouverte (NULL = vue réseau). Simple préférence de navigation : les
-- RPC revérifient toujours le rang et la boutique.
BEGIN;

ALTER TABLE public.telegram_staff_links
  ADD COLUMN IF NOT EXISTS scope_store_code text;

COMMIT;

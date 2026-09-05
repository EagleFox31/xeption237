-- ============================================================================
-- Suivi des migrations appliquées.
--
-- POURQUOI : `scripts/apply-migration.mjs` exécutait du SQL sans rien enregistrer,
-- et des migrations sont aussi passées à la main dans l'éditeur SQL Supabase.
-- Le dossier `supabase/migrations/` n'était donc PAS une source de vérité de
-- l'état réel de la base. Tolérable à un seul auteur, dangereux à plusieurs.
--
-- Le script crée cette table automatiquement si elle manque ; ce fichier existe
-- pour que la table soit versionnée comme le reste du schéma.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  -- Nom du fichier de migration (ex. '20260721_003_troc_redemption_audit.sql').
  version     TEXT PRIMARY KEY,
  name        TEXT,
  -- SHA-256 du contenu au moment de l'application : détecte un fichier édité
  -- APRÈS avoir été appliqué (le disque et la prod ont alors divergé).
  checksum    TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'apply-migration' | 'baseline' | 'manual' — d'où vient l'enregistrement.
  applied_by  TEXT NOT NULL DEFAULT 'apply-migration'
);

CREATE INDEX IF NOT EXISTS schema_migrations_applied_at_idx
  ON public.schema_migrations (applied_at DESC);

-- Table d'outillage : jamais exposée au navigateur.
-- RLS activée SANS policy pour anon/authenticated => tout accès leur est refusé.
-- (`service_role` contourne la RLS par conception, il n'a pas besoin de policy.)
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

COMMIT;

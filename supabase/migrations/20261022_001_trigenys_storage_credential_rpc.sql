-- Trigenys Storage : lecture serveur du secret tenant « xeption » (Edge Function storage-upload-intent).
-- Rattrapage : fonction créée à la main en prod ; ce fichier reproduit l'état observé (idempotent).
-- Le secret lui-même vit dans Supabase Vault sous le nom 'trigenys_storage_xeption' et n'est
-- jamais versionné : le créer via le dashboard (Vault) ou vault.create_secret, hors migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.trigenys_storage_xeption_credential()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT ds.decrypted_secret
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'trigenys_storage_xeption'
  ORDER BY ds.created_at DESC
  LIMIT 1
$function$;

-- Secret serveur : ni navigateur ni session staff, uniquement service_role.
REVOKE ALL ON FUNCTION public.trigenys_storage_xeption_credential() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigenys_storage_xeption_credential() TO service_role;

COMMIT;

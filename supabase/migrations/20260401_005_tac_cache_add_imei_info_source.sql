-- Autorise la nouvelle source imei_info dans tac_cache

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tac_cache_source_check'
      AND conrelid = 'public.tac_cache'::regclass
  ) THEN
    ALTER TABLE tac_cache DROP CONSTRAINT tac_cache_source_check;
  END IF;
END $$;

ALTER TABLE tac_cache
  ADD CONSTRAINT tac_cache_source_check
  CHECK (source IN ('imeidb', 'imeicheck', 'imei_info', 'gemini', 'manual'));


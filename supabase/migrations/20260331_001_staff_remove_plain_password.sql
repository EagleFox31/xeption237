-- T1 hardening: remove insecure plaintext password storage from public.staff
-- Date: 2026-03-31

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'password'
  ) THEN
    -- Step 1: neutralize existing plaintext values
    EXECUTE 'UPDATE public.staff SET password = NULL WHERE password IS NOT NULL';

    -- Step 2: drop legacy password column from staff profile table
    EXECUTE 'ALTER TABLE public.staff DROP COLUMN password';
  END IF;
END
$$;

COMMIT;

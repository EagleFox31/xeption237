-- Ancien trigger staff → auth.users (plaintext password + champ username inexistant).
-- Remplacé par l’edge function create-staff-auth.
DROP TRIGGER IF EXISTS on_staff_created ON public.staff;
DROP FUNCTION IF EXISTS public.sync_staff_to_auth();

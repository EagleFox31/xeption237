-- iPhone Air : specs RAM + écran (Apple ne publie pas la RAM sur sa fiche officielle)
-- Toutes les capacités (256 / 512 / 1 To) partagent 12 Go LPDDR5X — source teardowns / MacRumors 2025
-- Date : 2026-07-13

BEGIN;

UPDATE public.products
SET specs = (
  COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY ord)
      FROM (
        SELECT elem, ordinality AS ord
        FROM jsonb_array_elements(COALESCE(specs, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ordinality)
        WHERE lower(trim(elem->>'label')) NOT IN (
          'ram', 'mémoire', 'memoire', 'memory',
          'écran', 'ecran', 'screen', 'display'
        )
      ) kept
    ),
    '[]'::jsonb
  )
  || jsonb_build_array(
    jsonb_build_object('label', 'Écran', 'value', '6,5 pouces'),
    jsonb_build_object('label', 'RAM', 'value', '12 Go')
  )
)
WHERE id = '18e69e24-6cba-4459-977e-5324c12c9d7b';

COMMIT;

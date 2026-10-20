-- Tecno Spark 50 (4G, sorti en avril 2026) : livré sous Android 16 / HiOS 16, pas Android 14.
-- Seule la valeur de la spec « Système d'exploitation » change ; les autres specs sont conservées.
--
-- Sauvegarde : ligne copiée une fois dans archived_rows (reason 'audit fiches 20/10/2026').
-- Idempotent : second passage = zéro écriture.

BEGIN;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'products', p.id, to_jsonb(p), 'audit fiches 20/10/2026'
FROM public.products p
WHERE p.id = '85eb3c40-0137-49f5-bc27-0debacc22491'
  AND NOT EXISTS (
    SELECT 1 FROM public.archived_rows a
    WHERE a.source_table = 'products' AND a.source_id = p.id AND a.reason = 'audit fiches 20/10/2026'
  );

UPDATE public.products p SET
  specs = (
    SELECT jsonb_agg(
      CASE WHEN s->>'label' = 'Système d''exploitation'
        THEN jsonb_set(s, '{value}', to_jsonb('Android 16 (HiOS 16)'::text))
        ELSE s END
      ORDER BY i)
    FROM jsonb_array_elements(p.specs) WITH ORDINALITY AS t(s, i)
  ),
  updated_at = now()
WHERE p.id = '85eb3c40-0137-49f5-bc27-0debacc22491'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p.specs) s
    WHERE s->>'label' = 'Système d''exploitation' AND s->>'value' IS DISTINCT FROM 'Android 16 (HiOS 16)'
  );

COMMIT;

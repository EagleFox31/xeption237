-- ============================================================================
-- Suivi de la recette fonctionnelle avant mise en ligne.
--
-- Un verdict par test du catalogue `docs/next-step/RECETTE_FONCTIONNELLE.md`,
-- stocké en base plutôt que dans le navigateur : l'équipe se répartit la recette
-- et la direction suit l'avancement depuis n'importe quel poste.
--
-- Pas d'historique volontairement : une seule ligne par test, écrasée à chaque
-- passage. La question à laquelle cette table doit répondre est « reste-t-il un
-- bloquant ? », pas « qui avait testé quoi en juillet ».
--
-- Accès : direction et super_admin (via `_require_direction_staff`). Le boss
-- suit l'avancement, la personne qui développe enregistre les verdicts.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.qa_test_runs (
  -- Identifiant du catalogue : T-C01, T-V13, P8… (texte, pas d'enum : le
  -- catalogue vit dans le code et évolue plus vite qu'une contrainte SQL).
  test_id    TEXT PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'skip')),
  note       TEXT,
  tested_by  UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  tested_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_test_runs_status_idx ON public.qa_test_runs (status);

-- Table d'outillage interne : jamais exposée au navigateur en direct.
ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;

-- ── Lecture ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_qa_test_runs()
RETURNS TABLE(
  test_id text, status text, note text,
  tested_by uuid, tested_by_name text, tested_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public._require_direction_staff();
  RETURN QUERY
  SELECT r.test_id, r.status, r.note, r.tested_by,
         COALESCE(s.name, '—'), r.tested_at
  FROM public.qa_test_runs r
  LEFT JOIN public.staff s ON s.id = r.tested_by
  ORDER BY r.tested_at DESC;
END;
$function$;

-- ── Enregistrer un verdict ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_qa_test_run(
  p_test_id text,
  p_status  text,
  p_note    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_staff uuid;
BEGIN
  PERFORM public._require_direction_staff();

  SELECT s.id INTO v_staff FROM public.staff s
  WHERE lower(s.email) = lower(auth.jwt() ->> 'email');

  IF p_test_id IS NULL OR btrim(p_test_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Test manquant.');
  END IF;
  IF p_status NOT IN ('pass', 'fail', 'skip') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verdict invalide.');
  END IF;

  INSERT INTO public.qa_test_runs (test_id, status, note, tested_by, tested_at)
  VALUES (btrim(p_test_id), p_status, NULLIF(btrim(COALESCE(p_note, '')), ''), v_staff, now())
  ON CONFLICT (test_id) DO UPDATE
    SET status = EXCLUDED.status,
        note = EXCLUDED.note,
        tested_by = EXCLUDED.tested_by,
        tested_at = now();

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ── Repasser un test à « non testé » ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_qa_test_run(p_test_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public._require_direction_staff();
  DELETE FROM public.qa_test_runs WHERE test_id = btrim(p_test_id);
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Postgres accorde EXECUTE à PUBLIC par défaut ; `anon` en hérite (cf. AGENTS.md).
REVOKE ALL ON FUNCTION public.list_qa_test_runs()                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_qa_test_run(text, text, text)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_qa_test_run(text)              FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_qa_test_runs()               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_qa_test_run(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_qa_test_run(text)           TO authenticated, service_role;

COMMIT;

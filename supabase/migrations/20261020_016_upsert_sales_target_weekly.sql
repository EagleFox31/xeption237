-- upsert_sales_target accepte 'weekly'.
-- 20260906_001 a ajouté 'weekly' à sales_targets_period_kind_check et à
-- get_sales_targets_progress, mais pas à upsert_sales_target (20260824_025) :
-- l'ERP propose « Cette semaine » puis l'enregistrement échoue sur
-- « Paramètres invalides ». Corps repris de la prod, seule la liste change.
BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_sales_target(p_scope_type text, p_period_kind text, p_target_amount numeric, p_staff_id uuid DEFAULT NULL::uuid, p_store_id uuid DEFAULT NULL::uuid, p_active boolean DEFAULT true, p_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.sales_targets%ROWTYPE;
  v_existing_id uuid;
BEGIN
  PERFORM public._require_direction_staff();

  IF p_target_amount IS NULL OR p_target_amount <= 0 THEN
    RAISE EXCEPTION 'Montant objectif invalide';
  END IF;

  IF p_scope_type NOT IN ('staff', 'store') OR p_period_kind NOT IN ('daily', 'weekly', 'monthly') THEN
    RAISE EXCEPTION 'Paramètres invalides';
  END IF;

  IF p_scope_type = 'staff' AND p_staff_id IS NULL THEN
    RAISE EXCEPTION 'Vendeur requis';
  END IF;

  IF p_scope_type = 'store' AND p_store_id IS NULL THEN
    RAISE EXCEPTION 'Boutique requise';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.sales_targets t
    SET
      scope_type = p_scope_type,
      staff_id = CASE WHEN p_scope_type = 'staff' THEN p_staff_id ELSE NULL END,
      store_id = CASE WHEN p_scope_type = 'store' THEN p_store_id ELSE NULL END,
      period_kind = p_period_kind,
      target_amount = p_target_amount,
      active = COALESCE(p_active, true),
      updated_at = now()
    WHERE t.id = p_id
    RETURNING * INTO v_row;
  ELSE
    SELECT t.id INTO v_existing_id
    FROM public.sales_targets t
    WHERE t.scope_type = p_scope_type
      AND t.period_kind = p_period_kind
      AND (
        (p_scope_type = 'staff' AND t.staff_id = p_staff_id)
        OR (p_scope_type = 'store' AND t.store_id = p_store_id)
      )
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.sales_targets t
      SET
        target_amount = p_target_amount,
        active = COALESCE(p_active, true),
        updated_at = now()
      WHERE t.id = v_existing_id
      RETURNING * INTO v_row;
    ELSE
      INSERT INTO public.sales_targets (
        scope_type, staff_id, store_id, period_kind, target_amount, active
      )
      VALUES (
        p_scope_type,
        CASE WHEN p_scope_type = 'staff' THEN p_staff_id ELSE NULL END,
        CASE WHEN p_scope_type = 'store' THEN p_store_id ELSE NULL END,
        p_period_kind,
        p_target_amount,
        COALESCE(p_active, true)
      )
      RETURNING * INTO v_row;
    END IF;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objectif introuvable';
  END IF;

  RETURN to_jsonb(v_row);
END;
$function$
;

REVOKE ALL ON FUNCTION public.upsert_sales_target(text, text, numeric, uuid, uuid, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_sales_target(text, text, numeric, uuid, uuid, boolean, uuid) TO authenticated, service_role;

COMMIT;

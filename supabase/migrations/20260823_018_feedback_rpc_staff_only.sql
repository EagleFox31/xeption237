-- ============================================================================
-- Ferme la fuite de données clients sur les RPC feedback.
--
-- PROBLÈME : `list_due_feedback_invites` était en SECURITY DEFINER, sans contrôle
-- d'appartenance au staff, et accordée à `anon` — dont la clé est publiée dans le
-- bundle JS. Elle renvoie `token`, `customer_name` et `customer_phone` de chaque
-- invitation en attente. N'importe quel visiteur pouvait donc récupérer en un appel
-- la liste des clients livrés (nom + téléphone + appareil acheté) et poster de faux
-- avis avec les jetons.
--
-- Les tables sont pourtant verrouillées (REVOKE ALL + RLS) : c'est la fonction
-- SECURITY DEFINER ouverte à `anon` qui servait de porte dérobée.
--
-- ⚠️ Le GRANT seul ne suffit PAS : chez Supabase, `signInAnonymously()` produit une
-- session portant le rôle `authenticated`. Un contrôle d'appartenance réelle à
-- `staff` est donc indispensable EN PLUS du retrait du grant `anon`.
--
-- Restent volontairement publiques : `get_feedback_invite` et `submit_feedback`,
-- protégées par le jeton de 144 bits présent dans le lien envoyé au client.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

-- ── Liste des invitations dues : STAFF UNIQUEMENT ───────────────────────────
CREATE OR REPLACE FUNCTION public.list_due_feedback_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    -- Exception plutôt qu'un tableau vide : une liste vide masquerait une
    -- mauvaise configuration de compte au lieu de la signaler.
    RAISE EXCEPTION 'Accès réservé à l''équipe';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.invite_at ASC)
      FROM (
        SELECT
          i.id AS token,
          i.order_id,
          i.repair_ticket_id,
          i.kind,
          i.customer_name,
          i.customer_phone,
          i.headline,
          i.invite_at,
          i.sent_at,
          i.completed_at
        FROM public.order_feedback_invites i
        WHERE i.completed_at IS NULL
          AND i.invite_at <= now()
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

-- ── Marquer une invitation comme envoyée : STAFF UNIQUEMENT ─────────────────
CREATE OR REPLACE FUNCTION public.mark_feedback_invite_sent(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès réservé à l''équipe');
  END IF;

  UPDATE public.order_feedback_invites
  SET sent_at = COALESCE(sent_at, now())
  WHERE id = p_token AND completed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation introuvable.');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Retrait des droits d'exécution ──────────────────────────────────────────

-- Admin : `authenticated` conservé (le staff est authentifié), mais le contrôle
-- interne ci-dessus est ce qui protège réellement — une session anonyme Supabase
-- porte elle aussi le rôle `authenticated`.
REVOKE EXECUTE ON FUNCTION public.list_due_feedback_invites()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_feedback_invite_sent(text)  FROM anon;

-- Créées uniquement par les triggers `trg_orders_feedback_invites` et
-- `trg_repair_tickets_feedback_invite`, qui s'exécutent en SECURITY DEFINER :
-- le propriétaire les appelle sans passer par ces GRANT. Aucun appel applicatif
-- direct (vérifié dans services/orderFeedback.ts) → on ferme des deux côtés.
REVOKE EXECUTE ON FUNCTION public.ensure_order_feedback_invites(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_sav_feedback_invite(text)    FROM anon, authenticated;

COMMIT;

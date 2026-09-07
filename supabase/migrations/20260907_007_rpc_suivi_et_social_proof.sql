-- Deux portes etroites pour remplacer la lecture publique de `orders`
--
-- POURQUOI. La policy « Public Read Orders » autorise `SELECT *` a n'importe
-- qui. Tant que la table etait vide c'etait sans effet ; depuis que le tunnel
-- de commande fonctionne a nouveau (20260907_006), chaque commande y expose
-- nom, email, telephone, ville, montant et contenu du panier.
--
-- ET LA REFERENCE NE PROTEGE RIEN. Elle est fabriquee ainsi :
--
--     `ORD-${Date.now().toString().slice(-6)}`
--
-- soit les six derniers chiffres de l'horodatage : un million de valeurs, et
-- surtout DERIVEES DU TEMPS. Qui connait l'heure approximative d'une commande
-- en devine le voisinage immediat. Un suivi qui ne demande que la reference
-- n'est donc pas un secret partage, c'est un compteur.
--
-- D'ou le choix : le suivi exige la REFERENCE **et** le TELEPHONE. Deux
-- elements que le client possede, qu'un tiers ne devine pas ensemble.
--
-- Les deux ecrans publics concernes n'ont besoin de rien d'autre :
--   OrderTracking  une commande, la sienne
--   SocialProof    un compteur et une ville — aucune donnee nominative

BEGIN;

-- ── 1. Suivi d'une commande : reference + telephone ────────────────────────
--
-- Comparaison du telephone sur ses CHIFFRES seulement : le client tape
-- « 690 00 00 00 », « +237690000000 » ou « 237-690-000-000 » indifferemment.
-- On compare les 8 derniers chiffres, ce qui ignore l'indicatif pays.
--
-- L'email n'est jamais renvoye : la page ne l'affiche pas, il n'a donc rien a
-- faire dans une reponse publique. Le telephone non plus — celui qui interroge
-- vient de le fournir.
CREATE OR REPLACE FUNCTION public.track_order(p_reference text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ref text := upper(trim(coalesce(p_reference, '')));
  v_tel text := right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 8);
  o     public.orders%ROWTYPE;
BEGIN
  -- Un telephone trop court rendrait la comparaison triviale : on refuse.
  IF v_ref = '' OR length(v_tel) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO o
  FROM public.orders
  WHERE upper(id) = v_ref
    AND right(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), 8) = v_tel
  LIMIT 1;

  IF NOT FOUND THEN
    -- Meme reponse que pour un mauvais telephone : ne pas laisser deviner
    -- qu'une reference existe.
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', o.id,
    'items', o.items,
    'total', o.total,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'customer_name', o.customer_name,
    'customer_city', o.customer_city,
    'delivery_mode', o.delivery_mode,
    'date', o.date
  );
END;
$fn$;

COMMENT ON FUNCTION public.track_order(text, text) IS
  'Suivi public d''une commande : exige la reference ET le telephone. Ne renvoie ni email ni telephone. Remplace la lecture publique de orders.';

REVOKE ALL ON FUNCTION public.track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated, service_role;

-- ── 2. Compteur public : agregats, aucune donnee nominative ────────────────
--
-- SocialProof faisait deux requetes : un comptage sur sept jours, et la lecture
-- des 50 dernieres villes pour en tirer la plus frequente. La seconde ramenait
-- 50 lignes de commandes cote navigateur pour n'en garder qu'un mot. Le calcul
-- se fait desormais en base, et il ne sort que deux valeurs.
CREATE OR REPLACE FUNCTION public.get_social_proof_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT jsonb_build_object(
    'weekly_sales', (
      SELECT count(*)
      FROM public.orders
      WHERE date >= now() - interval '7 days'
        AND status <> 'cancelled'
    ),
    'top_city', (
      SELECT customer_city
      FROM (
        SELECT customer_city
        FROM public.orders
        WHERE customer_city IS NOT NULL AND trim(customer_city) <> ''
        ORDER BY date DESC
        LIMIT 50
      ) recentes
      GROUP BY customer_city
      ORDER BY count(*) DESC, customer_city
      LIMIT 1
    )
  );
$fn$;

COMMENT ON FUNCTION public.get_social_proof_stats() IS
  'Compteur public : ventes des 7 derniers jours et ville la plus frequente sur les 50 dernieres commandes. Aucune donnee nominative.';

REVOKE ALL ON FUNCTION public.get_social_proof_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_social_proof_stats() TO anon, authenticated, service_role;

COMMIT;

-- CE QUI RESTE A FAIRE, DANS CET ORDRE — la policy en DERNIER, sinon le suivi
-- de commande casse avant que le code ne sache appeler les RPC :
--
--   1. OrderTracking : ajouter un champ telephone et appeler track_order.
--   2. SocialProof   : appeler get_social_proof_stats.
--   3. Alors seulement : DROP POLICY "Public Read Orders" et les autres SELECT
--      publiques sur orders.
--
-- A part, et independant : la reference de commande devrait cesser d'etre
-- derivee de l'horodatage. Un suffixe aleatoire la rendrait non devinable.

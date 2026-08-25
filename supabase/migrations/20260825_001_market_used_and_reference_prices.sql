-- Ancrage prix du Smart Troc : deux sources d'OCCASION.
--
-- Contexte. Jusqu'ici le prix de reference venait exclusivement de boutiques qui
-- vendent du NEUF (kmerphone, glotelho). Tout l'ecart neuf -> occasion devait
-- donc etre absorbe par le ratio de reprise, alors que cet ecart varie
-- enormement selon le modele : mesure le 2026-08-25, un iPhone 13 neuf est a
-- 245 000 XAF chez kmerphone et le meme modele d'occasion a 199 500 chez
-- glotelho, tandis que des Galaxy Z Fold reconditionnes affichent 41 a 46 % de
-- decote. Un ratio unique ne peut pas representer les deux.
--
-- Deux tables, parce que les deux sources n'ont pas le meme regime de confiance :
--   * market_used_offers      : collecte automatique, volumineuse, perissable
--   * market_reference_prices : saisie humaine, rare, datee et attribuee
--
-- Le predicat staff est ecrit en clair, comme dans le reste des migrations
-- (20260823_012, 20260824_027) : il n'existe pas de fonction is_staff() dans
-- ce schema, contrairement a ce que j'avais suppose.
--
-- GARDE-FOU METIER : on consigne ici des prix CONSTATES SUR LE MARCHE, jamais
-- nos propres prix de reprise. Ancrer sur nos prix serait circulaire.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Offres d'occasion collectees automatiquement
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_used_offers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key     TEXT NOT NULL,
  country_code  TEXT NOT NULL DEFAULT 'CM',
  source        TEXT NOT NULL,
  source_url    TEXT,
  title         TEXT NOT NULL,
  price_xaf     INTEGER NOT NULL CHECK (price_xaf > 0),
  -- Prix barre de la boutique. NON fiable comme reference neuf : glotelho
  -- affichait 775 000 pour un iPhone 13 que kmerphone vend neuf a 245 000.
  -- Conserve a titre indicatif, jamais utilise comme plafond.
  compare_price_xaf INTEGER CHECK (compare_price_xaf IS NULL OR compare_price_xaf > 0),
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, title, price_xaf, captured_at)
);

CREATE INDEX IF NOT EXISTS market_used_offers_lookup_idx
  ON public.market_used_offers (model_key, country_code, captured_at DESC);

ALTER TABLE public.market_used_offers ENABLE ROW LEVEL SECURITY;

-- Lecture staff uniquement : ces relevés sont de la donnée concurrentielle.
-- L'ecriture passe par le service_role (script de rendu), qui contourne la RLS.
DROP POLICY IF EXISTS market_used_offers_staff_read ON public.market_used_offers;
CREATE POLICY market_used_offers_staff_read
  ON public.market_used_offers
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Prix constates par la boutique
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Remplace CATALOG_FALLBACK, un tableau fige dans services/trocEvaluationService.ts
-- portant le commentaire « A enrichir au fil des passages en boutique » — alors
-- que l'enrichir demandait un deploiement. Personne ne pouvait le tenir a jour.

CREATE TABLE IF NOT EXISTS public.market_reference_prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand         TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  storage       TEXT,
  country_code  TEXT NOT NULL DEFAULT 'CM',
  -- Prix CONSTATE sur le marche pour un appareil d'occasion de cet etat.
  price_xaf     INTEGER NOT NULL CHECK (price_xaf > 0),
  condition     TEXT NOT NULL DEFAULT 'used'
                CHECK (condition IN ('used', 'refurbished', 'new')),
  -- Ou le prix a ete constate : « marche Mfoundi », « glotelho », « client »...
  observed_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  observed_from TEXT NOT NULL,
  note          TEXT,
  created_by    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_reference_prices_lookup_idx
  ON public.market_reference_prices (country_code, lower(brand), lower(model_name), observed_at DESC);

ALTER TABLE public.market_reference_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS market_reference_prices_staff_read ON public.market_reference_prices;
CREATE POLICY market_reference_prices_staff_read
  ON public.market_reference_prices
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS market_reference_prices_staff_write ON public.market_reference_prices;
CREATE POLICY market_reference_prices_staff_write
  ON public.market_reference_prices
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Lecture pour la valorisation
-- ─────────────────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER : l'evaluation de troc part d'une session anonyme, qui ne
-- peut pas lire les tables ci-dessus. Elle n'obtient ici qu'un montant agrege,
-- jamais le detail des releves.
--
-- Le GRANT est explicite et restreint : Postgres accorde EXECUTE a PUBLIC par
-- defaut sur toute nouvelle fonction, et `anon` en herite. On revoque d'abord.

CREATE OR REPLACE FUNCTION public.market_reference_price(
  p_brand   TEXT,
  p_model   TEXT,
  p_country TEXT DEFAULT 'CM'
)
RETURNS TABLE (price_xaf INTEGER, observed_at DATE, observed_from TEXT, sample_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH recent AS (
    SELECT r.price_xaf, r.observed_at, r.observed_from
    FROM public.market_reference_prices r
    WHERE r.country_code = p_country
      AND lower(r.brand) = lower(p_brand)
      AND lower(r.model_name) = lower(p_model)
      AND r.condition IN ('used', 'refurbished')
      -- Au-dela de 180 jours, un prix constate ne dit plus rien du marche.
      AND r.observed_at >= CURRENT_DATE - INTERVAL '180 days'
    ORDER BY r.observed_at DESC
    LIMIT 5
  )
  SELECT
    (percentile_disc(0.5) WITHIN GROUP (ORDER BY price_xaf))::INTEGER,
    max(observed_at),
    (array_agg(observed_from ORDER BY observed_at DESC))[1],
    count(*)::INTEGER
  FROM recent
  HAVING count(*) > 0;
$$;

REVOKE ALL ON FUNCTION public.market_reference_price(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.market_reference_price(TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.market_reference_price(TEXT, TEXT, TEXT) TO authenticated;

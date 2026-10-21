-- Extension pg_trgm and fuzzystrmatch for typo-tolerant product search (2-3 characters distance)
-- Combined scoring: Substring match + Trigram word similarity + Levenshtein distance on words.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

DROP FUNCTION IF EXISTS public.telegram_search_products_fuzzy(text);
DROP FUNCTION IF EXISTS public.telegram_search_products_fuzzy(text, text, integer);
DROP FUNCTION IF EXISTS public.telegram_search_products_fuzzy(text, text, text, integer);

CREATE OR REPLACE FUNCTION public.telegram_search_products_fuzzy(
  p_query text,
  p_store_code text DEFAULT NULL,
  p_telegram_user_id text DEFAULT NULL,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  id text,
  name text,
  price numeric,
  stock integer,
  store_stock integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := lower(trim(coalesce(p_query, '')));
  v_words text[];
  v_store_id uuid;
BEGIN
  IF length(v_clean) < 2 THEN
    RETURN;
  END IF;

  SELECT array_agg(w) INTO v_words
  FROM unnest(regexp_split_to_array(v_clean, '\s+')) w
  WHERE length(w) > 0;

  IF v_words IS NULL OR array_length(v_words, 1) = 0 THEN
    RETURN;
  END IF;

  IF p_store_code IS NOT NULL AND p_store_code <> '' THEN
    SELECT s.id INTO v_store_id FROM public.stores s WHERE lower(s.code) = lower(p_store_code) LIMIT 1;
  ELSIF p_telegram_user_id IS NOT NULL AND p_telegram_user_id <> '' THEN
    SELECT st.id INTO v_store_id
    FROM public.telegram_staff_links l
    JOIN auth.users u ON u.id = l.auth_user_id
    JOIN public.staff s ON lower(s.email) = lower(u.email)
    JOIN public.stores st ON st.id = s.store_id
    WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
    LIMIT 1;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      p.id::text,
      p.name::text,
      p.price::numeric,
      coalesce(p.stock, 0)::integer as stock,
      coalesce(ss.quantity, 0)::integer as store_stock,
      (
        -- 1. Exact match bonus
        CASE WHEN lower(p.name) = v_clean THEN 100.0 ELSE 0.0 END +
        -- 2. Direct substring match bonus
        CASE WHEN lower(p.name) ILIKE '%' || v_clean || '%' THEN 60.0 ELSE 0.0 END +
        -- 3. All query words present in product name
        CASE WHEN coalesce((
          SELECT bool_and(lower(p.name) ILIKE '%' || w || '%')
          FROM unnest(v_words) w
          WHERE length(w) >= 2
        ), false) THEN 40.0 ELSE 0.0 END +
        -- 4. Trigram word similarity (max 40 pts)
        (word_similarity(v_clean, lower(p.name)) * 40.0) +
        -- 5. Levenshtein typo tolerance (2 to 3 characters tolerance)
        (
          SELECT coalesce(max(
            CASE
              WHEN levenshtein(w, pw) <= 1 AND length(w) >= 3 THEN 35.0
              WHEN levenshtein(w, pw) <= 2 AND length(w) >= 4 THEN 25.0
              WHEN levenshtein(w, pw) <= 3 AND length(w) >= 6 THEN 15.0
              ELSE 0.0
            END
          ), 0.0)
          FROM unnest(v_words) w,
               unnest(regexp_split_to_array(lower(p.name), '[\s\-\.,/]+')) pw
          WHERE length(w) >= 3 AND length(pw) >= 3
        ) +
        -- In stock bonus (5 pts)
        CASE WHEN coalesce(p.stock, 0) > 0 THEN 5.0 ELSE 0.0 END
      )::numeric as score
    FROM public.products p
    LEFT JOIN public.store_stock ss ON ss.product_id = p.id AND ss.store_id = v_store_id
  )
  SELECT s.id, s.name, s.price, s.stock, s.store_stock
  FROM scored s
  WHERE s.score >= 18.0
  ORDER BY
    (CASE WHEN coalesce(s.store_stock, s.stock) > 0 THEN 1 ELSE 0 END) DESC,
    (CASE WHEN s.stock > 0 THEN 1 ELSE 0 END) DESC,
    s.score DESC,
    s.stock DESC
  LIMIT coalesce(p_limit, 6);
END;
$$;

-- Mise à jour de telegram_staff_product_lookup pour bénéficier de la recherche tolérante
CREATE OR REPLACE FUNCTION public.telegram_staff_product_lookup(
  p_query text,
  p_telegram_user_id text
)
RETURNS TABLE (id text, name text, stock integer, price numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.telegram_staff_links l
    JOIN auth.users u ON u.id = l.auth_user_id
    JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Telegram account not linked to staff' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT f.id, f.name, f.stock, f.price
  FROM public.telegram_search_products_fuzzy(
    p_query => p_query,
    p_store_code => NULL,
    p_telegram_user_id => p_telegram_user_id,
    p_limit => 8
  ) f;
END;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_search_products_fuzzy(text, text, text, integer) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.telegram_staff_product_lookup(text, text) TO service_role, authenticated;

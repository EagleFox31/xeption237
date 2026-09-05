-- Migration : référentiel d'années de sortie (règle Troc « pas de reprise > 8 ans »)
-- Date : 2026-06-15
-- model_key = buildModelKey(brand, model) normalisé (minuscules, sans accents, alnum→_).
-- Seed = 32 modèles catalogue + vieux modèles courants (les candidats au refus).
-- Le reste se remplit via scripts/import-phone-releases.mjs (Wikidata) ou fallback Gemini.

BEGIN;

CREATE TABLE IF NOT EXISTS public.phone_releases (
  model_key    TEXT PRIMARY KEY,
  release_year INT  NOT NULL CHECK (release_year BETWEEN 1995 AND 2100),
  source       TEXT NOT NULL DEFAULT 'seed',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_releases ENABLE ROW LEVEL SECURITY;

-- Lecture publique (anon) : le flux Troc tourne côté client avec la clé anon.
DROP POLICY IF EXISTS "phone_releases_public_read" ON public.phone_releases;
CREATE POLICY "phone_releases_public_read"
  ON public.phone_releases FOR SELECT
  TO anon, authenticated USING (true);

-- ── Seed : catalogue Argus (32) ──────────────────────────────────────────────
INSERT INTO public.phone_releases (model_key, release_year, source) VALUES
  ('apple_macbook_air_m1', 2020, 'seed'),
  ('apple_macbook_pro_m3', 2023, 'seed'),
  ('apple_macbook_pro_m2', 2022, 'seed'),
  ('apple_macbook_air_m2', 2022, 'seed'),
  ('apple_macbook_pro_m1', 2020, 'seed'),
  ('apple_macbook_pro_intel_touchbar', 2019, 'seed'),
  ('apple_iphone_13_pro_max', 2021, 'seed'),
  ('apple_iphone_13_pro', 2021, 'seed'),
  ('apple_iphone_13', 2021, 'seed'),
  ('apple_iphone_12_pro_max', 2020, 'seed'),
  ('apple_iphone_12_pro', 2020, 'seed'),
  ('apple_iphone_11_pro_max', 2019, 'seed'),
  ('apple_iphone_11', 2019, 'seed'),
  ('apple_iphone_xr', 2018, 'seed'),
  ('apple_iphone_15_pro', 2023, 'seed'),
  ('apple_iphone_15', 2023, 'seed'),
  ('apple_iphone_15_pro_max', 2023, 'seed'),
  ('apple_iphone_14_pro_max', 2022, 'seed'),
  ('apple_iphone_14_pro', 2022, 'seed'),
  ('apple_iphone_14', 2022, 'seed'),
  ('dell_dell_xps_13_recent', 2023, 'seed'),
  ('dell_dell_xps_15', 2022, 'seed'),
  ('hp_hp_spectre_x360', 2022, 'seed'),
  ('hp_hp_envy', 2022, 'seed'),
  ('lenovo_lenovo_thinkpad_x1', 2022, 'seed'),
  ('samsung_s22_ultra', 2022, 'seed'),
  ('samsung_s24_ultra', 2024, 'seed'),
  ('samsung_s23_ultra', 2023, 'seed'),
  ('samsung_s21_ultra', 2021, 'seed'),
  ('samsung_z_fold_5', 2023, 'seed'),
  ('samsung_z_flip_5', 2023, 'seed'),
  ('xiaomi_xiaomi_14_t', 2024, 'seed'),
-- ── Seed : vieux modèles courants (candidats au refus > 8 ans) ───────────────
  ('apple_iphone_6', 2014, 'seed'),
  ('apple_iphone_6_plus', 2014, 'seed'),
  ('apple_iphone_6s', 2015, 'seed'),
  ('apple_iphone_6s_plus', 2015, 'seed'),
  ('apple_iphone_7', 2016, 'seed'),
  ('apple_iphone_7_plus', 2016, 'seed'),
  ('apple_iphone_8', 2017, 'seed'),
  ('apple_iphone_8_plus', 2017, 'seed'),
  ('apple_iphone_x', 2017, 'seed'),
  ('apple_iphone_xs', 2018, 'seed'),
  ('apple_iphone_xs_max', 2018, 'seed'),
  ('samsung_galaxy_s5', 2014, 'seed'),
  ('samsung_galaxy_s6', 2015, 'seed'),
  ('samsung_galaxy_s7', 2016, 'seed'),
  ('samsung_galaxy_s7_edge', 2016, 'seed'),
  ('samsung_galaxy_s8', 2017, 'seed'),
  ('samsung_galaxy_s8_plus', 2017, 'seed'),
  ('samsung_galaxy_note_4', 2014, 'seed'),
  ('samsung_galaxy_note_5', 2015, 'seed'),
  ('samsung_galaxy_note_8', 2017, 'seed')
ON CONFLICT (model_key) DO NOTHING;

COMMIT;

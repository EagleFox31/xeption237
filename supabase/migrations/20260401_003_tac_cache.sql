-- Migration : table tac_cache
-- Cache persistant des correspondances TAC → marque/modèle.
--
-- Remplace le cache in-memory de check-imei (perdu à chaque cold start).
-- Sources : imeidb.3q.ua (basic), imeicheck.net (premium), Gemini, saisie manuelle.
-- S'alimente automatiquement à chaque lookup réussi.

CREATE TABLE IF NOT EXISTS tac_cache (
  tac          CHAR(8)      PRIMARY KEY CHECK (tac ~ '^\d{8}$'),
  brand        TEXT         NOT NULL,
  model        TEXT         NOT NULL DEFAULT '',
  source       TEXT         NOT NULL CHECK (source IN ('imeidb', 'imeicheck', 'gemini', 'manual')),
  confidence   NUMERIC(4,3) NOT NULL DEFAULT 0.95 CHECK (confidence >= 0 AND confidence <= 1),
  verified_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index pour les recherches par marque (analytics, admin).
CREATE INDEX IF NOT EXISTS idx_tac_cache_brand ON tac_cache (lower(brand));

-- RLS : lecture publique (edge functions anon), écriture service role uniquement.
ALTER TABLE tac_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tac_cache_read_all"
  ON tac_cache FOR SELECT USING (true);

CREATE POLICY "tac_cache_write_service"
  ON tac_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Pré-population : TAC connus sur le marché camerounais.
-- Ajoute les tiens après vérification sur https://www.imei.info ou imeicheck.net.
-- Le TAC 35315826 est vérifié dans cette session (Samsung Galaxy S21+ 5G).
-- ---------------------------------------------------------------------------
INSERT INTO tac_cache (tac, brand, model, source, confidence) VALUES
  ('35315826', 'Samsung', 'Galaxy S21+ 5G', 'manual', 1.000)
ON CONFLICT (tac) DO NOTHING;

-- Exemples à compléter avec les modèles récurrents en boutique :
-- INSERT INTO tac_cache (tac, brand, model, source, confidence) VALUES
--   ('35XXXXXX', 'Samsung', 'Galaxy A14',        'manual', 1.000),
--   ('35XXXXXX', 'Tecno',   'Camon 20',          'manual', 1.000),
--   ('35XXXXXX', 'Infinix', 'Hot 30',            'manual', 1.000),
--   ('35XXXXXX', 'Apple',   'iPhone 14',         'manual', 1.000),
--   ('35XXXXXX', 'Xiaomi',  'Redmi Note 12',     'manual', 1.000)
-- ON CONFLICT (tac) DO NOTHING;

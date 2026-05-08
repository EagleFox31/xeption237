-- Migration : renommage des colonnes de valorisation dans trade_in_requests
-- offer_cash / offer_credit / offer_type → trade_in_value / trade_in_grade
--
-- Le troc Xeption est un échange téléphone contre téléphone :
--   - trade_in_value : valeur de reprise unique (en FCFA, arrondie à 5000)
--   - trade_in_grade : qualité de l'appareil (excellent / bon / pieces / refuse)
--
-- offer_cash et offer_credit sont supprimés (concept de rachat cash — ne correspond pas au modèle troc).

BEGIN;

-- 1. Renommer offer_cash → trade_in_value
ALTER TABLE trade_in_requests
  RENAME COLUMN offer_cash TO trade_in_value;

-- 2. Supprimer offer_credit (le bonus crédit +10% n'existe plus : une seule valeur de reprise)
ALTER TABLE trade_in_requests
  DROP COLUMN IF EXISTS offer_credit;

-- 3. Renommer offer_type → trade_in_grade et mettre à jour la contrainte CHECK
ALTER TABLE trade_in_requests
  RENAME COLUMN offer_type TO trade_in_grade;

-- Mise à jour de la contrainte CHECK (si elle existe)
ALTER TABLE trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_offer_type_check;

ALTER TABLE trade_in_requests
  ADD CONSTRAINT trade_in_requests_trade_in_grade_check
  CHECK (trade_in_grade IN ('excellent', 'bon', 'pieces', 'refuse'));

-- 4. Mettre à jour les lignes existantes avec les anciennes valeurs DB
UPDATE trade_in_requests SET trade_in_grade = 'excellent'  WHERE trade_in_grade = 'buyback';
UPDATE trade_in_requests SET trade_in_grade = 'bon'        WHERE trade_in_grade = 'partial_credit';
UPDATE trade_in_requests SET trade_in_grade = 'pieces'     WHERE trade_in_grade = 'spare_parts';
UPDATE trade_in_requests SET trade_in_grade = 'refuse'     WHERE trade_in_grade = 'refused';

COMMIT;

-- Vérification après migration :
-- SELECT trade_in_value, trade_in_grade, COUNT(*) FROM trade_in_requests GROUP BY 1, 2 ORDER BY 3 DESC;

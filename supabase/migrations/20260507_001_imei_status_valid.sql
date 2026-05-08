-- 1. Ajout des nouvelles colonnes
ALTER TABLE trade_in_requests
ADD COLUMN IF NOT EXISTS imei_blacklist_status TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS imei_assurance_level TEXT NOT NULL DEFAULT 'basic';

-- 2. Suppression de l'ancienne contrainte imei_status
ALTER TABLE trade_in_requests DROP CONSTRAINT IF EXISTS trade_in_requests_imei_status_check;

-- 3. Mise à jour des données existantes
UPDATE trade_in_requests
SET 
  imei_status = 'valid',
  imei_blacklist_status = 'unknown',
  imei_assurance_level = 'basic'
WHERE imei_status = 'not_blacklisted';

-- 4. Ajout des nouvelles contraintes
ALTER TABLE trade_in_requests
ADD CONSTRAINT trade_in_requests_imei_status_check
CHECK (imei_status IN ('not_checked', 'valid', 'invalid', 'check_failed'));

ALTER TABLE trade_in_requests
ADD CONSTRAINT trade_in_requests_imei_blacklist_status_check
CHECK (imei_blacklist_status IN ('unknown', 'clear', 'blacklisted'));

ALTER TABLE trade_in_requests
ADD CONSTRAINT trade_in_requests_imei_assurance_level_check
CHECK (imei_assurance_level IN ('basic', 'premium'));

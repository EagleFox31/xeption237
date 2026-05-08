-- Renommage du statut IMEI 'clean' → 'not_blacklisted'
-- Raison : 'clean' était sémantiquement trompeur — il n'affirme pas qu'un appareil
-- est authentique, seulement qu'il n'est pas signalé dans notre base de blacklist.

-- 1. Migrer les données existantes
UPDATE trade_in_requests
SET imei_status = 'not_blacklisted'
WHERE imei_status = 'clean';

-- 2. Remplacer la contrainte CHECK
ALTER TABLE trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_imei_status_check;

ALTER TABLE trade_in_requests
  ADD CONSTRAINT trade_in_requests_imei_status_check
  CHECK (imei_status IN ('not_checked', 'not_blacklisted', 'blacklisted', 'check_failed'));

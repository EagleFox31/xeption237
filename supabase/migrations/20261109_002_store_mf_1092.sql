-- Seconde caisse du Mfoundi Mall : le local « MF 1092 » tient son propre rapport de
-- caisse quotidien (opérateurs et chaîne de solde distincts de la boutique MFOUNDI).
-- Sans boutique dédiée, les deux rapports du même jour entrent en conflit sur
-- UNIQUE (store_id, report_date) et le backfill WhatsApp les met de côté.
--
-- Le nom ne contient volontairement pas « Mfoundi » : la reprise WhatsApp reconnaît
-- la boutique par un mot distinctif de la ligne « Boutique … » (ici « 1092 ») ; un nom
-- partageant « Mfoundi » rendrait la ligne « Boutique mfoundi mall » ambiguë.
--
-- Idempotent : rejouable, ne touche pas une boutique existante.
BEGIN;

INSERT INTO public.stores (code, name, city, active, is_default)
VALUES ('MF1092', 'MF 1092', 'Yaoundé', true, false)
ON CONFLICT (code) DO NOTHING;

COMMIT;

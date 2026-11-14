-- Aligne les libellés des points de vente sur la liste officielle communiquée
-- par la direction le 11/11/2026 : Mfoundi-Mall 1038, Mfoundi-Mall 1092,
-- Olembé gare routière. Codes et identifiants inchangés (aucun impact sur les
-- rapports, le stock ou le bot). Le magasin « siege » (is_default, porteur du
-- stock principal) n'est pas touché : sa désactivation suppose un transfert
-- de stock, hors périmètre.
-- Idempotent : UPDATE par code, no-op si le nom est déjà le bon.
BEGIN;

UPDATE public.stores SET name = 'Mfoundi-Mall 1038', updated_at = now()
WHERE code = 'MFOUNDI' AND name IS DISTINCT FROM 'Mfoundi-Mall 1038';

UPDATE public.stores SET name = 'Mfoundi-Mall 1092', updated_at = now()
WHERE code = 'MF1092' AND name IS DISTINCT FROM 'Mfoundi-Mall 1092';

UPDATE public.stores SET name = 'Olembé gare routière', updated_at = now()
WHERE code = 'OLEMBE' AND name IS DISTINCT FROM 'Olembé gare routière';

COMMIT;

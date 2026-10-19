-- Garantie par défaut et specs des variantes ambiguës (suite de l'audit du 19/10/2026).
--
--   1. Garantie : les produits à 0 mois passent à 3 mois (décision boutique). Les garanties déjà
--      renseignées (1, 3, 6, 12, 24 mois…) ne changent pas.
--   2. Tecno Pop 10, Redmi Note 14 5G 256 Go, Tecno Pop 3 : specs complétées ou corrigées d'après
--      les fiches publiques (GSMArena, revendeurs) ; descriptions alignées.
--
-- Sauvegarde : lignes touchées copiées une fois dans archived_rows (reason 'audit fiches 19/10/2026 b').
-- Idempotent : second passage = zéro écriture.

BEGIN;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'products', p.id, to_jsonb(p), 'audit fiches 19/10/2026 b'
FROM public.products p
WHERE (p.warranty_months = 0 OR p.id IN (
  'c6b5b3db-56a4-410d-a0e7-6ca1393fb769',
  'fd5541ea-05b1-43af-8143-ed32893cc803',
  'c9075aa2-e363-41c8-a1a3-2eff378a0f5c'
))
  AND NOT EXISTS (
    SELECT 1 FROM public.archived_rows a
    WHERE a.source_table = 'products' AND a.source_id = p.id AND a.reason = 'audit fiches 19/10/2026 b'
  );

UPDATE public.products SET warranty_months = 3, updated_at = now()
WHERE warranty_months = 0;

UPDATE public.products SET
  specs = $t$[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"},{"label":"Écran","value":"6,67\" HD+ IPS"},{"label":"Processeur","value":"Unisoc T7250 octa-core"},{"label":"Appareil photo principal","value":"13 MP, selfie 8 MP"},{"label":"Batterie","value":"5000 mAh, charge 15 W"},{"label":"Système d'exploitation","value":"Android Go Edition"},{"label":"RAM","value":"3 Go (+3 Go virtuels)"}]$t$::jsonb,
  description = $t$Le Tecno Pop 10 64 Go est un smartphone d’entrée de gamme fiable : grand écran HD+ de 6,67", processeur octa-core Unisoc T7250, 3 Go de RAM (+3 Go virtuels) et une batterie de 5000 mAh pour tenir toute la journée. Appareil photo 13 MP, selfie 8 MP, lecteur d’empreintes latéral et 64 Go de stockage pour vos applications et photos.$t$,
  pros = ARRAY[$t$Grande batterie pour une autonomie prolongée$t$, $t$Grand écran pour une meilleure expérience visuelle$t$, $t$Stockage interne suffisant pour les applications et photos essentielles$t$]::text[],
  cons = ARRAY[$t$Performances limitées pour les jeux exigeants$t$, $t$Appareil photo de base, pas idéal pour la photographie avancée$t$]::text[],
  updated_at = now()
WHERE id = 'c6b5b3db-56a4-410d-a0e7-6ca1393fb769'
  AND (specs IS DISTINCT FROM $t$[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"},{"label":"Écran","value":"6,67\" HD+ IPS"},{"label":"Processeur","value":"Unisoc T7250 octa-core"},{"label":"Appareil photo principal","value":"13 MP, selfie 8 MP"},{"label":"Batterie","value":"5000 mAh, charge 15 W"},{"label":"Système d'exploitation","value":"Android Go Edition"},{"label":"RAM","value":"3 Go (+3 Go virtuels)"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Tecno Pop 10 64 Go est un smartphone d’entrée de gamme fiable : grand écran HD+ de 6,67", processeur octa-core Unisoc T7250, 3 Go de RAM (+3 Go virtuels) et une batterie de 5000 mAh pour tenir toute la journée. Appareil photo 13 MP, selfie 8 MP, lecteur d’empreintes latéral et 64 Go de stockage pour vos applications et photos.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Grande batterie pour une autonomie prolongée$t$, $t$Grand écran pour une meilleure expérience visuelle$t$, $t$Stockage interne suffisant pour les applications et photos essentielles$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Performances limitées pour les jeux exigeants$t$, $t$Appareil photo de base, pas idéal pour la photographie avancée$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Écran","value":"6.67 pouces AMOLED, 120Hz"},{"label":"Stockage","value":"256 Go"},{"label":"Appareil Photo","value":"50 MP (principal, OIS) + 8 MP (ultra grand-angle) + 2 MP (macro), selfie 20 MP"},{"label":"Batterie","value":"5110 mAh"},{"label":"Charge","value":"45W filaire"},{"label":"Connectivité","value":"5G / 4G / Wi-Fi / Bluetooth"},{"label":"Processeur","value":"MediaTek Dimensity 7025-Ultra (6 nm)"},{"label":"RAM","value":"8 Go"}]$t$::jsonb,
  description = $t$Le Xiaomi Redmi Note 14 5G 256 Go associe un écran AMOLED de 6,67" à 120 Hz, le processeur MediaTek Dimensity 7025-Ultra et 8 Go de RAM. Son triple appareil photo 50 MP stabilisé + 8 MP ultra grand-angle + 2 MP macro et sa caméra selfie 20 MP couvrent tous les usages, et sa batterie de 5110 mAh avec charge 45 W tient une journée intensive. 256 Go de stockage, 5G.$t$,
  pros = ARRAY[$t$Grand écran AMOLED 120Hz très fluide$t$, $t$Capacité de stockage de 256 Go confortable$t$, $t$Autonomie solide avec recharge rapide$t$]::text[],
  cons = ARRAY[$t$Performances limitées pour les jeux très gourmands$t$, $t$Qualité des capteurs secondaires en retrait$t$]::text[],
  updated_at = now()
WHERE id = 'fd5541ea-05b1-43af-8143-ed32893cc803'
  AND (specs IS DISTINCT FROM $t$[{"label":"Écran","value":"6.67 pouces AMOLED, 120Hz"},{"label":"Stockage","value":"256 Go"},{"label":"Appareil Photo","value":"50 MP (principal, OIS) + 8 MP (ultra grand-angle) + 2 MP (macro), selfie 20 MP"},{"label":"Batterie","value":"5110 mAh"},{"label":"Charge","value":"45W filaire"},{"label":"Connectivité","value":"5G / 4G / Wi-Fi / Bluetooth"},{"label":"Processeur","value":"MediaTek Dimensity 7025-Ultra (6 nm)"},{"label":"RAM","value":"8 Go"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Xiaomi Redmi Note 14 5G 256 Go associe un écran AMOLED de 6,67" à 120 Hz, le processeur MediaTek Dimensity 7025-Ultra et 8 Go de RAM. Son triple appareil photo 50 MP stabilisé + 8 MP ultra grand-angle + 2 MP macro et sa caméra selfie 20 MP couvrent tous les usages, et sa batterie de 5110 mAh avec charge 45 W tient une journée intensive. 256 Go de stockage, 5G.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Grand écran AMOLED 120Hz très fluide$t$, $t$Capacité de stockage de 256 Go confortable$t$, $t$Autonomie solide avec recharge rapide$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Performances limitées pour les jeux très gourmands$t$, $t$Qualité des capteurs secondaires en retrait$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Écran","value":"5.7 pouces FWVGA"},{"label":"Stockage","value":"16 Go (extensible via microSD)"},{"label":"Mémoire RAM","value":"1 Go"},{"label":"Batterie","value":"3500 mAh"},{"label":"Caméra Selfie","value":"8 MP avec Flash"},{"label":"Caméra Arrière","value":"5 MP avec Flash"},{"label":"Système","value":"Android 8.1 Oreo (Go edition)"},{"label":"Processeur","value":"MediaTek MT6580 quad-core 1,3 GHz"},{"label":"Réseau","value":"2G / 3G (pas de 4G)"}]$t$::jsonb,
  description = $t$Le Tecno Pop 3 16 Go est un smartphone simple et très abordable pour les appels, les messages et les réseaux sociaux. Écran de 5,7", processeur quad-core MediaTek, 1 Go de RAM, batterie de 3500 mAh et caméra selfie 8 MP avec flash. Attention : il fonctionne en 2G/3G, sans 4G.$t$,
  pros = ARRAY[$t$Prix ultra accessible pour tous les budgets$t$, $t$Batterie de 3500 mAh très endurante$t$, $t$Selfies nets grâce au flash frontal dédié$t$]::text[],
  cons = ARRAY[$t$Pas de connectivité 4G (limité à la 3G)$t$, $t$Mémoire vive un peu juste pour le multitâche intensif$t$]::text[],
  updated_at = now()
WHERE id = 'c9075aa2-e363-41c8-a1a3-2eff378a0f5c'
  AND (specs IS DISTINCT FROM $t$[{"label":"Écran","value":"5.7 pouces FWVGA"},{"label":"Stockage","value":"16 Go (extensible via microSD)"},{"label":"Mémoire RAM","value":"1 Go"},{"label":"Batterie","value":"3500 mAh"},{"label":"Caméra Selfie","value":"8 MP avec Flash"},{"label":"Caméra Arrière","value":"5 MP avec Flash"},{"label":"Système","value":"Android 8.1 Oreo (Go edition)"},{"label":"Processeur","value":"MediaTek MT6580 quad-core 1,3 GHz"},{"label":"Réseau","value":"2G / 3G (pas de 4G)"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Tecno Pop 3 16 Go est un smartphone simple et très abordable pour les appels, les messages et les réseaux sociaux. Écran de 5,7", processeur quad-core MediaTek, 1 Go de RAM, batterie de 3500 mAh et caméra selfie 8 MP avec flash. Attention : il fonctionne en 2G/3G, sans 4G.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Prix ultra accessible pour tous les budgets$t$, $t$Batterie de 3500 mAh très endurante$t$, $t$Selfies nets grâce au flash frontal dédié$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Pas de connectivité 4G (limité à la 3G)$t$, $t$Mémoire vive un peu juste pour le multitâche intensif$t$]::text[]);

COMMIT;

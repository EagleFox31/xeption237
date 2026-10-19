-- Variantes des fiches ambiguës (suite de l'audit du 19/10/2026), décidées par la boutique :
--
--   1. Tecno Spark 50 : version 4G (Helio G81, 7000 mAh) ; specs et description complétées.
--   2. Stockage / RAM déduits du prix affiché face aux concurrents camerounais (Iziway, Glotelho,
--      Kmerphone) : iPhone 13 Pro Max 128 Go, Redmi Note 8 4 Go / 64 Go, Redmi Note 14 Pro+ 8 Go / 256 Go.
--   3. « Xiaomi Redmi Note 8A » renommé « Xiaomi Redmi 8A » (le Note 8A n'existe pas ; la fiche décrit
--      bien un Redmi 8A). L'URL produit se résout par l'id : les anciens liens restent valides.
--
-- Sauvegarde : lignes copiées une fois dans archived_rows (reason 'audit fiches 19/10/2026 c').
-- Idempotent : second passage = zéro écriture.

BEGIN;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'products', p.id, to_jsonb(p), 'audit fiches 19/10/2026 c'
FROM public.products p
WHERE p.id IN (
  '85eb3c40-0137-49f5-bc27-0debacc22491',
  '2d7aefe3-fdfe-4735-acea-ef3ae4ed354c',
  '9a91e9ff-0b6a-4585-8e99-11cf09689f6a',
  'dc54dd8f-b46b-4c29-a89e-067dba38ddeb',
  '94515ba1-a4c0-49a9-b8ac-5f6bed295abc'
)
  AND NOT EXISTS (
    SELECT 1 FROM public.archived_rows a
    WHERE a.source_table = 'products' AND a.source_id = p.id AND a.reason = 'audit fiches 19/10/2026 c'
  );

UPDATE public.products SET name = 'Xiaomi Redmi 8A', updated_at = now()
WHERE id = '94515ba1-a4c0-49a9-b8ac-5f6bed295abc' AND name IS DISTINCT FROM 'Xiaomi Redmi 8A';

UPDATE public.products SET
  specs = $t$[{"label":"Caméra principale","value":"50 MP, selfie 8 MP"},{"label":"Batterie","value":"7000 mAh, charge 18 W"},{"label":"Connectivité","value":"4G LTE"},{"label":"Système d'exploitation","value":"Android 14"},{"label":"Type de port","value":"USB-C"},{"label":"Sécurité","value":"Capteur d'empreintes digitales"},{"label":"Écran","value":"6,78\" HD+ IPS 120 Hz"},{"label":"Processeur","value":"MediaTek Helio G81 (12 nm)"},{"label":"RAM","value":"4 Go"},{"label":"Stockage","value":"128 Go"},{"label":"Étanchéité","value":"IP64"}]$t$::jsonb,
  description = $t$Le Tecno Spark 50 (4G) mise sur l’endurance : sa batterie de 7000 mAh avec charge 18 W tient facilement plus d’une journée. Grand écran de 6,78" à 120 Hz pour une navigation fluide, processeur MediaTek Helio G81, 4 Go de RAM et 128 Go de stockage. Appareil photo 50 MP, selfie 8 MP, lecteur d’empreintes, résistance IP64 et port USB-C.$t$,
  pros = ARRAY[$t$Grand écran fluide$t$, $t$Batterie haute capacité$t$, $t$Design moderne et ergonomique$t$]::text[],
  cons = ARRAY[$t$Puissance limitée pour les jeux 3D exigeants$t$, $t$Vitesse de charge standard$t$]::text[],
  updated_at = now()
WHERE id = '85eb3c40-0137-49f5-bc27-0debacc22491'
  AND (specs IS DISTINCT FROM $t$[{"label":"Caméra principale","value":"50 MP, selfie 8 MP"},{"label":"Batterie","value":"7000 mAh, charge 18 W"},{"label":"Connectivité","value":"4G LTE"},{"label":"Système d'exploitation","value":"Android 14"},{"label":"Type de port","value":"USB-C"},{"label":"Sécurité","value":"Capteur d'empreintes digitales"},{"label":"Écran","value":"6,78\" HD+ IPS 120 Hz"},{"label":"Processeur","value":"MediaTek Helio G81 (12 nm)"},{"label":"RAM","value":"4 Go"},{"label":"Stockage","value":"128 Go"},{"label":"Étanchéité","value":"IP64"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Tecno Spark 50 (4G) mise sur l’endurance : sa batterie de 7000 mAh avec charge 18 W tient facilement plus d’une journée. Grand écran de 6,78" à 120 Hz pour une navigation fluide, processeur MediaTek Helio G81, 4 Go de RAM et 128 Go de stockage. Appareil photo 50 MP, selfie 8 MP, lecteur d’empreintes, résistance IP64 et port USB-C.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Grand écran fluide$t$, $t$Batterie haute capacité$t$, $t$Design moderne et ergonomique$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Puissance limitée pour les jeux 3D exigeants$t$, $t$Vitesse de charge standard$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Écran","value":"6.7 pouces Super Retina XDR avec ProMotion"},{"label":"Processeur","value":"Puce A15 Bionic (GPU 5 cœurs)"},{"label":"RAM","value":"6 Go"},{"label":"Appareil Photo","value":"Triple capteur 12 Mpx avec Scanner LiDAR"},{"label":"Vidéo","value":"Mode Cinématique et ProRes"},{"label":"Batterie","value":"Jusqu'à 28 heures de lecture vidéo"},{"label":"Réseau","value":"Compatible 5G"},{"label":"Stockage","value":"128 Go"}]$t$::jsonb,
  description = $t$L'iPhone 13 Pro Max redéfinit la performance avec sa puce A15 Bionic et son écran Super Retina XDR doté de la technologie ProMotion. Conçu pour les utilisateurs les plus exigeants, il combine une autonomie record avec un système de caméras de qualité professionnelle.$t$,
  pros = ARRAY[$t$Autonomie exceptionnelle$t$, $t$Écran Super Retina XDR 120Hz$t$, $t$Performances photo et vidéo de pointe$t$]::text[],
  cons = ARRAY[$t$Poids et dimensions imposants$t$, $t$Vitesse de recharge limitée par rapport à la concurrence$t$]::text[],
  updated_at = now()
WHERE id = '2d7aefe3-fdfe-4735-acea-ef3ae4ed354c'
  AND (specs IS DISTINCT FROM $t$[{"label":"Écran","value":"6.7 pouces Super Retina XDR avec ProMotion"},{"label":"Processeur","value":"Puce A15 Bionic (GPU 5 cœurs)"},{"label":"RAM","value":"6 Go"},{"label":"Appareil Photo","value":"Triple capteur 12 Mpx avec Scanner LiDAR"},{"label":"Vidéo","value":"Mode Cinématique et ProRes"},{"label":"Batterie","value":"Jusqu'à 28 heures de lecture vidéo"},{"label":"Réseau","value":"Compatible 5G"},{"label":"Stockage","value":"128 Go"}]$t$::jsonb OR description IS DISTINCT FROM $t$L'iPhone 13 Pro Max redéfinit la performance avec sa puce A15 Bionic et son écran Super Retina XDR doté de la technologie ProMotion. Conçu pour les utilisateurs les plus exigeants, il combine une autonomie record avec un système de caméras de qualité professionnelle.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Autonomie exceptionnelle$t$, $t$Écran Super Retina XDR 120Hz$t$, $t$Performances photo et vidéo de pointe$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Poids et dimensions imposants$t$, $t$Vitesse de recharge limitée par rapport à la concurrence$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Écran","value":"6.3 pouces IPS LCD"},{"label":"Résolution","value":"2340 x 1080 pixels (Full HD+)"},{"label":"Processeur","value":"Qualcomm Snapdragon 665"},{"label":"Batterie","value":"4000 mAh"},{"label":"Appareil Photo Arrière","value":"48MP + 8MP + 2MP + 2MP"},{"label":"Appareil Photo Avant","value":"13 MP"},{"label":"Système","value":"Android avec interface MIUI"},{"label":"RAM","value":"4 Go"},{"label":"Stockage","value":"64 Go"}]$t$::jsonb,
  description = $t$Le Redmi Note 8 est un smartphone polyvalent offrant un excellent rapport qualité-prix, idéal pour les usages quotidiens au Cameroun. Il se distingue par son quadruple capteur photo de 48 MP et son design élégant protégé par du verre Gorilla Glass 5.$t$,
  pros = ARRAY[$t$Système quadruple caméra 48 MP polyvalent$t$, $t$Design robuste avec verre Gorilla Glass 5$t$, $t$Écran Full HD+ net et lumineux$t$]::text[],
  cons = ARRAY[$t$Charge 18W assez lente pour les standards actuels$t$, $t$Pas de puce NFC pour les paiements sans contact$t$]::text[],
  updated_at = now()
WHERE id = '9a91e9ff-0b6a-4585-8e99-11cf09689f6a'
  AND (specs IS DISTINCT FROM $t$[{"label":"Écran","value":"6.3 pouces IPS LCD"},{"label":"Résolution","value":"2340 x 1080 pixels (Full HD+)"},{"label":"Processeur","value":"Qualcomm Snapdragon 665"},{"label":"Batterie","value":"4000 mAh"},{"label":"Appareil Photo Arrière","value":"48MP + 8MP + 2MP + 2MP"},{"label":"Appareil Photo Avant","value":"13 MP"},{"label":"Système","value":"Android avec interface MIUI"},{"label":"RAM","value":"4 Go"},{"label":"Stockage","value":"64 Go"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Redmi Note 8 est un smartphone polyvalent offrant un excellent rapport qualité-prix, idéal pour les usages quotidiens au Cameroun. Il se distingue par son quadruple capteur photo de 48 MP et son design élégant protégé par du verre Gorilla Glass 5.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Système quadruple caméra 48 MP polyvalent$t$, $t$Design robuste avec verre Gorilla Glass 5$t$, $t$Écran Full HD+ net et lumineux$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Charge 18W assez lente pour les standards actuels$t$, $t$Pas de puce NFC pour les paiements sans contact$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Écran","value":"6.67 pouces AMOLED 120Hz 1.5K"},{"label":"Processeur","value":"Qualcomm Snapdragon 7s Gen 3"},{"label":"Appareil Photo","value":"Triple capteur 50MP (OIS) + 50MP (Télé) + 8MP"},{"label":"Batterie","value":"6200 mAh avec charge rapide 90W"},{"label":"Stockage","value":"256 Go UFS 3.1"},{"label":"Indice de protection","value":"IP68 / IP69K"},{"label":"Système","value":"Xiaomi HyperOS"},{"label":"RAM","value":"8 Go"}]$t$::jsonb,
  description = $t$Le Redmi Note 14 Pro+ s'impose comme une référence de durabilité avec sa certification IP69K et sa protection Gorilla Glass Victus 2. Il allie performance et élégance grâce à son processeur Snapdragon 7s Gen 3 et son superbe écran AMOLED incurvé 1.5K.$t$,
  pros = ARRAY[$t$Batterie exceptionnelle de 6200 mAh$t$, $t$Résistance extrême certifiée IP68/IP69K$t$, $t$Écran AMOLED 1.5K haute luminosité$t$]::text[],
  cons = ARRAY[$t$Absence de port jack 3.5mm$t$, $t$Écran incurvé plus sensible aux reflets$t$]::text[],
  updated_at = now()
WHERE id = 'dc54dd8f-b46b-4c29-a89e-067dba38ddeb'
  AND (specs IS DISTINCT FROM $t$[{"label":"Écran","value":"6.67 pouces AMOLED 120Hz 1.5K"},{"label":"Processeur","value":"Qualcomm Snapdragon 7s Gen 3"},{"label":"Appareil Photo","value":"Triple capteur 50MP (OIS) + 50MP (Télé) + 8MP"},{"label":"Batterie","value":"6200 mAh avec charge rapide 90W"},{"label":"Stockage","value":"256 Go UFS 3.1"},{"label":"Indice de protection","value":"IP68 / IP69K"},{"label":"Système","value":"Xiaomi HyperOS"},{"label":"RAM","value":"8 Go"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Redmi Note 14 Pro+ s'impose comme une référence de durabilité avec sa certification IP69K et sa protection Gorilla Glass Victus 2. Il allie performance et élégance grâce à son processeur Snapdragon 7s Gen 3 et son superbe écran AMOLED incurvé 1.5K.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Batterie exceptionnelle de 6200 mAh$t$, $t$Résistance extrême certifiée IP68/IP69K$t$, $t$Écran AMOLED 1.5K haute luminosité$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Absence de port jack 3.5mm$t$, $t$Écran incurvé plus sensible aux reflets$t$]::text[]);

UPDATE public.products SET
  specs = $t$[{"label":"Batterie","value":"5000 mAh avec charge 18W"},{"label":"Écran","value":"6,22 pouces HD+ IPS LCD"},{"label":"Processeur","value":"Qualcomm Snapdragon 439"},{"label":"Appareil Photo Principal","value":"12 MP (Capteur Sony IMX363)"},{"label":"Appareil Photo Selfie","value":"8 MP"},{"label":"Connectique","value":"USB Type-C et Jack 3.5mm"},{"label":"RAM","value":"2 Go"},{"label":"Stockage","value":"32 Go (extensible microSD)"}]$t$::jsonb,
  description = $t$Le Redmi 8A est un smartphone d'entrée de gamme conçu pour l'endurance avec sa batterie massive de 5000 mAh et son design ergonomique Aura Wave Grip. Il offre une expérience visuelle confortable sur son écran HD+ de 6,22 pouces, tout en garantissant une robustesse accrue grâce à la protection Gorilla Glass 5.$t$,
  pros = ARRAY[$t$Autonomie record avec batterie de 5000 mAh$t$, $t$Port USB Type-C avec support de la charge rapide 18W$t$, $t$Écran protégé par du verre Corning Gorilla Glass 5$t$]::text[],
  cons = ARRAY[$t$Absence de lecteur d'empreintes digitales$t$, $t$Capacités multitâches limitées par la RAM$t$]::text[],
  updated_at = now()
WHERE id = '94515ba1-a4c0-49a9-b8ac-5f6bed295abc'
  AND (specs IS DISTINCT FROM $t$[{"label":"Batterie","value":"5000 mAh avec charge 18W"},{"label":"Écran","value":"6,22 pouces HD+ IPS LCD"},{"label":"Processeur","value":"Qualcomm Snapdragon 439"},{"label":"Appareil Photo Principal","value":"12 MP (Capteur Sony IMX363)"},{"label":"Appareil Photo Selfie","value":"8 MP"},{"label":"Connectique","value":"USB Type-C et Jack 3.5mm"},{"label":"RAM","value":"2 Go"},{"label":"Stockage","value":"32 Go (extensible microSD)"}]$t$::jsonb OR description IS DISTINCT FROM $t$Le Redmi 8A est un smartphone d'entrée de gamme conçu pour l'endurance avec sa batterie massive de 5000 mAh et son design ergonomique Aura Wave Grip. Il offre une expérience visuelle confortable sur son écran HD+ de 6,22 pouces, tout en garantissant une robustesse accrue grâce à la protection Gorilla Glass 5.$t$
       OR pros IS DISTINCT FROM ARRAY[$t$Autonomie record avec batterie de 5000 mAh$t$, $t$Port USB Type-C avec support de la charge rapide 18W$t$, $t$Écran protégé par du verre Corning Gorilla Glass 5$t$]::text[] OR cons IS DISTINCT FROM ARRAY[$t$Absence de lecteur d'empreintes digitales$t$, $t$Capacités multitâches limitées par la RAM$t$]::text[]);

COMMIT;

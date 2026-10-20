BEGIN;

-- ==============================================================================
-- Migration : 20261019_001_update_watch_ultra_2024_photos.sql
-- Description : Remplace les images placeholder de Watch ultra 2024 par les
--               vraies photos et la galerie Cloudinary haute définition.
-- ==============================================================================

UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746540/xeption/kmljyed4tsvzwwvjv44m.jpg',
  images = ARRAY[
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746552/xeption/yke7g5obbmhk0auennaw.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746555/xeption/fjou4jglbkinusc24gip.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746554/xeption/pnmogotoo8pyj1y6pgbx.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746554/xeption/mwex341le4vgximqmgdr.jpg'
  ],
  specs = CASE 
    WHEN specs IS NULL OR jsonb_array_length(specs) = 0 THEN '[
      {"label": "Boîtier", "value": "Alliage renforcé ou Titane"},
      {"label": "Écran", "value": "AMOLED Haute Résolution"},
      {"label": "Autonomie", "value": "Jusqu''à 5-7 jours"},
      {"label": "Étanchéité", "value": "Certification IP68"},
      {"label": "Connectivité", "value": "Bluetooth 5.2 (Appels et Notifications)"},
      {"label": "Capteurs", "value": "Rythme cardiaque, SpO2, Sommeil"}
    ]'::jsonb
    ELSE specs
  END,
  pros = CASE
    WHEN pros IS NULL OR array_length(pros, 1) IS NULL THEN ARRAY[
      'Design robuste et finitions premium',
      'Écran large haute définition très lumineux',
      'Suivi complet des indicateurs de santé'
    ]
    ELSE pros
  END,
  cons = CASE
    WHEN cons IS NULL OR array_length(cons, 1) IS NULL THEN ARRAY[
      'Format volumineux pour les petits poignets',
      'Interface logicielle parfois limitée selon le modèle'
    ]
    ELSE cons
  END,
  "reviewShort" = COALESCE("reviewShort", 'Un choix performant pour ceux qui exigent le style ultra-robuste et une connectivité fiable au meilleur prix.'),
  video = COALESCE(NULLIF(video, ''), 'https://res.cloudinary.com/dli0kdkg9/video/upload/v1782746721/xeption/rnkud7ebcxgtdkwijom1.mov'),
  updated_at = NOW()
WHERE lower(trim(name)) = lower(trim('Watch ultra 2024'))
  AND (image ILIKE '%placeholder%' OR image IS NULL OR image = '');

COMMIT;

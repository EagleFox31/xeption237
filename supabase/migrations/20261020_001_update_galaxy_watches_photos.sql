-- Migration : 20261020_001_update_galaxy_watches_photos.sql
-- Date : 2026-10-20
-- Description : Associe les vraies photos officielles Cloudinary haute définition aux 3 modèles Samsung Galaxy Watch :
--               1. Samsung Galaxy Watch5 Pro (Korea) [1c196f88-7eab-46bc-a3cf-b9cde6d695fe]
--               2. Samsung Galaxy Watch6 (Korea) [34508f65-f2ac-4751-ac9f-ed5dc2638a47]
--               3. Samsung Galaxy Watch6 Classic (Korea) [e4de80e2-b59e-4e00-940a-c372937a2ad2]

-- 1. Samsung Galaxy Watch5 Pro (Korea)
-- Cadran robuste en titane, lunette concave surélevée protectrice, bracelet magnétique D-Buckle Sport
UPDATE products
SET
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479740/xeption/jmanikwpunh5yte6rtlm.jpg',
  images = ARRAY[
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479741/xeption/owcijflwbx3r5gnf8dnz.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479742/xeption/br9oxhmjldwjvmk3fbu2.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479743/xeption/ucnq1fh6yomn7l34a34j.jpg'
  ],
  updated_at = NOW()
WHERE id = '1c196f88-7eab-46bc-a3cf-b9cde6d695fe';

-- 2. Samsung Galaxy Watch6 (Korea)
-- Boîtier épuré en aluminium Armor, écran plat en cristal de saphir, bordure tactile ultra fine
UPDATE products
SET
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479743/xeption/rjrowuigfrwxbi47abhh.jpg',
  images = ARRAY[
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479744/xeption/aulgdsorwsd3gopimhef.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479746/xeption/cafrvwa04bhrrsxabkhn.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479747/xeption/vxsriwxuoggnnkycfmfv.jpg'
  ],
  updated_at = NOW()
WHERE id = '34508f65-f2ac-4751-ac9f-ed5dc2638a47';

-- 3. Samsung Galaxy Watch6 Classic (Korea)
-- Boîtier acier inoxydable, bague rotative mécanique physique crantée avec marquage des minutes, bracelet hybride cuir surpiqué
UPDATE products
SET
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479748/xeption/hn7auwmcuieschaxx5xs.jpg',
  images = ARRAY[
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479748/xeption/thkqyz1akaatyxzyumqn.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479750/xeption/uy0wi9jqn8phlhs7zqyy.jpg',
    'https://res.cloudinary.com/dli0kdkg9/image/upload/v1792479752/xeption/qsdcwhxwgxfoeaq2pcrf.jpg'
  ],
  updated_at = NOW()
WHERE id = 'e4de80e2-b59e-4e00-940a-c372937a2ad2';

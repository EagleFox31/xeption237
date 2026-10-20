-- ==============================================================================
-- Migration : 20261019_002_batch_update_products_images.sql
-- Description : Associe les vraies photos Cloudinary et galeries HD aux 20 produits
--               du catalogue qui n'avaient que le placeholder /icons/icon-192x192.png.
-- ==============================================================================

BEGIN;

-- Samsung Galaxy Watch Ultra Scellé (Photos officielles HD Cloudinary de la Watch Ultra 2024)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746540/xeption/kmljyed4tsvzwwvjv44m.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746552/xeption/yke7g5obbmhk0auennaw.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746555/xeption/fjou4jglbkinusc24gip.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746554/xeption/pnmogotoo8pyj1y6pgbx.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782746554/xeption/mwex341le4vgximqmgdr.jpg'],
  updated_at = NOW()
WHERE id = 'f47d1e04-1cb8-4fd7-b237-a7fbabb1a30e'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch FIT 3 Scellé (Photos officielles HD Cloudinary de la Fit 3)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749972/xeption/fdssxckwoxwny23manhy.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749979/xeption/gtxudyrgq2qlxagrzna0.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749981/xeption/prxwekfbhb148neritrv.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749981/xeption/zmnkjgo5oowmahdmfrff.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749981/xeption/ykk7ko5iggmeopshknim.jpg'],
  updated_at = NOW()
WHERE id = 'cd0036b0-4136-43fb-a33d-d9521b80d944'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy S23 Ultra 256 Go Scellé SIM+eSIM (Korea) (Photos officielles HD Cloudinary du S23 Ultra)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207703/xeption/zkvr3dgyt8puyjfnt15w.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207705/xeption/ljhrhydq1dkqiwbqisza.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207705/xeption/r1vm6jxwffk3v8vsqera.jpg'],
  updated_at = NOW()
WHERE id = '60480603-4c8c-404b-9a22-446adeb03762'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy S23 Ultra 1024 Go Scellé SIM+eSIM (Australia) (Photos officielles HD Cloudinary du S23 Ultra)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207703/xeption/zkvr3dgyt8puyjfnt15w.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207705/xeption/ljhrhydq1dkqiwbqisza.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207705/xeption/r1vm6jxwffk3v8vsqera.jpg'],
  updated_at = NOW()
WHERE id = 'a134a214-95e6-44aa-b474-712294a2bf17'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Z Flip4 512 Go Scellé SIM+eSIM (Korea) (Photos officielles HD Cloudinary du Galaxy Z Flip4)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204237/xeption/kbzhoybbracsuj6w8ytl.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204240/xeption/d76dl5s9wwk3vsfjjl44.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204243/xeption/jdeliluqqrkh6mo81ri2.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204246/xeption/pliapkahnko4mxuyvayn.jpg'],
  updated_at = NOW()
WHERE id = '8915b93a-f6de-41f4-8d3d-9b481be370c7'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Z Flip6 512 Go Scellé SIM+eSIM (Korea) (Photos officielles HD Cloudinary du Galaxy Z Flip6)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204548/xeption/mkz2n8avt5yeaf5gz2zg.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204553/xeption/wfl3wztj655dzpxuazkx.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781204552/xeption/eiacomml1zmalib2arze.jpg'],
  updated_at = NOW()
WHERE id = '26c50593-6d73-4642-9e0a-b22e37afa473'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Xiaomi Redmi 15C 128 Go (Photos officielles HD Cloudinary du Redmi 15C)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189022/xeption/oqulmd4ehl7q7o6wluhk.webp',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189032/xeption/ku1ajqa7xogzkntishe2.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189033/xeption/hqtxiynslulffv554lsz.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189033/xeption/x0h4uwk9epeooddpqsyy.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189033/xeption/fjyeoujsbgguipd3mgny.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189034/xeption/o6cxqcemjy2p3be0p9mh.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189033/xeption/n6wrwfejpac7wstgrqgm.webp'],
  updated_at = NOW()
WHERE id = '40280f72-8717-45ba-a011-6ddbb91cfe93'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Xiaomi Redmi A5 128 Go (Photos officielles HD Cloudinary du Redmi A5)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189187/xeption/dsj8qxsu4pvhskobj9hg.webp',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189193/xeption/gn6h59yxpewqefkifdnx.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189193/xeption/wk13vpgbi26szoakfnbi.webp', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1771189194/xeption/bmlshpv7tuconrmryjrx.webp'],
  updated_at = NOW()
WHERE id = '67ebdb03-4bb3-49ab-9ab2-f432f6ff27ec'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch7 (Korea) (Photos officielles HD Cloudinary de la Watch 7)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749518/xeption/qaks4aoguw1dgxwwtgdn.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749531/xeption/ejag0fi8pzjy0njffgy8.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/ybzrflxbjjeg1s8eoenl.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749532/xeption/xufywarr8rxsvxp5hjan.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/t94qzqemj7ocknjy4taf.jpg'],
  updated_at = NOW()
WHERE id = 'a1daac66-aaf9-4089-8e9b-0575ce64b1d7'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch7 Scellé (Photos officielles HD Cloudinary de la Watch 7)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749518/xeption/qaks4aoguw1dgxwwtgdn.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749531/xeption/ejag0fi8pzjy0njffgy8.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/ybzrflxbjjeg1s8eoenl.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749532/xeption/xufywarr8rxsvxp5hjan.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/t94qzqemj7ocknjy4taf.jpg'],
  updated_at = NOW()
WHERE id = '83d7f332-ac4b-4c79-ac36-ad1bbf50c3f4'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy S23+ 256 Go Scellé SIM+eSIM (Korea) (Photos officielles HD Cloudinary de la gamme Galaxy S23)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207241/xeption/emhwtynijeik7gft73d6.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207221/xeption/kwk2huri5y5iy8wmvnci.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781207239/xeption/izbhssxztqnuwhdkv0bn.jpg'],
  updated_at = NOW()
WHERE id = '4cd3f663-5f0b-4ebb-9b32-fe1ebf7c0395'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy S23+ 512 Go Scellé SIM+eSIM (Korea) (Photos officielles HD Cloudinary de la gamme Galaxy S23)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781203451/xeption/yz7mmixu2qejliifeq03.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781203461/xeption/lqpsmbp7os36btgah2np.jpg'],
  updated_at = NOW()
WHERE id = '198f5b94-ac4d-4fdf-affc-dcdba42e5baa'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch8 Scellé (Photos officielles HD Cloudinary Watch 8)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748359/xeption/j5avs6quhqrdhtycrd8b.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/orewmjzgkzicnjlmpkyc.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/awuzdpbqj1eio4n5ymwf.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748365/xeption/pnqmorbq9uvjzzvqbnjs.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/kvfkll1uzjnbbmjyollp.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/jqahg17j9nbifyo0w4il.jpg'],
  updated_at = NOW()
WHERE id = '49b0ce2f-4f4f-415f-bb30-6d5870f139fe'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch8 Classic Scellé (Photos officielles HD Cloudinary Watch 8 Classic)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747576/xeption/zit78etkkhdybmrpegeh.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747597/xeption/dhpmlktxtdxrresbprjp.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747606/xeption/ik4hzbmhszeajatyzyzn.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747607/xeption/bnvc038eof5e20lfsc0u.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747606/xeption/auhm2dtxufenitsv4ilx.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747607/xeption/k5hagueroclj6ecnsduw.jpg'],
  updated_at = NOW()
WHERE id = 'bfc5f3aa-8dfe-43c0-9a6e-b8cdce61711a'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch4 (Korea) (Photos HD Cloudinary gamme Galaxy Watch)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748359/xeption/j5avs6quhqrdhtycrd8b.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/orewmjzgkzicnjlmpkyc.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/awuzdpbqj1eio4n5ymwf.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748365/xeption/pnqmorbq9uvjzzvqbnjs.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/kvfkll1uzjnbbmjyollp.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782748363/xeption/jqahg17j9nbifyo0w4il.jpg'],
  updated_at = NOW()
WHERE id = 'b9a05696-3062-432b-8125-6dd6f8dc20c0'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch4 Classic (Korea) (Photos HD Cloudinary gamme Galaxy Watch Classic)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747576/xeption/zit78etkkhdybmrpegeh.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747597/xeption/dhpmlktxtdxrresbprjp.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747606/xeption/ik4hzbmhszeajatyzyzn.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747607/xeption/bnvc038eof5e20lfsc0u.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747606/xeption/auhm2dtxufenitsv4ilx.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782747607/xeption/k5hagueroclj6ecnsduw.jpg'],
  updated_at = NOW()
WHERE id = 'b83ed263-843a-443e-8c04-45a77876a17b'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Watch5 (Korea) (Photos HD Cloudinary gamme Galaxy Watch)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749518/xeption/qaks4aoguw1dgxwwtgdn.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749531/xeption/ejag0fi8pzjy0njffgy8.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/ybzrflxbjjeg1s8eoenl.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749532/xeption/xufywarr8rxsvxp5hjan.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782749533/xeption/t94qzqemj7ocknjy4taf.jpg'],
  updated_at = NOW()
WHERE id = 'a7e2f027-54b4-453d-ba38-d57e1083f316'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Samsung Galaxy Buds Core Scellé (Photos HD Cloudinary gamme Galaxy Buds)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754268/xeption/mo23osk4oylfio92c92i.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754279/xeption/fbpsqphac10quy1v08no.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754281/xeption/cvtib5ppeqayng5s6kf9.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754281/xeption/aj4zqfijo6t4suuwmomz.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754280/xeption/lqjqd675vdesrzuvwyge.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1782754280/xeption/rok2arlaujglqa6eoids.jpg'],
  updated_at = NOW()
WHERE id = '579fff10-d476-4009-8460-113fb457321b'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Xiaomi Redmi 13 256 Go (Photos HD Cloudinary série Redmi 13)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781182304/xeption/l0v3d8ib2w6tmbdouobu.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1781182317/xeption/adcjfkxiaaabvbe8tlau.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781182319/xeption/mgy6mp0cs1ogtmmoqlwb.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781182318/xeption/sjlgifmv3h80bypw9qni.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1781182319/xeption/nkys674ujdbu0boa8xgl.jpg'],
  updated_at = NOW()
WHERE id = 'ad4f3bda-9170-4ad6-8f7d-80964de40fe2'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);


-- Xiaomi Redmi Note 14 256 Go (Photos HD Cloudinary série Redmi Note 14)
UPDATE public.products
SET 
  image = 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1778755031/xeption/f0ttv0zvegqwxbfmrti2.jpg',
  images = ARRAY['https://res.cloudinary.com/dli0kdkg9/image/upload/v1778755063/xeption/bboe1bipt0dsuxhncanx.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1778755064/xeption/vovoerfhv9g6idlz389c.jpg', 'https://res.cloudinary.com/dli0kdkg9/image/upload/v1778755064/xeption/frbxu9obucmgyebttauy.jpg'],
  updated_at = NOW()
WHERE id = 'fd5541ea-05b1-43af-8143-ed32893cc803'
  AND (image = '/icons/icon-192x192.png' OR image ILIKE '%placeholder%' OR image IS NULL);

COMMIT;

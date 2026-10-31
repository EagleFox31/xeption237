/** Coordonnées boutique — alignées avec pages légales / contact */
export const SHOP_PHONE_DISPLAY = '+237 641 891 031';
export const SHOP_PHONE_TEL = '+237641891031';

/** Fiche Google Business « XEPTION » (Mfoundi Mall). Garder `index.html` (JSON-LD geo/hasMap) aligné. */
export const SHOP_MAPS_URL = 'https://maps.app.goo.gl/UB8hzGhUj3nsREcD6';
export const SHOP_MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3980.7403288168275!2d11.520552475357883!3d3.8657906961079957!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x108bcf5816bb54eb%3A0x2ee1645759fedf27!2sXEPTION!5e0!3m2!1sfr!2scm!4v1793464631427!5m2!1sfr!2scm';
export const SHOP_GEO = { latitude: 3.86579, longitude: 11.520552 } as const;

/** Second point de vente (stock suivi par le bot : `telegramStock.ts`). Garder `index.html` (JSON-LD department) aligné. */
export const SHOP_OLEMBE_ADDRESS = "Gare routière d'Olembé, face au poste de police, Yaoundé";
export const SHOP_OLEMBE_PHONE_DISPLAY = '+237 691 341 224';
export const SHOP_OLEMBE_PHONE_TEL = '+237691341224';
export const SHOP_OLEMBE_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Gare+routi%C3%A8re+Olemb%C3%A9+Yaound%C3%A9';

/** Compte TikTok officiel. Garder `index.html` (JSON-LD sameAs) aligné. */
export const SHOP_TIKTOK_URL = 'https://www.tiktok.com/@xeption_cameroun';

/** Vidéo tutoriel du Smart Troc (lecteur officiel TikTok, chargé seulement à l'ouverture). */
export const TROC_TUTORIAL_TIKTOK_VIDEO_ID = '7700144455734611221';

/** Vidéos de présentation de la boutique (page Contact). */
export const SHOP_TOUR_VIDEOS = [
  { tiktokId: '7685058583041510676', label: 'Découvrir la boutique en vidéo', title: 'Visite de la boutique Xeption au Mfoundi Mall' },
  { tiktokId: '7682006094691978516', label: 'La boutique, version humour', title: 'Présentation humoristique de la boutique Xeption' },
] as const;

-- Ajoute les URLs des photos du troc aux annonces marketplace
alter table marketplace_listings
  add column if not exists photo_urls text[] default '{}';

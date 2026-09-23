-- Annonces marketplace C2C Xeption
create table if not exists marketplace_listings (
  id            uuid        default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  device_brand  text        not null,
  device_model  text        not null,
  grade         text        not null default 'A',
  imei_status   text,
  ram_gb        int,
  storage_gb    int,
  accessories   text[]      default '{}',
  price_min     int         not null,
  price_max     int         not null,
  status        text        not null default 'active', -- active | sold | expired
  troc_ref      text,
  city          text        default 'Yaoundé',
  seller_phone  text
);

alter table marketplace_listings enable row level security;

-- Lecture publique des annonces actives uniquement
create policy "marketplace_public_read"
  on marketplace_listings for select
  using (status = 'active');

-- Tout le monde peut créer une annonce (sans auth)
create policy "marketplace_public_insert"
  on marketplace_listings for insert
  with check (true);

-- Index pour les requêtes les plus fréquentes
create index if not exists marketplace_listings_status_idx
  on marketplace_listings (status, created_at desc);

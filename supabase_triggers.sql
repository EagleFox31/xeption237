
-- ==============================================================================
-- SCRIPT DE SECURITÉ & PERMISSIONS (RLS) - XEPTION NETWORK
-- ==============================================================================
-- Ce script nettoie les anciennes règles et applique les nouvelles permissions
-- pour permettre au Staff de gérer la boutique et aux clients de commander.
-- ==============================================================================

-- 1. ACTIVER LA SÉCURITÉ SUR TOUTES LES TABLES CRITIQUES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_in_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. NETTOYAGE (SUPPRESSION DES ANCIENNES RÈGLES POUR ÉVITER L'ERREUR 42710)
-- ==============================================================================

-- Products
DROP POLICY IF EXISTS "Public View Products" ON public.products;
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Staff Manage Products" ON public.products;
DROP POLICY IF EXISTS "Staff Full Access Products" ON public.products;

-- Categories
DROP POLICY IF EXISTS "Public View Categories" ON public.categories;
DROP POLICY IF EXISTS "Staff Manage Categories" ON public.categories;
DROP POLICY IF EXISTS "Staff Full Access Categories" ON public.categories;

-- Orders
DROP POLICY IF EXISTS "Public Create Orders" ON public.orders;
DROP POLICY IF EXISTS "Public View Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Staff Manage Orders" ON public.orders;
DROP POLICY IF EXISTS "Staff Full Access Orders" ON public.orders;

-- Customers
DROP POLICY IF EXISTS "Staff Manage Customers" ON public.customers;
DROP POLICY IF EXISTS "Staff Full Access Customers" ON public.customers;

-- Staff
DROP POLICY IF EXISTS "Staff Manage Staff" ON public.staff;
DROP POLICY IF EXISTS "Staff Self Edit" ON public.staff;

-- Argus (Trade In)
DROP POLICY IF EXISTS "Public View Argus" ON public.trade_in_models;
DROP POLICY IF EXISTS "Staff Manage Argus" ON public.trade_in_models;

-- SAV (Repair Tickets)
DROP POLICY IF EXISTS "Public Create Ticket" ON public.repair_tickets;
DROP POLICY IF EXISTS "Staff Manage Tickets" ON public.repair_tickets;


-- ==============================================================================
-- 3. CRÉATION DES NOUVELLES RÈGLES (PERMISSIVES POUR LE STAFF)
-- ==============================================================================

-- --- PRODUITS ---
-- Tout le monde peut voir les produits
CREATE POLICY "Public View Products" ON public.products 
FOR SELECT TO anon, authenticated USING (true);

-- Seul le staff connecté peut modifier/ajouter/supprimer
CREATE POLICY "Staff Full Access Products" ON public.products 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- --- CATÉGORIES ---
-- Tout le monde peut voir les catégories
CREATE POLICY "Public View Categories" ON public.categories 
FOR SELECT TO anon, authenticated USING (true);

-- Le staff gère les catégories
CREATE POLICY "Staff Full Access Categories" ON public.categories 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- --- COMMANDES (ORDERS) ---
-- Tout le monde peut créer une commande (Checkout)
CREATE POLICY "Public Create Orders" ON public.orders 
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Lecture publique limitée (Optionnel: pour le tracking si besoin, sinon restreindre)
CREATE POLICY "Public View Own Orders" ON public.orders 
FOR SELECT TO anon, authenticated USING (true); 

-- Le staff voit et modifie toutes les commandes
CREATE POLICY "Staff Full Access Orders" ON public.orders 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- --- CLIENTS & STAFF ---
CREATE POLICY "Staff Full Access Customers" ON public.customers 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Staff Self Edit" ON public.staff 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- --- ARGUS (TRADE IN) ---
-- Public: Lecture seule pour le simulateur
CREATE POLICY "Public View Argus" ON public.trade_in_models 
FOR SELECT TO anon, authenticated USING (true);

-- Staff: Contrôle total
CREATE POLICY "Staff Manage Argus" ON public.trade_in_models 
FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- --- SAV (TICKETS) ---
-- Public: Peut créer un ticket
CREATE POLICY "Public Create Ticket" ON public.repair_tickets 
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Staff: Gère les tickets
CREATE POLICY "Staff Manage Tickets" ON public.repair_tickets 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

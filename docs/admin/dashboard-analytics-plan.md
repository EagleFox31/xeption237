# Plan d'Implémentation : Super Dashboard Analytique

Ce document détaille la stratégie technique pour implémenter l'analytique stratégique (Visiteurs, Trocs, Commandes) dans le tableau de bord ERP de Xeption, avec un accès restreint aux profils `direction` et `super_admin`.

## 1. Suivi des Visiteurs (Méthode Supabase "Lightweight")
Pour éviter d'utiliser des outils tiers comme Google Analytics et garder vos données 100% privées sans surcharger la base de données, nous allons créer un compteur journalier.

### A. Base de données (Supabase SQL)
```sql
-- Création de la table pour les visites journalières
CREATE TABLE site_analytics (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    visits INT DEFAULT 1
);

-- Fonction RPC pour incrémenter sans faire 2 requêtes (Upsert atomique)
CREATE OR REPLACE FUNCTION increment_daily_visit()
RETURNS void AS $$
BEGIN
    INSERT INTO site_analytics (date, visits)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date)
    DO UPDATE SET visits = site_analytics.visits + 1;
END;
$$ LANGUAGE plpgsql;
```

### B. Tracking Front-End (`App.tsx`)
Ajout d'un simple `useEffect` qui appelle `supabase.rpc('increment_daily_visit')` au chargement de l'application (en limitant cela via le `sessionStorage` pour éviter de compter chaque rafraîchissement d'un même utilisateur comme une nouvelle visite).

---

## 2. Accès aux données "Troc" et "Analytics"
Dans `AdminPanel.tsx` (ou le hook `useAdminData`), nous ajouterons le téléchargement des données analytiques **uniquement si le rôle est `direction` ou `super_admin`**.

- **Données Troc** : Requête sur la table `trade_in_requests` (déjà gérée par `useTrocManager`). On comptera le nombre total de demandes via la méthode `.select('*', { count: 'exact', head: true })`.
- **Données Visites** : Requête sur la table `site_analytics` (somme des visites).

---

## 3. Mise à jour de `DashboardTab.tsx`

Le Dashboard actuel affiche 4 KPI (Revenu, Attente, Équipe, Clients) pour tous les employés (vendeurs inclus). Nous allons créer une **Vue Conditionnelle** pour la Direction :

```tsx
// Structure logique :
{isDirection && (
   <section className="mb-8">
      <h3 className="text-xl font-tech font-bold text-xeption-gold mb-4">Analytics Stratégiques</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Visiteurs (Mois)" value={monthlyVisits} icon={Globe} />
          <StatCard label="Demandes de Troc" value={trocCount} icon={RefreshCw} />
          <StatCard label="Total Commandes" value={totalOrders} icon={ShoppingBag} />
      </div>
   </section>
)}
```

---

## 4. Questions Restantes pour Validation
1. Validez-vous la création de cette table `site_analytics` (très légère) dans Supabase pour gérer vos visiteurs de manière autonome ?
2. Voulez-vous que ce "Super Dashboard" soit visible uniquement par la `direction` ou acceptez-vous que les `responsables` puissent voir les visiteurs et l'usage du Troc ?

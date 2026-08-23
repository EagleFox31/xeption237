# XEPTION • CADRAGE FONCTIONNEL ET FINANCIAL DEVIS
## Module de Suivi des Ventes & Performance Commerciale

> **Référence** : `XEP-SALES-2026-0820`  
> **Client** : XEPTION (Digital / Sales Operations)  
> **Consultante Informatique** : Jennifer Lawrynn Aka'a  
> **Date de cadrage & devis** : 20 août 2026  
> **Validité du devis** : 7 jours  
> **Statut** : Cadrage V1 & Devis validé / Signé  

---

## 1. Contexte & Problématique Métier

Aujourd'hui, le suivi de l'activité commerciale et des ventes chez XEPTION repose sur des remontées manuelle et une consolidation sur tableurs Excel. Le responsable commercial doit relancer les vendeurs, collecter les informations en fin de journée et les ressaisir manuellement pour produire les récapitulatifs de gestion.

### Problème à résoudre
- **Perte de temps à la direction** : La personne qui pilote les ventes consacre un temps important à la collecte et à la recopie des données.
- **Risque d'erreurs et de retards** : Les informations manquent de réactivité et ne sont pas disponibles en temps réel.
- **Absence de centralisation** : Risque d'incohérence entre les points de vente et les commerciaux.

---

## 2. Objectifs du Projet

L'objectif est de déployer une application web responsive dédiée permettant :
1. **La saisie directe à la source** : Offrir aux vendeurs/commerciaux une interface fluide sur smartphone ou ordinateur pour enregistrer chaque vente au fil de la journée.
2. **Le pilotage automatique** : Fournir à la direction une vue consolidée, instantanée et sans aucune ressaisie.
3. **La suppression de la corvée du soir** : Générer automatiquement les rapports journaliers et les statistiques de ventes dès la fermeture.
4. **La création d'un historique exploitable** : Constituer une base de données fiable pour l'analyse des tendances, des performances individuelles et des stocks.

---

## 3. Matrice des Utilisateurs & Rôles

| Rôle | Périmètre d'action & Fonctionnalités clés |
| :--- | :--- |
| **Vendeur / Commercial** | • Connexion sécurisée sur mobile ou desktop.<br>• Enregistrement rapide d'une vente (mono ou multi-articles).<br>• Consultation de son propre historique et de son total du jour.<br>• Visualisation de ses objectifs et de son taux d'atteinte.<br>• Saisie en mode hors connexion avec resynchronisation. |
| **Responsable / Direction** | • Consultation en temps réel du chiffre d'affaires et des ventes globales.<br>• Filtrage multi-critères (par vendeur, point de vente, produit, période).<br>• Suivi du panier moyen, top produits et classement des vendeurs.<br>• Export instantané des données sous format Excel.<br>• Validation des retours, annulations et ajustements de stock. |
| **Administrateur** | • Gestion des comptes utilisateurs, rôles et affectations aux points de vente.<br>• Gestion du catalogue produits, catégories, marques et prix indicatifs.<br>• Paramétrage des règles de primes et objectifs commerciaux.<br>• Audit et traçabilité de toutes les opérations. |

---

## 4. Parcours Fonctionnel Cible (Vendeur)

Le parcours est optimisé pour être exécuté en moins de 30 secondes depuis un smartphone :

1. **Connexion & Sélection du Point de Vente** (automatique selon profil ou choix au démarrage).
2. **Action « Nouvelle Vente »** :
   - Sélection du/des produit(s) et quantité(s).
   - Application d'une remise éventuelle et choix du moyen de paiement (Cash, Mobile Money, Carte, Troc).
3. **Validation automatique** :
   - Enregistrement instantané avec horodatage et attribution au vendeur connecté.
   - Alimentation immédiate du tableau de bord de la direction.
4. **Rapport du Soir** : Produit 100% automatiquement sans saisie complémentaire.

---

## 5. Périmètre Fonctionnel Validé (Version 1)

### 5.1 Socle & Référentiel Commercial
- **Authentification & Rôles** : Authentification sécurisée avec isolation des données selon le rôle.
- **Points de vente & Catalogue** : Référentiel des boutiques, produits, catégories/marques et prix.

### 5.2 Saisie & Enregistrement des Ventes
- **Ventes Multi-articles** : Prise en charge de plusieurs lignes d'articles par transaction.
- **Prix, Remises & Règlements** : Saisie des réductions accordées et enregistrement des modes de paiement.
- **Historique & Traçabilité** : Consultation des ventes passées ; annulation/correction encadrée (sans suppression sèche des enregistrements).

### 5.3 Pilotage Commercial & Dashboard Direction
- **Indicateurs Clés (KPIs)** : Chiffre d'affaires total, nombre de transactions, volume d'articles vendus, panier moyen.
- **Analyses & Classements** : Performance par point de vente, classement des vendeurs, top produits (par CA et par volume).
- **Filtres Avancés** : Filtrage par jour, semaine, mois, période personnalisée, vendeur ou boutique.
- **Exportation** : Export des données et récapitulatifs au format Excel.

### 5.4 Modules Avancés & Options Incluses
- **Objectifs Commercial & Primes** : Suivi des quotas journaliers/mensuels et calcul du taux d'atteinte.
- **Stock Complet & Traçabilité** : Gestion des entrées, sorties, ventes, transferts inter-boutiques, retours et inventaires.
- **Retours & Remboursements** : Suivi des réclamations clients et répercussion sur le stock/CA.
- **PWA & Offline First** : Saisie possible sans connexion réseau avec synchronisation automatique au rétablissement de la connexion.
- **Notifications Web/PWA** : Alertes sur stock faible ou atteinte des objectifs.

---

## 6. Hors Périmètre de la Version 1

Afin de garantir une livraison rapide et ciblée, les éléments suivants sont exclus de la V1 :
- CRM complet et fiches clients détaillées.
- Module de comptabilité / facturation légale complète.
- Gestion des achats fournisseurs et bons de commande.
- Paie et calcul RH complexe des commissions.
- Intégrations SMS / WhatsApp via passerelles tierces payantes.
- Application native iOS/Android (l'application V1 étant une **PWA Web Responsive** haute performance).

---

## 7. Proposition Financière & Décomposition du Devis

### 7.1 Grille Tarifaire Détallée

| Module / Prestation | Charge Estimée | Montant (FCFA) | Remarques / Périmètre couvert |
| :--- | :---: | :---: | :--- |
| **Socle Ventes, Auth & Référentiel** | 1,0 jour | 40 000 | Utilisateurs, rôles, points de vente, catalogue produits & saisie des ventes |
| **Dashboard, KPIs & Export Excel** | 0,5 - 1,0 jour | 20 000 | Tableau de bord direction, graphiques, filtres et export XLS |
| **Objectifs, Primes & Règles Métier** | 0,5 jour | 10 000 | Suivi des performances individuelles et seuils de bonus |
| **Stock Complet & Retours/Remboursements** | 1,0 jour | 25 000 | Traçabilité des mouvements, transferts, retours et ajustements |
| **Notifications & Mode Hors-Connexion** | 0,5 - 1,0 jour | 15 000 | Application PWA, cache offline, synchronisation & alertes |
| **Tests, Recette & Déploiement** | Inclus | 10 000 | Recette fonctionnelle, paramétrage initial et mise en production |
| **TOTAL FORFAIT GLOBAL (VERSION COMPLÈTE)** | **3,5 - 5,0 jours** | **120 000 FCFA** | **Périmètre complet validé** |

> 💡 **Option Alternative (Budget Serré)** : **80 000 FCFA**  
> *Inclut le socle ventes, le dashboard, les objectifs et un stock simplifié. Le stock complet, la PWA avancée hors-connexion et les notifications sophistiquées sont reportés en V2.*

---

## 8. Modalités d'Exécution & Conditions Financières

- **Délais de réalisation** : **3 à 5 jours ouvrés** à compter de la validation et de la fourniture des données de base (produits, boutiques, vendeurs).
- **Modalités de règlement** :
  - **50% à la commande / démarrage** : `60 000 FCFA`
  - **50% à la livraison / mise en production** : `60 000 FCFA`
- **Garantie post-livraison** : Support & correction de bugs inclus pendant 7 jours calendaires après la livraison.
- **Frais annexes** : Les hébergements, noms de domaine ou API tierces restent à la charge directe du client XEPTION.

---

## 9. Critères de Succès & Recette

La prestation sera considérée comme validée après constatation des éléments suivants :
1. ✅ Saisie d'une vente sur smartphone réalisée par un vendeur en moins de 30 secondes.
2. ✅ Mise à jour automatique et instantanée du dashboard de la direction.
3. ✅ Calcul automatique du CA, du panier moyen et des top ventes sans intervention manuelle.
4. ✅ Export réussi des données sous Excel.
5. ✅ Fonctionnement stable du mode hors-connexion sur le terrain.

---

## 10. Validations et Signatures

Document rédigé par **Jennifer Lawrynn Aka'a** (Consultante Informatique) et validé pour exécution par la Direction **XEPTION**.

| Pour XEPTION (Direction / Sales Ops) | Pour la Consultante Informatique |
| :--- | :--- |
| **Nom** : Direction XEPTION | **Nom** : Jennifer Lawrynn Aka'a |
| **Date** : 20 août 2026 | **Date** : 20 août 2026 |
| **Signature** : *Bon pour accord* | **Signature** : *JLA* |

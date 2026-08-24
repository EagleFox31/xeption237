import type { LucideIcon } from 'lucide-react';

import {

  ClipboardCheck,

  LayoutDashboard,

  CreditCard,

  ShoppingBag,

  Package,

  Gift,

  Truck,

  Building2,

  Layers,

  ImagePlus,

  ArrowLeftRight,

  Wrench,

  Users,

  Key,

  Receipt,

  Target,

} from 'lucide-react';



export const ADMIN_TAB_IDS = [

  'dashboard',

  'pos',

  'mySales',

  'targets',

  'orders',

  'inventory',

  'packs',

  'delivery',

  'stores',

  'stockMovements',

  'catalogStructure',

  'productImages',

  'troc',

  'sav',

  'clients',

  'staff',

  'qaRecette',

] as const;



export type AdminTabId = typeof ADMIN_TAB_IDS[number];



export type AdminMenuItem = {

  id: AdminTabId;

  label: string;

  shortLabel: string;

  description?: string;

  icon: LucideIcon;

};



export type AdminMenuGroup = {

  id: string;

  label: string;

  items: AdminMenuItem[];

};



export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [

  {

    id: 'overview',

    label: 'Vue d\'ensemble',

    items: [

      {

        id: 'dashboard',

        label: 'Tableau de bord',

        shortLabel: 'Accueil',

        description: 'Vue synthétique ventes, stock et équipe.',

        icon: LayoutDashboard,

      },

    ],

  },

  {

    id: 'sales',

    label: 'Ventes',

    items: [

      {

        id: 'pos',

        label: 'Vente en boutique',

        shortLabel: 'Boutique',

        description: 'Encaisser une vente sur place : panier, client et validation.',

        icon: CreditCard,

      },

      {

        id: 'mySales',

        label: 'Mes ventes',

        shortLabel: 'Mes ventes',

        description: 'Tes ventes du jour : nombre, montant et détail ligne à ligne.',

        icon: Receipt,

      },

      {

        id: 'targets',

        label: 'Objectifs & primes',

        shortLabel: 'Objectifs',

        description: 'Quotas vendeurs et boutiques, seuils de prime et taux d\'atteinte.',

        icon: Target,

      },

      {

        id: 'orders',

        label: 'Commandes & Factures',

        shortLabel: 'Cmds',

        description: 'Suivi des commandes et facturation après validation.',

        icon: ShoppingBag,

      },

    ],

  },

  {

    id: 'catalog',

    label: 'Catalogue',

    items: [

      {

        id: 'inventory',

        label: 'Inventaire',

        shortLabel: 'Stock',

        description: 'Produits, prix, stock et pépites.',

        icon: Package,

      },

      {

        id: 'packs',

        label: 'Packs Promo',

        shortLabel: 'Packs',

        description: 'Offres groupées et promotions.',

        icon: Gift,

      },

      {

        id: 'catalogStructure',

        label: 'Structure catalogue',

        shortLabel: 'Structure',

        description: 'Types → marques → gammes sur une seule vue hiérarchique.',

        icon: Layers,

      },

      {

        id: 'productImages',

        label: 'Import photos',

        shortLabel: 'Photos',

        description: 'Upload multi-fichiers et photo principale par produit.',

        icon: ImagePlus,

      },

    ],

  },

  {

    id: 'operations',

    label: 'Opérations',

    items: [

      {

        id: 'delivery',

        label: 'Zones & Livraison',

        shortLabel: 'Livr.',

        description: 'Tarifs et délais par zone.',

        icon: Truck,

      },

      {

        id: 'stores',

        label: 'Boutiques',

        shortLabel: 'Shops',

        description: 'Points de vente, stock par boutique et rattachement équipe.',

        icon: Building2,

      },

      {

        id: 'stockMovements',

        label: 'Mouvements stock',

        shortLabel: 'Stock+',

        description: 'Transferts inter-boutiques, inventaire, retours SAV et journal.',

        icon: ArrowLeftRight,

      },

      {

        id: 'troc',

        label: 'Dossiers Troc',

        shortLabel: 'Troc',

        description: 'Reprises Smart Troc et paiements.',

        icon: ArrowLeftRight,

      },

      {

        id: 'sav',

        label: 'Atelier SAV',

        shortLabel: 'SAV',

        description: 'Réparations, garanties et suivi des dossiers atelier.',

        icon: Wrench,

      },

    ],

  },

  {

    id: 'people',

    label: 'Clients & Équipe',

    items: [

      {

        id: 'clients',

        label: 'Clients',

        shortLabel: 'Clients',

        description: 'Fiches clients et historique.',

        icon: Users,

      },

      {

        id: 'qaRecette',

        label: 'Recette',

        shortLabel: 'Recette',

        description: 'Tests fonctionnels à valider avant mise en ligne.',

        icon: ClipboardCheck,

      },

      {

        id: 'staff',

        label: 'Équipe',

        shortLabel: 'Staff',

        description: 'Membres de l’équipe et profils d’accès.',

        icon: Key,

      },

    ],

  },

];



/** Accès rapide mobile — commandes web prioritaires. */

export const MOBILE_QUICK_TABS: AdminTabId[] = ['pos', 'mySales', 'orders', 'inventory', 'troc'];



export const findMenuGroupForTab = (tabId: string): AdminMenuGroup | undefined =>

  ADMIN_MENU_GROUPS.find((g) => g.items.some((item) => item.id === tabId));



export const findMenuItem = (tabId: string): AdminMenuItem | undefined => {

  for (const group of ADMIN_MENU_GROUPS) {

    const item = group.items.find((i) => i.id === tabId);

    if (item) return item;

  }

  return undefined;

};



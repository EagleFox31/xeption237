import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileInput,
  Layers,
  ImagePlus,
  Terminal,
  Store,
  Sparkles,
} from 'lucide-react';

export const STUDIO_TAB_IDS = [
  'dashboard',
  'import',
  'catalog',
  'images',
  'system',
] as const;

export type StudioTabId = typeof STUDIO_TAB_IDS[number];

export type StudioMenuItem = {
  id: StudioTabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description?: string;
};

export type StudioMenuGroup = {
  id: string;
  label: string;
  items: StudioMenuItem[];
};

export const STUDIO_MENU_GROUPS: StudioMenuGroup[] = [
  {
    id: 'overview',
    label: 'Vue créateur',
    items: [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        shortLabel: 'Dash',
        icon: LayoutDashboard,
        description: 'Santé du catalogue et indicateurs',
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalogue & données',
    items: [
      {
        id: 'import',
        label: 'Import produits',
        shortLabel: 'Import',
        icon: FileInput,
        description: 'Funnel multi-produits + DeepSeek',
      },
      {
        id: 'catalog',
        label: 'Structure catalogue',
        shortLabel: 'Structure',
        icon: Layers,
      },
      {
        id: 'images',
        label: 'Import photos',
        shortLabel: 'Photos',
        icon: ImagePlus,
      },
    ],
  },
  {
    id: 'platform',
    label: 'Plateforme',
    items: [
      {
        id: 'system',
        label: 'Système & clés',
        shortLabel: 'Système',
        icon: Terminal,
      },
    ],
  },
];

export const STUDIO_EXTERNAL_LINKS = [
  {
    id: 'erp',
    label: 'Ouvrir l’ERP',
    shortLabel: 'ERP',
    icon: Store,
    href: '/admin',
  },
] as const;

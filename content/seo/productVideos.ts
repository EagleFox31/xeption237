import { CATEGORY_SLUGS } from '../../constants/dbSchema';
import type { ProductVideoDef } from './types';

/** Vidéos TikTok de présentation d'un modèle, rattachées aux fiches produit par filtre. */
export const PRODUCT_VIDEOS: ProductVideoDef[] = [
  {
    appliesTo: { categories: [CATEGORY_SLUGS.ORDINATEURS], nameIncludes: ['Latitude 5510'] },
    video: {
      tiktokId: '7630813759753325845',
      label: 'Vidéo : présentation du Dell Latitude 5510',
      title: 'Présentation du Dell Latitude 5510',
    },
  },
];

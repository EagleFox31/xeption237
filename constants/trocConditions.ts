/**
 * Valeurs acceptées pour les conditions d'état de l'appareil.
 *
 * SOURCE DE VÉRITÉ côté front-end.
 * L'edge function Supabase a sa propre source dans supabase/functions/_shared/conditions.ts.
 *
 * Si tu ajoutes ou modifies une valeur ici, mets à jour _shared/conditions.ts
 * en même temps — sinon le front envoie des valeurs que le back rejette avec un 400.
 */

export const SCREEN_CONDITIONS = ['parfait', 'micro_rayures', 'rayures', 'fissuré'] as const;
export const BODY_CONDITIONS   = ['parfait', 'micro_rayures', 'rayures', 'bosses']  as const;
export const CAMERA_CONDITIONS = ['bon', 'rayures', 'défectueuse']                  as const;
export const REPAIR_OPTIONS    = ['aucune', 'écran', 'batterie', 'autre']           as const;

export type ScreenCondition  = typeof SCREEN_CONDITIONS[number];
export type BodyCondition    = typeof BODY_CONDITIONS[number];
export type CameraCondition  = typeof CAMERA_CONDITIONS[number];
export type PreviousRepairs  = typeof REPAIR_OPTIONS[number];

export const CONDITION_LABELS: Record<string, string> = {
  // Écran / boîtier
  parfait:       'Parfait état',
  micro_rayures: 'Micro-rayures',
  rayures:       'Rayures visibles',
  fissuré:       'Écran fissuré',
  bosses:        'Bosses / chocs',
  // Caméra
  bon:           'Fonctionnelle',
  défectueuse:   'Défectueuse',
  // Réparations
  aucune:        'Aucune réparation',
  écran:         'Écran remplacé',
  batterie:      'Batterie remplacée',
  autre:         'Autre réparation',
};

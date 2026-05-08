/**
 * Valeurs acceptées pour les conditions d'état de l'appareil.
 *
 * SOURCE DE VÉRITÉ pour les edge functions Supabase.
 * Le front-end a sa propre source dans constants/trocConditions.ts.
 *
 * Si tu ajoutes ou modifies une valeur ici, mets à jour constants/trocConditions.ts
 * en même temps — sinon le front envoie des valeurs que le back rejette avec un 400.
 */

export const SCREEN_CONDITIONS  = ['parfait', 'micro_rayures', 'rayures', 'fissuré'] as const;
export const BODY_CONDITIONS    = ['parfait', 'micro_rayures', 'rayures', 'bosses']  as const;
export const CAMERA_CONDITIONS  = ['bon', 'rayures', 'défectueuse']                  as const;
export const REPAIR_OPTIONS     = ['aucune', 'écran', 'batterie', 'autre']           as const;

export type ScreenCondition = typeof SCREEN_CONDITIONS[number];
export type BodyCondition   = typeof BODY_CONDITIONS[number];
export type CameraCondition = typeof CAMERA_CONDITIONS[number];
export type PreviousRepairs = typeof REPAIR_OPTIONS[number];

/**
 * Mode test de la caisse — préfixe `TEST-` sur les commandes d'essai.
 *
 * POURQUOI : les recettes se font directement en production, faute
 * d'environnement séparé. Sans marquage, les commandes d'essai se mélangent aux
 * vraies et faussent le pilotage — c'est ce qui avait porté le CA affiché à
 * 5 921 900 F pour 0 vente réelle (cf. migrations 20260824_001 et _002).
 *
 * Le système ne peut PAS deviner l'intention : un vendeur qui teste et un
 * vendeur qui vend font les mêmes gestes. On ne cherche donc pas à automatiser
 * la détection, mais à rendre l'oubli inoffensif :
 *   1. un interrupteur explicite, collant sur la session, avec bandeau visible ;
 *   2. le préfixe appliqué automatiquement tant qu'il est allumé ;
 *   3. exclusion `TEST-%` via la vue `orders_reportable` (migration 20260824_026) :
 *      une commande d'essai oubliée n'entre jamais dans le CA ni les primes.
 *
 * Stockage en `sessionStorage` volontairement : le mode s'éteint à la fermeture
 * de l'onglet. Un `localStorage` survivrait des jours et une vraie vente
 * finirait marquée `TEST-` — donc absente du chiffre d'affaires.
 */

const STORAGE_KEY = 'xeption.pos.testMode';
export const TEST_ORDER_PREFIX = 'TEST-';

/** Un identifiant de commande correspond-il à une commande d'essai ? */
export const isTestOrderId = (orderId: string | null | undefined): boolean =>
  typeof orderId === 'string' && orderId.startsWith(TEST_ORDER_PREFIX);

export const isTestModeEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Navigation privée ou stockage refusé : on considère le mode éteint.
    return false;
  }
};

export const setTestModeEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.sessionStorage.setItem(STORAGE_KEY, '1');
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* stockage indisponible : le mode reste éteint, comportement sûr */
  }
};

/**
 * Préfixe un identifiant de commande si le mode test est actif.
 * Idempotent : un identifiant déjà préfixé n'est pas préfixé deux fois.
 */
export const applyTestOrderPrefix = (orderId: string): string => {
  if (!isTestModeEnabled() || isTestOrderId(orderId)) return orderId;
  return `${TEST_ORDER_PREFIX}${orderId}`;
};

import type { AdminTabId } from '../components/admin/layout/adminMenuConfig';

/**
 * Modules ERP livrables separement.
 *
 * Le site public et l'ERP sont une seule application : deployer l'un deploie
 * l'autre. Tant qu'un module n'est pas paye, ses onglets ne doivent pas
 * apparaitre — sans pour autant maintenir une branche parallele, qui divergerait
 * a chaque correction partagee.
 *
 * ⚠️ CE QUE CE MECANISME FAIT, ET CE QU'IL NE FAIT PAS.
 * Il RETIRE les onglets du menu, de la barre mobile et du routeur d'onglets.
 * Il ne verrouille RIEN cote serveur : les tables et les RPC restent joignables
 * pour qui possede un compte staff et sait construire une requete. C'est un
 * rideau commercial, pas un coffre-fort. Si le blocage doit resister a une
 * tentative deliberee, il faut une garde dans les RPC concernees — travail
 * distinct, a decider.
 */
export type ErpModuleId = 'multiboutiques';

export const ERP_MODULES: Record<ErpModuleId, { label: string; tabs: AdminTabId[] }> = {
  /**
   * Extension multi-boutiques : referentiel des boutiques, stock par boutique et
   * transferts, objectifs et primes par vendeur ou par boutique.
   *
   * `pos`, `orders`, `inventory`, `clients`, `mySales` n'en font PAS partie :
   * ils fonctionnent deja en mono-boutique et relevent de l'ERP de base.
   */
  multiboutiques: {
    label: 'Multi-boutiques (stock par boutique, transferts, objectifs & primes)',
    tabs: ['stores', 'stockMovements', 'targets'],
  },
};

/**
 * Modules desactives, lus depuis `VITE_ERP_MODULES_OFF` (liste separee par des
 * virgules). Absent ou vide = tout est actif, ce qui preserve le comportement
 * historique : un deploiement qui oublie la variable n'ampute rien.
 *
 * Acces par PROPRIETE et non `import.meta.env` en entier : lire l'objet complet
 * empeche le tree-shaking et recopie toutes les variables VITE_ dans le bundle.
 */
const modulesDesactives = (): Set<string> => {
  const brut = import.meta.env.VITE_ERP_MODULES_OFF;
  if (typeof brut !== 'string' || !brut.trim()) return new Set();
  return new Set(
    brut
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean),
  );
};

export const isErpModuleEnabled = (id: ErpModuleId): boolean => !modulesDesactives().has(id);

/** Onglets masques parce que leur module n'est pas actif. */
export const hiddenTabsFromModules = (): Set<AdminTabId> => {
  const off = modulesDesactives();
  const caches = new Set<AdminTabId>();
  for (const [id, mod] of Object.entries(ERP_MODULES)) {
    if (off.has(id)) mod.tabs.forEach((t) => caches.add(t));
  }
  return caches;
};

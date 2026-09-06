/**
 * Verifie que le rideau commercial « module non paye » ferme reellement la porte.
 *
 * Le drapeau se lit dans `import.meta.env.VITE_ERP_MODULES_OFF`, remplace ici
 * par esbuild `--define`. Deux passes, une par valeur :
 *
 *   npx esbuild scripts/qa-check-modules-erp.ts --bundle --platform=node \
 *     --format=esm --define:import.meta.env.VITE_ERP_MODULES_OFF='""' \
 *     --outfile=t.mjs && node t.mjs
 *
 *   ... --define:import.meta.env.VITE_ERP_MODULES_OFF='"multiboutiques"' ...
 *
 * Le script attend la valeur courante en argument pour savoir quoi verifier.
 */
import { canAccessAdminTab, filterAdminMenuGroups, getMobileQuickTabsForRole } from '../utils/adminAccess';
import { ERP_MODULES } from '../constants/erpModules';

const attenduCache = process.argv[2] === 'off';
const tabsModule = ERP_MODULES.multiboutiques.tabs;
const horsModule = ['dashboard', 'pos', 'mySales', 'orders', 'inventory', 'clients'] as const;

let echecs = 0;
const dit = (ok: boolean, texte: string) => {
  if (!ok) echecs += 1;
  console.log((ok ? 'OK    ' : 'ECHEC ') + texte);
};

console.log(
  '== module multiboutiques ' + (attenduCache ? 'DESACTIVE' : 'actif') + ' ==',
);

for (const tab of tabsModule) {
  const vu = canAccessAdminTab('super_admin', tab as never);
  dit(
    vu === !attenduCache,
    `« ${tab} » ${attenduCache ? 'masque' : 'visible'} pour un super_admin`,
  );
}

// Un module coupe ne doit pas emporter l'ERP de base avec lui.
for (const tab of horsModule) {
  dit(canAccessAdminTab('vendeur', tab as never), `« ${tab} » reste accessible au vendeur`);
}

// Le menu lateral et la barre mobile passent par la meme porte : ils doivent suivre.
const menu = filterAdminMenuGroups('super_admin').flatMap((g) => g.items.map((i) => i.id));
for (const tab of tabsModule) {
  dit(
    menu.includes(tab) === !attenduCache,
    `menu lateral : « ${tab} » ${attenduCache ? 'absent' : 'present'}`,
  );
}
const mobile = getMobileQuickTabsForRole('super_admin');
dit(
  mobile.every((t) => !attenduCache || !tabsModule.includes(t)),
  'barre mobile : aucun onglet du module coupe',
);

console.log(echecs ? '\n' + echecs + ' echec(s)' : '\nTous les controles passent.');
process.exit(echecs ? 1 : 0);

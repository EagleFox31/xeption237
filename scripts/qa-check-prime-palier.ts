/**
 * Verifie la regle de prime : PALIERS EXCLUSIFS, seul le plus haut est verse.
 *
 * Arbitrage direction du 2026-09-06 : pas de cumul. A 130 %, on verse 30 000 et
 * non 45 000. La regle vit dans `awardedBonus` (utils/salesTargets.ts) ; ce
 * fichier est ce qui empechera qu'elle derive sans qu'on s'en apercoive.
 *
 *   npx esbuild scripts/qa-check-prime-palier.ts --bundle --platform=node  *     --format=esm --outfile=tmp.mjs && node tmp.mjs && rm tmp.mjs
 *
 * Sortie non nulle au premier cas faux.
 */

import { awardedBonus, type StaffBonusStatus } from '../utils/salesTargets';

const r = (pct: number, montant: number, earned: boolean, label = pct + '%'): StaffBonusStatus => ({
  rule_id: label + '/' + montant,
  label,
  min_achievement_percent: pct,
  bonus_amount: montant,
  earned,
});

const cas: Array<[string, StaffBonusStatus[], number | null]> = [
  [
    'a 130 % : 100 et 120 franchis, 150 non -> on verse 30 000',
    [r(100, 15000, true), r(120, 30000, true), r(150, 60000, false)],
    30000,
  ],
  [
    'a 48 % : aucun palier -> aucune prime',
    [r(100, 15000, false), r(120, 30000, false), r(150, 60000, false)],
    null,
  ],
  [
    'a 100 % pile : seul le premier -> 15 000',
    [r(100, 15000, true), r(120, 30000, false), r(150, 60000, false)],
    15000,
  ],
  [
    'a 160 % : les trois franchis -> 60 000, pas 105 000',
    [r(100, 15000, true), r(120, 30000, true), r(150, 60000, true)],
    60000,
  ],
  [
    'ordre inverse en base : le resultat ne doit pas en dependre',
    [r(150, 60000, true), r(100, 15000, true), r(120, 30000, true)],
    60000,
  ],
  [
    'deux regles au meme seuil : le montant le plus eleve tranche',
    [r(120, 30000, true), r(120, 45000, true)],
    45000,
  ],
  ['liste vide', [], null],
];

let echecs = 0;
for (const [nom, regles, veut] of cas) {
  const got = awardedBonus(regles)?.bonus_amount ?? null;
  const ok = got === veut;
  if (!ok) echecs += 1;
  console.log(
    (ok ? 'OK    ' : 'ECHEC ') +
      nom.padEnd(62) +
      ' attendu ' +
      String(veut) +
      ', obtenu ' +
      String(got),
  );
}
console.log(echecs ? '\n' + echecs + ' echec(s)' : '\nTous les cas passent.');
process.exit(echecs ? 1 : 0);

# Passation — retrait du magasin test « siege »

## 2026-11-11 15:28 — siege fusionné dans MF1092, MF1092 devient le magasin par défaut

**Fait (prod)**
- Migration `20261111_005_merge_siege_into_mf1092.sql` appliquée via `db:apply` : tout le stock de `siege`
  transféré sur MF1092 (216 mouvements `transfer_out` / `transfer_in`, ref `migration`), réservations actives,
  inventaires ouverts et brouillons de caisse déplacés. `siege` renommé « Ancien siège (archivé) », inactif,
  plus `is_default`. MF1092 = `is_default`.
- Fonctions SQL `telegram_staff_product_draft_upsert` et `_telegram_staff_actor` : repli sur
  `_default_store_id()` au lieu du code `siege` en dur.
- Bot `telegram-bot-entry` redéployé : liste des magasins filtrée sur `active`, magasin par défaut = `is_default`.
- `scripts/verify-erp-step2.mjs` : le contrôle de stock compare désormais `products.stock` à
  Σ(quantity − reserved) tous magasins, comme le trigger. Les 4 « incohérences » précédentes étaient des unités réservées.

**Conservé** : les 9 commandes et 475 mouvements historiques restent rattachés à l'ancien siège (FK RESTRICT, historique).

**Vérifié** : `db:status` (005 APPLIED), `db:verify` (0 écart), `verify-erp-step2` (tout vert),
`vitest tests/telegram-sale-mode.test.ts` 8/8, 0 écart products.stock vs store_stock.

**Reste à faire**
- Redistribution bot (`screenProductSplit`, presets « Rapatrier au Siège ») et fonctions SQL
  `telegram_staff_redistribute_product`, `_bulk`, `_preview` : codent encore `siege` / MFOUNDI / OLEMBE en dur,
  ignorent MF1092 et peuvent remettre du stock sur le magasin archivé. À réécrire sur les 3 points officiels.
- Collision de préfixe préexistante : deux fichiers `20261111_003` différents selon les branches.

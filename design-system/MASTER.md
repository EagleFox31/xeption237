# Xeption Admin ERP — Design System (MASTER)

> Généré manuellement à partir de ui-ux-pro-max + tokens `components/admin/shared/adminUi.ts`

## Pattern

**Data-Dense Dashboard** — ERP staff : beaucoup d’infos, navigation groupée, actions rapides.

## Style

- **Mode** : dark premium boutique
- **Accent** : or Xeption (`xeption-gold`) — CTA, nav active, focus
- **Surfaces** : fond **transparent** — le `SiteBackground` du site reste visible ; panneaux verre `bg-black/25` + blur
- **Effets** : glow radial discret, grille 32px à 3% opacité, backdrop-blur léger

## Typographie

- **Titres** : `font-tech`, uppercase, tracking serré
- **Labels** : 10px, bold, uppercase, `tracking-[0.18em]`, blanc 70%
- **Corps** : 14px, blanc 85% — jamais `gray-500` sur fond sombre

## Composants clés

| Token | Usage |
|-------|--------|
| `AdminPageHeader` | Titre unique par onglet (plus de h2 dupliqués dans les tabs) |
| `adminUi.surface` | Tables, panneaux, cards |
| `adminUi.hintCard` | Aide compacte bordure légère (commandes, import photos) — fond ~25 %, pas de bloc opaque |
| `adminUi.btnPrimary` / `btnGhost` | Actions principales / secondaires |
| `adminUi.tableHead` / `tableBody` | Listes staff, CRM, livraison |

## UX staff (français)

- Statuts commande via `ORDER_STATUS_LABELS`, pas les slugs DB
- Menu groupé via `adminMenuConfig.ts`
- Commandes + factures = un seul onglet
- Facture PDF après validation (`confirmed`+)

## Anti-patterns

- Titres dupliqués (header + tab)
- Texte d’aide gris illisible sur photo/fond flou
- Purple accent / jargon UI (« colonne Actions »)
- Onglets plats pour la structure catalogue (hiérarchie colonnes)

## Stack

React + Tailwind CSS — tokens centralisés dans `adminUi.ts`.

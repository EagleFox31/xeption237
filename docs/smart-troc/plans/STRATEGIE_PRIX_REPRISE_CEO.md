# Stratégie de prix de reprise — vue CEO

> Objectif : un prix de reprise qui **protège la marge**, **fait venir** le client et le **fait revenir**.
> Sur papier d'abord (chaque test = 150 FCFA). Date : 2026-06-15.

---

## 0. La formule actuelle (ce qui tourne déjà)

```
Reprise_crédit = prix_marché × 0,70 × (score_état / 100) × coeff_désirabilité
Reprise_cash   = Reprise_crédit ÷ 1,10
```

| Composant | Valeur | Rôle |
|---|---|---|
| `prix_marché` | `trade_in_models.base_price` (prix **occasion** revente) | l'ancrage |
| `× 0,70` | marge brute 30% | couvre reconditionnement + risque + profit |
| `score_état/100` | 0-100 pondéré (écran 30%, batterie 20%, châssis 15%, caméra 10%, charge 8%, biométrie 7%, réparations 5%, accessoires 5%) | l'état du **téléphone précis** |
| `désirabilité` | 0,55 → 1,00 par marque/modèle | liquidité de revente (iPhone se revend vite = on paie plus) |
| crédit vs cash | crédit = cash × 1,10 | **moteur de rétention** |

**Verdict CEO : structure saine, on ne la casse pas.** On comble 3 trous.

---

## 1. L'ÂGE — le piège du double comptage ⚠️

**La question : faut-il une décote par année d'âge ?**

**Réponse CEO : NON, pas une 2ᵉ fois.** Ton `base_price` est déjà le **prix d'occasion actuel** (iPhone 15 Pro Max = 850k alors que neuf ≈ 1,2M). **L'âge est donc DÉJÀ dedans.** Ajouter une décote-par-année par-dessus = **pénaliser deux fois** → offres trop basses → le client part chez le concurrent. Mauvais pour l'acquisition.

**La vraie règle d'âge = 3 niveaux :**
1. ✅ **Cutoff 8 ans** (fait) — au-delà, on ne reprend pas (pièces rares, revente nulle).
2. 🔧 **Garder `base_price` à jour** — c'est ça le vrai "réglage d'âge". Un prix figé en 2024 sur-paie en 2026. → revue trimestrielle staff, ou alimentation auto.
3. 💡 **Filet anti-prix-périmé** (option) : décoter à partir de la **date de dernière mise à jour du prix**, PAS de la date de sortie. Si le prix a < 3 mois → 0 décote ; s'il a 1 an → −15% de sécurité jusqu'à rafraîchissement. Protège la marge sans double-pénaliser l'époque. *(nécessite une colonne `last_priced_at`)*

---

## 2. L'ÉTAT — déjà bon, un raffinage "coût réel"

Le score pondéré est solide. **Raffinage CEO : penser en coût de réparation absolu**, pas qu'en %.

- **Écran fissuré** = coût fixe (~30-50k pour un iPhone). Aujourd'hui : `screenScore=0` × poids 30% → grosse coupe (OK en approximation).
- **Batterie < 80%** = coût de remplacement.
- **Nuance** : sur un téléphone cher, on déduit le coût et on reprend. Sur un téléphone bon marché, écran fissuré = **pièces** (pas rentable à réparer). Le grade `pieces` existe déjà → bien.

**Reco** : garder le % pour l'instant (défendable). Évoluer vers des **déductions fixes** (coût réparation) pour écran/batterie quand on aura les coûts réels par modèle.

---

## 3. LA REMISE — le levier de croissance sous-exploité 🚀

C'est ici que le CEO gagne des clients. Le moteur calcule un **prix d'achat juste** ; ton job = le transformer en **acquisition + rétention**.

### a) Crédit boutique = ta machine à rétention (pousser plus fort)
Le crédit (+10% vs cash) est dépensé **chez toi** → tu récupères les 10% sur la marge du téléphone neuf vendu. **Double gain** : il revient ET il achète.
- **Messaging** : *"105 000 en cash, ou 115 000 en bon d'achat utilisable aujourd'hui."*
- **Option** : monter à **+15% crédit** sur les catégories à forte marge (accessoires, milieu de gamme).

### b) Reprise = acompte instantané (le hook d'acquisition)
Recadrer la reprise comme **"−X sur un neuf MAINTENANT"** :
> *"Échange ton iPhone 11 → −105 000 sur n'importe quel téléphone aujourd'hui."*
Urgence + clarté = conversion au moment chaud.

### c) Transparence = confiance = conversion
(La leçon du projet.) Montrer le raisonnement :
> *"Prix marché occasion : 150 000. État estimé : 85%. Reprise : 105 000."*
Le client recoupe, il fait confiance, il convertit.

### d) Fidélité / repeat (rétention long terme)
- 2ᵉ reprise, ou **reprise + achat le même jour** → **+5% bonus**.
- Crée la boucle : revenir = gagner plus.

### e) Garde-fous CEO (gestion du risque)
- **Plancher digne** : si la reprise calculée est dérisoire, arrondir vers un "minimum respectable" ou router vers pièces — ne jamais **insulter** le client avec 5 000 (il part frustré et le dit autour de lui).
- **Plafond sous réserve** : appareil haut de gamme déclaré "parfait" = gros paiement → **confirmer en boutique** avant de finaliser (anti-fraude photo).
- **Buffer in-store** : l'estimation photo reste "à confirmer au dépôt" (déjà le cas) — garde 5-10% de marge d'ajustement.

---

## 4. Paramètres réglables (le tableau de bord du CEO)

| Levier | Valeur actuelle | Marge de réglage | Impact |
|---|---|---|---|
| Ratio d'achat | 0,70 | 0,65 (prudent) ↔ 0,78 (agressif acquisition) | marge vs attractivité |
| Bonus crédit | +10% | +10% ↔ +15% | rétention |
| Cutoff âge | 8 ans | 7 ↔ 10 | volume vs risque stock |
| Désirabilité | 0,55-1,00 | par tier | risque de revente |
| Bonus fidélité | — (à créer) | +5% reprise+achat | acquisition+rétention |
| Plancher digne | — (à créer) | ex. 15 000 min | image de marque |

---

## 5. À décider (CEO)

1. **Ratio d'achat** : on reste à 0,70, ou on teste 0,72-0,75 pour faire venir plus de monde (en surveillant la marge) ?
2. **Bonus crédit** : on pousse à +15% pour ancrer la rétention ?
3. **Bonus fidélité** "reprise + achat même jour +5%" : on l'ajoute ? (fort levier de conversion)
4. **Plancher digne** : on fixe un minimum (ex. 15 000) en dessous duquel on ne fait pas d'offre insultante ?
5. **Filet anti-prix-périmé** (`last_priced_at` + décote si stale) : on l'implémente, ou on s'engage sur une revue trimestrielle manuelle ?

> Ces 5 décisions sont **business**, pas techniques. Une fois tranchées, l'implémentation est rapide (le moteur existe, on ajuste des constantes + 2-3 règles).

---

## 6. Directive du boss (2026-06-15) : prix trop doux → durcir

Philosophie : *"dès que la marchandise quitte la boutique, son amortissement a commencé."* → ratio d'achat 0,70 jugé trop généreux. Levier = `BASE_VALUE_MULTIPLIER` + écart cash/crédit.

### Simulation — iPhone 12, bon état (résale 280 000, état 80%, désirabilité 0,85)

| Paramètres | Crédit boutique | Cash réel sorti |
|---|---|---|
| **Actuel** (0,70 / cash −10%) | 130 000 | **115 000** |
| **Modéré** (0,65 / cash −15%) | 120 000 | ~100 000 |
| **Dur** (0,60 / cash −18%) | 110 000 | **90 000** |

→ En "dur", la poche du boss sort **90 000 au lieu de 115 000** (−25 000/deal, −22%).

### La reconciliation (ne pas juste tout casser)
- **Cash bas** = protège la poche (ce que veut le boss). ✅
- **Crédit nettement > cash** = le client se sent mieux payé ET revient dépenser → le crédit **rentre en chiffre d'affaires** sur le neuf (marge récupérée). Le vrai décaissement reste faible.
- **Plancher digne** (ex. 15 000 min) = ne pas insulter → en contexte camerounais, la réputation/le bouche-à-oreille vaut cher. Un client humilié coûte plus que 10 000 économisés.

### Réglage proposé (à valider par le boss)
- `BASE_VALUE_MULTIPLIER` : 0,70 → **0,60** (ou 0,62 prudent)
- `CASH_DISCOUNT` : 0,10 → **0,18** (creuse l'écart, pousse le crédit)
- Plancher digne : **15 000** (nouveau)
- Désirabilité : inchangée (déjà sévère sur le bas de gamme)

# Feedback Log — Xeption 237

Pour chaque problème significatif remonté par un client ou observé en usage, documenter les 5 champs ci-dessous. L'objectif est de transformer un correctif ponctuel en savoir réutilisable.

---

## Template

```
### [YYYY-MM] Titre court du problème

**Type :** UX | Performance | Texte | Fiabilité | Processus métier

**Signal (anonymisé) :**
> Citation ou comportement observé — jamais de nom, numéro ou données personnelles.

**Problème identifié :**
Ce qui causait le signal. Être précis sur le composant / l'écran / la logique.

**Correction appliquée :**
Ce qui a changé. Référencer le PR ou le commit si disponible.

**Validation :**
Métrique, test de non-régression, ou observation terrain confirmant la résolution.

**Principe réutilisable :**
La règle générale à retenir pour ne pas répéter ce type d'erreur.
```

---

## Entrées

---

### [2026-08] Tunnel Troc : surcharge cognitive — trop de questions sur un seul écran

**Type :** UX

**Signal (anonymisé) :**
> « Je comprends pas ce qu'on me demande, j'abandonne. »
> Observé : taux d'abandon élevé après l'étape IMEI sur le formulaire TrocForm initial.

**Problème identifié :**
Le formulaire Smart Troc regroupait IMEI, état de l'appareil, contact client et choix du nouveau téléphone sur un seul écran. L'utilisateur ne savait pas quelle action effectuer en premier.

**Correction appliquée :**
Remplacement par un tunnel séquentiel à divulgation progressive (1 écran = 1 décision) :
- Étape 1 : IMEI + identification client
- Étape 2 : photos IA
- Étape 3 : paiement 100 FCFA
- Étape 4 : verdict
- Étape 5 : sélection du nouveau téléphone

Branches : `wip/troc-multi-device-v3-clean`

**Validation :**
Maquettes validées visuellement (cf. `maquettes-mobiles/`). Test terrain à faire après déploiement — indicateur cible : taux de complétion du tunnel > 60 %.

**Principe réutilisable :**
Sur mobile, ne jamais mettre plus d'une décision par écran dans un tunnel transactionnel. Préférer plus d'étapes courtes qu'un formulaire complet.

---

### [2026-08] IMEI : les utilisateurs ne savent pas où le trouver

**Type :** UX / Texte

**Signal (anonymisé) :**
> Plusieurs clients ont abandonné à l'étape IMEI faute de savoir comment l'obtenir.

**Problème identifié :**
Le champ IMEI n'affichait aucune aide contextuelle. Les utilisateurs non avertis ne connaissent pas le raccourci `*#06#` ni la distinction IMEI 1 / IMEI 2.

**Correction appliquée :**
Ajout d'un bouton d'aide inline sous le champ : `Tapez *#06# → prenez IMEI 1`. Libellé court, sans modal ni redirection externe.

**Validation :**
Vérifié en maquette (`06_troc_etape1_imei.jpg`). À confirmer terrain : mesurer le nombre d'abandons sur ce champ avant/après.

**Principe réutilisable :**
Tout champ technique (IMEI, numéro de série, code réseau) doit embarquer son aide de saisie directement, pas dans une FAQ externe.

---

### [2026-09] Verdict Troc : le pourcentage (+18 %) ne parle pas à l'utilisateur

**Type :** UX / Processus métier

**Signal (anonymisé) :**
> Les clients posaient des questions sur la valeur réelle du bonus — le pourcentage ne leur donnait pas de repère concret.

**Problème identifié :**
Afficher un bonus en pourcentage (ex : +18 %) obligeait l'utilisateur à faire le calcul mental. La valeur perçue était floue et ne protégeait pas non plus la marge.

**Correction appliquée :**
Remplacement par un bonus fixe en FCFA (ex : +20 000 F). Le verdict affiche deux montants clairs :
- Échange : `300 000 F` (bonus inclus)
- Cash : `280 000 F`

Le montant fixe est défini par le boss en fonction de la marge cible, sans lien circulaire avec nos propres prix de catalogue.

**Validation :**
Validé en maquette (`13_troc_verdict_bonus_fixe.png`). Principe arbitré avec le boss (2026-09).

**Principe réutilisable :**
Exprimer les offres commerciales en valeur absolue (FCFA), jamais en pourcentage sur l'interface client. Les pourcentages servent au back-office, pas au verdict.

# ADR-002 — Bilan hebdomadaire consolidé : fonction SQL + pg_cron du lundi

- **Statut** : proposé — 2026-11-14 (migration non appliquée, fonctions non redéployées)
- **Contexte** : la direction reçoit un bilan par boutique chaque soir (ADR-001) mais aucune vue de
  la semaine. Un bilan hebdomadaire rédigé à la main à partir des rapports de caisse
  (`store_cash_reports`) a été validé sur le groupe de test : sections en gras, une donnée par
  ligne, aucun emoji, une liste « À noter » à la fin.

## Décision

1. **Une fonction SQL** `notify_weekly_digest(p_day date)` (SECURITY DEFINER, service_role seul)
   calcule la semaine ISO contenant `p_day` (par défaut la veille, heure de Douala) et insère **une**
   notification consolidée `weekly_digest` dans `admin_notifications`, dedup
   `weekly_digest.<IYYY>-W<IW>` : un rejeu ou un double déclenchement ne crée rien.
2. **Source = rapports de caisse**, pas `orders` : ce sont les chiffres que les boutiques déclarent
   et que la direction lit déjà. Dettes : `store_debts` ouvertes si le bot en suit, sinon le
   `debts_snapshot` du dernier rapport (même règle que le bilan journalier), évolution comparée au
   dernier rapport d'avant la semaine. Agrégats seulement : aucun nom, téléphone ni modèle client.
3. **Planification lundi 08 h (Douala)** plutôt que samedi 20 h : les rapports arrivent après 20 h,
   un envoi le samedi soir laisserait le samedi vide ou partiel, et l'alerte « rapport manquant »
   serait fausse. Le lundi matin la semaine est complète.
4. **Distribution par la chaîne existante** (outbox `notification_deliveries` → `notify-staff`),
   aucun appel Telegram ou WAHA direct. La mise en forme est un module pur
   `_shared/weeklyDigest.ts` : le SQL rédige le message, les adaptateurs ne font que traduire le
   balisage `*Titre*` (gras HTML sur Telegram, inchangé en texte brut).
5. **WhatsApp via Trigenys Notify** (révision du 14/11/2026) : le canal WAHA émet
   `report.weekly_digest` avec des faits structurés (`digestPeriod`, `digestSections`), découpés
   par `weeklyDigestFacts()` et bornés par `trimWeeklyDigest()` (lignes de contact écartées, pas de
   lien). Notify valide ces faits sur liste blanche et rend le même format (titres en gras, zéro
   emoji). Le type est restreint au groupe de test par `WAHA_EVENT_GROUPS_JSON` côté Notify :
   ouvrir le groupe Administration = modifier ce réglage, sans code.

## Conséquences

- Nouveau comportement par défaut (règle de livraison 5) : `weekly_digest` est dans
  `DEFAULT_STAFF_EVENT_TYPES`. Si `TELEGRAM_EVENT_TYPES` est surchargé en prod, y ajouter
  `weekly_digest`, sinon le bilan reste dans l'app seulement.
- WhatsApp : déployer d'abord le Worker Trigenys Notify (branche `feat/xeption-weekly-digest`),
  vérifier que le groupe de test est routé vers xeption, puis seulement redéployer `notify-staff`
  (sinon Notify refuse le type et l'outbox réessaie). Si `WAHA_EVENT_TYPES` est surchargé, y
  ajouter `weekly_digest`.
- Ordre de déploiement : appliquer `20261114_001` (`npm run db:apply`), puis redéployer
  `notify-staff`. Le job ne tourne que le lundi suivant ; un envoi immédiat se fait par
  `SELECT public.notify_weekly_digest();`.
- Les écarts de 1 F venant du parseur des rapports d'Olembé apparaîtront dans « À noter » tant que
  le parseur n'est pas corrigé : c'est voulu, le bilan ne masque pas une incohérence.
- Retour arrière : `cron.unschedule('weekly-digest-monday')` ; la fonction peut rester.

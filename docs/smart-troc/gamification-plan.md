# Gamification du Smart Troc — Parcours "L'Heure de l'Heure" (Xeption)

Ce document de conception détaille l'intégralité de la refonte UX/UI du parcours Smart Troc. L'objectif est de transformer un simple formulaire de reprise en une expérience interactive, immersive et engageante ("gamifiée") sans être un jeu vidéo enfantin.

## 1. Philosophie & Tone of Voice
- **Argot 237 Premium** : On utilise le vocabulaire local de la rue ("Ndamba", "Le way", "Ndem", "Njoh", "L'heure de l'heure", "Les dos") mais enrobé dans un design extrêmement luxueux (Black & Gold, Glassmorphism).
- **Direct & Brut** : On ne perd pas le temps du client. Phrases courtes, impact marketing direct.
- **Remplacement de termes** : On bannit le vocabulaire de bureau comme "Argus" pour des termes plus accessibles ("Base de données mondiale").
- **Animations SVG** : L'interaction est visuelle. Les animations doivent être légères, en CSS/SVG pur, parfaites pour le mobile.

---

## 2. Le Dictionnaire Exact des Textes (Copywriting Deck)

Voici les textes exacts qui seront implémentés dans l'UI, mot pour mot :

### Étape 1 : Le Choix de l'Appareil
* **Titre principal :** *"Tu veux troquer quoi ?"*
* **Texte (si on clique sur Tablette/PC) :** *"On ne gère pas le ndem. Téléphone uniquement pour l’instant. Les autres appareils sont en salle d’attente."*

### Étape 2 : Le Formulaire & L'IMEI
* **Titre :** *"Ton appareil."*
* **Sous-titre :** *"3 infos et on gère le reste."*
* **Si IMEI Clean & Trouvé (`valid_match`) :** *"IMEI propre. [Nom du Modèle] détecté. Identité confirmée, on avance."*
* **Si IMEI Clean mais Inconnu (`valid_unrecognized`) :** *"IMEI propre, mais modèle inconnu dans notre base. Précise le modèle ci-dessous."*
* **Si IMEI Volé/Bloqué (`blacklisted`) :** *"Gars, cet IMEI a un dossier (bloqué/signalé). Passe en boutique, on ne gère pas ça en ligne."*
* **Si Panne réseau (`api_failed`) :** *"Réseau saturé. Entre ton modèle, le technicien confirmera sur place."*
* **Si l'appareil ne s'allume pas :** *"L'appareil ne s'allume pas. Évaluation en ligne impossible. Passe directement en boutique."*
* **Bouton Suivant :** *"Passer aux photos →"*

### Étape 3 : L'Étape des Photos
* **Phrase d'introduction :** *"Cadre le way proprement. Notre IA a un œil de panthère : montre tout, même les égratignures."*
* **Erreur (Photo floue) :** *"Photo floue. L'IA déteste ça. Recommence."*
* **Erreur (Trop sombre) :** *"Trop sombre. Allume la lumière pour une vraie estimation."*
* **Erreur (Hors cadre) :** *"Appareil coupé. Cadre bien tout l'écran au centre."*
* **Succès :** *"C'est l'eau. Scan parfait, la machine a ce qu'il faut."*

### Étape 4 : Le Paiement
* **Texte officiel (inchangé) :** *"Frais d'estimation 100 FCFA."*
* **Le petit texte marketing en dessous :** *"Pas de njoh. 100 FCFA pour débloquer l'IA et voir tes dos."*

### Étape 5 : Le Loader IA (Les 4 phrases qui défilent)
1. *"L'IA scanne les micro-rayures..."*
2. *"Check de la base de données mondiale en temps réel..."*
3. *"Calcul de tes dos (Cote Xeption)..."*
4. *"Le verdict tombe."*

### Étape 6 : Le Résultat Final (L'Offre)
* **Au-dessus du prix géant :** *"C'est l'heure de l'heure. Ton appareil pèse ça chez nous :"*
* **Au-dessous du prix (La jauge chronométrée) :** *"Ne dors pas sur ça. Valide ce deal au Mfoundi Mall avant demain 19h = Bonus de +10 000 FCFA."*

---

## 3. Plan Technique & Animations (Implémentation)

### Étape 1 : Le Filtre IMEI (Puce & Radar)
* **Animation SVG :** Une icône de puce électronique avec une onde concentrique (radar) qui balaie la puce pendant l'appel API.
* **Au succès :** Le radar se transforme en un gros "✓" doré.
* **À l'erreur (Blacklist) :** L'écran flashe en rouge avec une icône de cadenas fermé "🔒".

### Étape 2 : Le Sniper Photos (Viseur HUD)
* **Animation SVG :** Un viseur (type HUD futuriste avec 4 angles droits) superposé sur l'interface d'upload.
* **Au succès :** Le viseur flashe en or étincelant (effet de capture).
* **À l'erreur (Flou/Sombre) :** Les angles vibrent en rouge/orange, ou le fond s'assombrit avec une icône "Ampoule".

### Étape 3 : Le Ticket d'Entrée (Pulse Paiement)
* **Animation SVG :** Le bouton de paiement palpite (glow doré `animate-pulse`) pour transformer l'acte d'achat en déclencheur excitant.

### Étape 4 : Le Cerveau IA (Neon Ring Loader)
* **Animation SVG :** Un anneau de chargement high-tech avec un effet de lueur (`stroke-dasharray`) qui se remplit progressivement pendant que les 4 phrases narratives défilent.

### Étape 5 : Le Deal (Explosion Gold & Jauge d'Urgence)
* **Animation SVG :** Une animation minimaliste de particules/lignes dorées qui explosent doucement au-dessus du prix pour célébrer la fin du processus.
* **Jauge Temporelle :** Une barre rouge/or qui représente le temps restant pour le bonus de rapidité, créant un sentiment d'urgence (FOMO).

---

## 4. Prochaines Étapes
1. Création d'un dossier `components/troc/animations/` pour encapsuler les composants SVG.
2. Mise à jour des wordings dans `TrocQuickForm.tsx` (IMEI & Modèle).
3. Intégration du HUD Photos dans l'interface d'upload.
4. Intégration du Neon Ring Loader et de la Jauge d'Urgence dans `EvaluationResult.tsx`.

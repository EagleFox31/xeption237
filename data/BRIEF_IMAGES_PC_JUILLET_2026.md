# Brief Gemini — images catalogue PC (juillet 2026)

## Livraison attendue

- **4 images cohérentes par fiche produit**, soit **104 images** pour 26 machines.
- Format final : **WebP**, ratio **4:5**, idéalement **1600 × 2000 px**.
- Pour chaque modèle, le nom indiqué ci-dessous est celui de l’image principale. Générer aussi les trois variantes en ajoutant `-front`, `-ports` et `-detail` avant `.webp`.
- Exemple pour `lenovo-300e-128-4.webp` :
  - `lenovo-300e-128-4.webp` — vue principale trois-quarts ;
  - `lenovo-300e-128-4-front.webp` — vue strictement de face ;
  - `lenovo-300e-128-4-ports.webp` — profil montrant les ports réels ;
  - `lenovo-300e-128-4-detail.webp` — capot fermé vu de trois-quarts, ou mode spécial indiqué pour un convertible.
- Livrer les fichiers sans compression excessive, dans un seul dossier.
- Copier ce dossier dans **`xeption237/data/pc-images-july-2026/`** en conservant exactement les noms demandés.
- Ne pas ajouter de texte, prix, fiche technique, watermark ou logo Xeption dans l’image.
- Après génération, vérifier que le nombre de ports, la charnière, le clavier et le format de l’écran correspondent au modèle demandé.

Une fois les 104 fichiers copiés, lancer d’abord le contrôle sans écriture :

```powershell
npm run ingest:pc-catalog
```

Si le contrôle annonce `Préflight OK`, lancer l’upload Cloudinary et l’import Supabase :

```powershell
npm run ingest:pc-catalog -- --apply
```

## Direction visuelle commune

Utiliser exactement le même appareil, la même couleur, le même clavier et le même fond sur les quatre images d’une fiche. À préfixer à chacun des prompts :

> Photographie produit e-commerce ultra-réaliste d’un ordinateur portable professionnel authentique, appareil seul, vue trois-quarts avant à hauteur de table, entièrement visible et centré, écran allumé avec un fond abstrait noir et doré très discret sans texte, lumière studio douce avec reflets maîtrisés, fond gris très clair uniforme, ombre naturelle légère sous l’appareil, rendu premium mais réaliste, proportions et châssis fidèles au modèle exact, clavier et ports physiquement plausibles, aucun accessoire, aucune main, aucune personne, aucun décor, aucun texte ajouté, aucun prix, aucun watermark, aucun faux logo, cadrage vertical 4:5 avec 12 % d’espace libre autour du produit.

### Les quatre prises de vue à générer

1. **Image principale (`.webp`)** : vue trois-quarts avant, appareil ouvert à environ 110°, écran allumé.
2. **Image face (`-front.webp`)** : vue strictement frontale et symétrique, appareil ouvert, écran et clavier entièrement visibles.
3. **Image ports (`-ports.webp`)** : profil trois-quarts latéral montrant clairement un côté et ses ports réels. Ne jamais inventer un port absent du modèle.
4. **Image détail (`-detail.webp`)** :
   - portable standard : appareil fermé, vue trois-quarts arrière montrant le capot et les charnières ;
   - Lenovo 300e, Dell Latitude 5310 2-en-1, HP EliteBook x360 830 G6 et HP ProBook x360 11 G2 EE : mode tente crédible ;
   - Microsoft Surface Pro 3 et HP Elite x2 1012 G1 : tablette détachée devant son clavier officiel, béquille visible.

## Règles importantes pour Gemini

1. **Ne pas moderniser le châssis** : un modèle de 2015 doit conserver ses bordures et son design de 2015.
2. Afficher uniquement le **logo constructeur réellement présent sur le capot ou sous l’écran** ; ne pas inventer de sous-marque.
3. Pour les modèles tactiles 360°, réserver le mode tente à l’image `-detail.webp` ; les trois autres vues restent en mode portable ouvert.
4. Pour les détachables, montrer le clavier officiel fixé à la tablette.
5. Les écrans doivent rester sobres : fond abstrait sans texte, icône ou interface identifiable.
6. Si Gemini ne connaît pas exactement le modèle, lui fournir en référence une photo officielle du modèle avant de relancer.

---

## Prompts individuels

### 01 — Lenovo 300e

**Fichier :** `lenovo-300e-128-4.webp`

> [DIRECTION VISUELLE COMMUNE] Lenovo 300e Education 2-en-1, châssis noir renforcé compact de 11,6 pouces, bordures d’écran épaisses, clavier QWERTY noir, charnières 360° visibles, présenté en mode portable ouvert à 110°, design scolaire robuste fidèle au Lenovo 300e, aucun stylet.

### 02 — Dell Latitude 5310 2-in-1

**Fichier :** `dell-latitude-5310-2in1-i5-16-512.webp`

> [DIRECTION VISUELLE COMMUNE] Dell Latitude 5310 2-in-1 professionnel, écran tactile 13,3 pouces, châssis gris anthracite compact, clavier QWERTY rétroéclairé, deux charnières 360° réalistes, présenté en mode portable ouvert à 110° ; réserver le mode tente à l’image `-detail`.

### 03 — Dell Latitude 3190

**Fichier :** `dell-latitude-3190-4-128.webp`

> [DIRECTION VISUELLE COMMUNE] Dell Latitude 3190 Education, petit ordinateur 11,6 pouces noir robuste avec coins renforcés, bordures épaisses, clavier QWERTY, version portable standard ouverte à 110°, châssis scolaire fidèle, ne pas le transformer en ultrabook moderne.

### 04 — HP ProBook 445 G8

**Fichier :** `hp-probook-445-g8-ryzen3-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP ProBook 445 G8 14 pouces, châssis professionnel argent mat à lignes droites, clavier QWERTY noir, pavé tactile large, bordures fines réalistes de cette génération, ouvert à 110°, aucun pavé numérique.

### 05 — Dell Latitude 5510

**Fichier :** `dell-latitude-5510-i5-16-512.webp`

> [DIRECTION VISUELLE COMMUNE] Dell Latitude 5510 professionnel 15,6 pouces, châssis gris foncé, clavier QWERTY complet avec pavé numérique, écran antireflet, silhouette business de 2020, ouvert à 110°.

### 06 — Microsoft Surface Pro 3

**Fichier :** `microsoft-surface-pro-3-i5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] Microsoft Surface Pro 3 12 pouces, tablette argentée fine avec béquille arrière intégrée déployée, clavier Type Cover noir fixé, format détachable fidèle à la génération 2014, vue trois-quarts montrant légèrement la béquille, stylet absent.

### 07 — Dell Latitude 5530

**Fichier :** `dell-latitude-5530-i7-16-512.webp`

> [DIRECTION VISUELLE COMMUNE] Dell Latitude 5530 professionnel 15,6 pouces, châssis gris anthracite, clavier QWERTY complet avec pavé numérique, écran antireflet, design Latitude génération 2022, ouvert à 110°, ne pas afficher d’étiquette de processeur.

### 08 — Lenovo ThinkPad 13

**Fichier :** `lenovo-thinkpad-13-i5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] Lenovo ThinkPad 13 deuxième génération, châssis noir mat compact 13,3 pouces, clavier QWERTY ThinkPad avec TrackPoint rouge central, trois boutons physiques au-dessus du pavé tactile, bordures réalistes de 2017, ouvert à 110°.

### 09 — Lenovo ThinkPad E495

**Fichier :** `lenovo-thinkpad-e495-ryzen3-16-256.webp`

> [DIRECTION VISUELLE COMMUNE] Lenovo ThinkPad E495 14 pouces, châssis noir mat, clavier QWERTY avec TrackPoint rouge et boutons physiques, logo ThinkPad discret, écran antireflet, ouvert à 110°, aucun badge de carte graphique dédiée.

### 10 — Dell Latitude 5580

**Fichier :** `dell-latitude-5580-i5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] Dell Latitude 5580 professionnel 15,6 pouces, châssis noir mat épais de 2017, clavier QWERTY complet avec pavé numérique, TrackPoint bleu et boutons physiques si présents sur la configuration, écran antireflet, ouvert à 110°.

### 11 — Lenovo ThinkPad A485

**Fichier :** `lenovo-thinkpad-a485-ryzen5pro-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] Lenovo ThinkPad A485 14 pouces, châssis noir mat classique, clavier QWERTY ThinkPad avec TrackPoint rouge et trois boutons physiques, écran antireflet, silhouette professionnelle 2018, ouvert à 110°.

### 12 — HP EliteBook 840 G5

**Fichier :** `hp-elitebook-840-g5-i5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 840 G5 14 pouces, châssis aluminium argent, clavier QWERTY noir rétroéclairé, grille de haut-parleurs Bang & Olufsen au-dessus du clavier, petit TrackPoint et boutons physiques, ouvert à 110°.

### 13 — HP EliteBook x360 830 G6

**Fichier :** `hp-elitebook-x360-830-g6-i5-16-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook x360 830 G6 tactile 13,3 pouces, châssis aluminium argent premium, clavier QWERTY noir rétroéclairé, charnières 360°, présenté en mode portable ouvert à 110° ; réserver le mode tente à l’image `-detail`, bordures et design fidèles à 2019.

### 14 — HP mt43 Mobile Thin Client

**Fichier :** `hp-mt43-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP mt43 Mobile Thin Client 14 pouces, châssis argent et noir basé sur la génération EliteBook 745 G4, clavier QWERTY noir, bordures d’écran professionnelles de 2017, ouvert à 110°, ne pas écrire « Thin Client » dans l’image.

### 15 — HP EliteBook 820 G3

**Fichier :** `hp-elitebook-820-g3-i5-8-500.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 820 G3 12,5 pouces, châssis professionnel argent et noir compact de 2016, clavier QWERTY noir rétroéclairé, TrackPoint avec boutons physiques, bordures réalistes de l’époque, ouvert à 110°.

### 16 — HP EliteBook 850 G6 Core i5

**Fichier :** `hp-elitebook-850-g6-i5-16-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 850 G6 15,6 pouces non tactile, châssis aluminium argent, clavier QWERTY noir rétroéclairé avec pavé numérique, grille audio au-dessus du clavier, écran mat, ouvert à 110°.

### 17 — HP EliteBook 850 G6 Core i7 tactile

**Fichier :** `hp-elitebook-850-g6-i7-touch-16-512.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 850 G6 15,6 pouces tactile, châssis aluminium argent, clavier QWERTY noir rétroéclairé avec pavé numérique, écran brillant tactile légèrement réfléchissant, ouvert à 110°, vue légèrement plus frontale que la variante i5.

### 18 — HP EliteBook 745 G6

**Fichier :** `hp-elitebook-745-g6-ryzen3pro-16-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 745 G6 14 pouces, châssis aluminium argent professionnel, clavier QWERTY noir rétroéclairé sans pavé numérique, écran antireflet, design business 2019, ouvert à 110°.

### 19 — HP EliteBook 840 G2

**Fichier :** `hp-elitebook-840-g2-i5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 840 G2 14 pouces, châssis argent et noir épais de 2015, clavier QWERTY noir rétroéclairé, TrackPoint avec boutons physiques, bordures d’écran réalistes de cette génération, ouvert à 110°.

### 20 — HP EliteBook 745 G2

**Fichier :** `hp-elitebook-745-g2-amd-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP EliteBook 745 G2 14 pouces AMD, châssis argent et noir professionnel de 2014, clavier QWERTY noir, TrackPoint avec boutons physiques, bordures épaisses fidèles à l’époque, ouvert à 110°.

### 21 — HP Elite x2 1012 G1

**Fichier :** `hp-elite-x2-1012-g1-m5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP Elite x2 1012 G1 détachable 12 pouces, tablette aluminium argent avec béquille arrière déployée, clavier fin HP noir AZERTY fixé, vue trois-quarts montrant le mécanisme détachable, design professionnel 2016, stylet absent.

### 22 — HP ProBook x360 11 G2 EE

**Fichier :** `hp-probook-x360-11-g2-ee-4-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP ProBook x360 11 G2 EE Education 11,6 pouces, châssis noir robuste avec accents industriels, écran tactile, charnières 360°, présenté en mode portable ouvert à 110° ; réserver le mode tente à l’image `-detail`, design scolaire fidèle à 2018.

### 23 — HP ProBook 430 G3

**Fichier :** `hp-probook-430-g3-i3-8-500.webp`

> [DIRECTION VISUELLE COMMUNE] HP ProBook 430 G3 13,3 pouces, châssis professionnel argent et noir de 2016, clavier QWERTY noir, bordures d’écran réalistes, ouvert à 110°, aucun pavé numérique.

### 24 — HP ProBook 445 G6

**Fichier :** `hp-probook-445-g6-ryzen5-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP ProBook 445 G6 14 pouces, châssis argent mat professionnel, clavier QWERTY noir, écran antireflet, design AMD business 2019, ouvert à 110°, aucun pavé numérique.

### 25 — HP ProBook 440 G8

**Fichier :** `hp-probook-440-g8-i5-16-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP ProBook 440 G8 14 pouces, châssis argent moderne, clavier QWERTY noir, bordures fines, écran antireflet, ouvert à 110°, ne pas afficher de logo NVIDIA ou d’étiquette de processeur.

### 26 — HP Laptop 14s

**Fichier :** `hp-laptop-14s-i7-8-256.webp`

> [DIRECTION VISUELLE COMMUNE] HP Laptop 14s génération Intel Core i7 11e génération, ordinateur grand public 14 pouces argent naturel, clavier QWERTY argent ou noir selon châssis cohérent, bordures fines, écran antireflet, ouvert à 110°, design HP 14s de 2021.

---

## Contrôle avant envoi à Xeption

Pour chacune des quatre images :

- [ ] Le modèle et le format (11,6 / 12 / 13 / 14 / 15,6 pouces) sont visuellement cohérents.
- [ ] Les convertibles ont une charnière crédible ; les modèles standards ne sont pas pliés.
- [ ] Le clavier n’a pas de touches illisibles, fusionnées ou surnuméraires.
- [ ] Aucun faux port, double écran, câble ou accessoire n’a été ajouté.
- [ ] Aucun texte, prix ou watermark généré n’apparaît.
- [ ] Le produit est entièrement visible, net et centré.
- [ ] Le fichier est bien en WebP 1600 × 2000 px.
- [ ] Les quatre images montrent exactement le même châssis, la même couleur et le même clavier.
- [ ] Les suffixes `.webp`, `-front.webp`, `-ports.webp` et `-detail.webp` sont corrects.

Quand les 104 images sont prêtes, les fournir avec ces noms exacts. Les URL finales seront ensuite ajoutées aux galeries avant l’import en base.

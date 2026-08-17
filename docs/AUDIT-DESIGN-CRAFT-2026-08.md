# LostCards — Audit design : du conforme au distinctif

> Complémentaire de `AUDIT-DESIGN-2026-07.md` (qui a posé la direction « Fiche » et son P0 de tokens).
> Celui-ci répond à : les tokens sont corrects, pourquoi le produit se lit-il encore comme générique ?
> Réalisé le 08/2026 par l'agent designer, WebSearch utilisé, sources citées.

---

## Volet 1 — État de la migration des tokens (mécanique, prérequis au Volet 2)

**477 occurrences** de classes Tailwind par défaut (`bg-/text-/border-{gray,orange,blue,green,red,purple,yellow,indigo,pink}-*`) sur **24 fichiers**. Non migrés à 100% : `Alerts.jsx`, `Chat.jsx`, `Home.jsx`, `PostCreate.jsx`, `Profile.jsx`, `Messages.jsx`, `admin/Dashboard.jsx` (99 occurrences, le pire).

**Découverte non signalée jusqu'ici** : `frontend/src/components/LogoIcon.jsx:15,18` — le logo a `fill="#F97316"` et `fill="#10B981"` **codés en dur dans le SVG**, hors du système Tailwind. Le logo — l'élément le plus visible de l'app (Navbar, Login, Register) — n'est migré ni vers l'ancien ni vers le nouvel orange. Deux oranges différents coexistent visiblement sur un même écran.

`index.css:119-276` : les ~150 lignes de surcharges `.dark` continuent de grossir pour accommoder du code non migré au lieu de diminuer.

---

## Volet 2 — Sortir du « généré », écran par écran

### Ce que dit la recherche 2026 (au-delà de « pas d'indigo-500 »)

- **[kompozy.io — The AI design aesthetic](https://kompozy.io/guides/the-ai-design-aesthetic)** : les outils génératifs convergent vers « glossy, saturated, **symmetrical**, smooth » ; le contre-mouvement 2026 revendique « asymmetry that is **structural rather than accidental** ». Critère le plus actionnable : une mise en page symétrique n'est pas neutre, c'est le signal par défaut.
- **[Tejj/Medium — AI's Visual Echo](https://medium.com/design-bootcamp/ais-visual-echo-why-generated-design-looks-the-same-and-what-we-should-do-about-it-7d1242f863f3)** (05/2026) : « flawless is no longer impressive » — un layout sans friction volontaire se lit comme généré, même avec de bonnes couleurs.
- **[alexlavaee.me — Why My AI-Generated UI Looked Generic](https://alexlavaee.me/blog/lessons-learned-designing-with-ai/)** : l'IA échoue systématiquement sur « tone, personality, and small stylistic choices » — spécifiquement les **empty states, messages d'erreur, chargement**. Vérifié ici : les empty states existent (`Home.jsx:154-163`) mais leur copy est générique.

**Conclusion** : les tokens sont corrects, mais la composition reste celle d'un template — grilles symétriques partout, cartes toutes au même poids, icônes colorées de façon décorative, et **le seul device de signature prévu (`FICHE-XXXX`) n'est implémenté nulle part**.

### Constat transversal n°1 — symétrie et poids visuel uniforme, partout

- `Home.jsx:120-132` — grille « Comment ça marche » : 3 cartes identiques, alors que l'étape 3 (vérification selfie) EST la fonctionnalité de confiance du produit.
- `Dashboard.jsx:114-146,223-254` — l'audit de juillet demandait explicitement « une action primaire par écran, liste verticale » (item P1 n°12). **Toujours pas fait** : grille 2×2 à parité stricte, 6 teintes Tailwind différentes non liées entre elles sur les icônes de QuickAction — exactement le problème des « 8 badges pastel » dénoncé pour les documents, simplement déplacé sans que personne ne le remarque.

### Constat transversal n°2 — le device de signature n'existe pas

Grep `FICHE|fiche-ref` sur tout `frontend/src` : **zéro occurrence**. La classe `text-ref` existe dans `tailwind.config.js:51` mais n'est utilisée nulle part. **IBM Plex Mono n'est même pas installée** (`package.json` ne référence que Public Sans) — le device de signature n'a pas sa police chargée. C'est la lacune la plus significative : sans elle, aucun ajustement de composition ne rendra le produit reconnaissable en une capture d'écran.

### Constat transversal n°3 — l'écran de vérification selfie est resté pré-audit

`SelfieCapture.jsx` (127 lignes) : **aucune** recommandation de confiance de l'audit initial n'est implémentée.
- L.91 : preview toujours en avatar circulaire bordé orange — le « code réseau social » que l'audit demandait de remplacer.
- L.77,81 : les 2 `backdrop-blur-sm` sur le flux vidéo sont **toujours là** — identifiés comme « pire cas possible » (glassmorphism sur la caméra, plein soleil), item P1 n°8 non traité.
- L.82,102,112,122 : emojis 🤳📸🔄 toujours présents.
- Aucun compteur d'étapes, aucune ligne de rétention, pas de face-à-face selfie/photo.

---

## Recommandations écran par écran (extrait — voir détail complet en session)

- **Home** : hero à casser (aligné gauche au lieu de centré), grille « Comment ça marche » avec poids croissant vers l'étape 3 (`bg-flame-50` + icône `flame-500` sur la 3ᵉ seulement).
- **PostCard** : ajouter la référence `FICHE 4A7C-2B19` (mono, `text-ref`, déjà défini jamais utilisé) sous le nom — correction à plus fort effet du rapport. Bordure gauche `flame-500` sur les annonces < 24h (signal fonctionnel, pas décoratif).
- **PostDetail** : panneau admin en `bg-red-50` traite une lecture fonctionnelle comme une alerte — signal sémantique faux, à corriger en `bg-ink-100` + label mono « ADMIN · LECTURE SEULE ».
- **SelfieCapture — refonte de fond** : supprimer les 2 blurs (remplacer par fond opaque `night-950/70`), retirer les emojis, remplacer l'avatar par 2 vignettes côte à côte (selfie + photo du document) séparées par un `=` mono, ajouter compteur d'étapes et ligne de rétention.
- **Login/Register** : le sélecteur de rôle a un potentiel « dossier administratif » non exploité — actuellement deux boutons symétriques neutres.
- **Dashboard** : appliquer enfin la règle actée en juillet (une action primaire), réduire 6 teintes d'icônes à 1-2.
- **Navbar** : indicateur de tab actif 2px `flame-700` — signature légère, coût nul.

## Plan priorisé

**Craft rapide** : migrer `LogoIcon.jsx` + `Navbar.jsx` en premier (prérequis visuel) → casser la symétrie Home → réduire les teintes Dashboard + une action primaire → retirer emojis/blurs de SelfieCapture → indicateur de tab → bordure gauche PostCard fraîcheur.

**Refonte de fond** : (1) référence de fiche `FICHE-XXXX` + IBM Plex Mono — la lacune la plus significative ; (2) écran de vérification selfie, spécification complète livrée ; (3) écrans d'auth ; (4) passe de copy générale (Login, empty states) menée avec la migration visuelle, pas en exercice cosmétique séparé.

---

Sources additionnelles : [kompozy.io](https://kompozy.io/guides/the-ai-design-aesthetic) · [Tejj/Medium](https://medium.com/design-bootcamp/ais-visual-echo-why-generated-design-looks-the-same-and-what-we-should-do-about-it-7d1242f863f3) · [alexlavaee.me](https://alexlavaee.me/blog/lessons-learned-designing-with-ai/) · [uxpilot.ai — 2026 trends](https://uxpilot.ai/blogs/product-design-trends)

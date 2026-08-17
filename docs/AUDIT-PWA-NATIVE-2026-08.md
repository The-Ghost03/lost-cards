# LostCards — Audit "sensation native" de la PWA

> Analyse en lecture seule, 08/2026, agent frontend. WebSearch indisponible dans la session :
> les patterns cités s'appuient sur Apple HIG, Material Design 3, web.dev, spec CSS —
> signalé explicitement plutôt qu'une source inventée.

## Résumé

L'app est une PWA **techniquement sérieuse** (service worker multi-stratégies, offline réel,
optimistic UI sur le chat) mais se sent web pour 3 raisons dominantes :

1. **Aucune transition de navigation** — chaque changement de route est un cut brutal
   (`App.jsx`), alors que les modales ont des transitions soignées.
2. **Le retour physique Android n'est jamais intercepté** — fermer une lightbox/modale avec
   le bouton retour quitte la page. Zéro occurrence de `popstate` dans tout le code.
3. **Zéro geste tactile** — pas de swipe entre photos, pas de pull-to-refresh applicatif,
   tout au tap.

Le design system est cohérent sur le papier mais **n'a pas fini sa migration à l'endroit le
plus sensible** : `manifest.json` pointe encore sur l'ancienne palette (`#f97316`, `#0f172a`)
alors qu'`index.html` a déjà les bons tokens — désynchronisation visible à chaque lancement
de l'app installée (splash screen, barre système).

## Constats détaillés

### Navigation et transitions
- `App.jsx:50-71` : `Routes` dans un simple `Suspense`, aucune transition accrochée au routeur.
  Une classe `.page-enter` existe (`index.css:240-242`) mais n'est utilisée que ponctuellement,
  jamais comme système.
- `Navbar.jsx:79` : bon point — l'onglet actif change de couleur avant le rendu de la page
  (calculé sur `location.pathname`), pas de décalage visible.
- **Bouton retour Android absent partout** : `ConfirmDialog.jsx`, `SharePostModal.jsx`,
  lightbox de `PostDetail.jsx:464-484` ne se ferment que par tap, jamais par `popstate`.

### Gestes tactiles
- Aucun `touchstart/touchmove/pointerdown` dans tout `src/` (hors caméra).
- Galerie `PostDetail.jsx:174-193` : grille statique, lightbox sans swipe entre photos ni
  swipe-down-to-dismiss.
- Pull-to-refresh : absent sur Home/Dashboard/Messages — `overscroll-behavior-y: contain`
  atténue le rebond natif du navigateur (`index.css:30`) mais ne le remplace par rien.
- États `:active` bien faits sur le design system (`.btn-primary` etc. ont `active:scale-[0.98]`)
  mais absents sur de nombreux boutons custom hors système : `ThemeToggle` (`Navbar.jsx:41-52`),
  bouton Partager (`PostDetail.jsx:211-218`, `PostCard.jsx:53-61`), tabs admin, retour Chat —
  tous en `hover:` seul (qui ne se déclenche jamais au tap, et peut rester "collé" sur Android).

### Scroll et clavier virtuel
- `overscroll-contain` seulement sur le chat (`Chat.jsx:210`) — pas sur les listes internes de
  messages de `PostDetail.jsx:293,423`.
- Clavier virtuel : `Chat.jsx:169-172` utilise des valeurs `top/bottom` fixes en dur, non
  vérifiées contre `visualViewport` — risque connu de barre de saisie sous le clavier sur iOS
  Safari (non testé sans device réel).
- `#root { min-height: 100vh }` (`index.css:32`) au lieu de `100dvh` — cause typique de saut au
  scroll (rétraction de la barre d'adresse).
- Bon point déjà fait : `font-size: 16px !important` sur les inputs (anti-zoom iOS).

### PWA réelle vs façade
- **Service worker réel**, pas décoratif : app shell précaché, images stale-while-revalidate,
  API GET network-first avec fallback, navigations avec repli sur `offline.html`. Bon niveau
  pour le contexte 3G. Background Sync posé en squelette mais non implémenté (`sw.js:201-207`).
- **`manifest.json:11-12` désynchronisé** : `theme_color: #f97316`, `background_color: #0f172a`
  alors qu'`index.html:9-10` a déjà `#FAF8F5`/`#12100E`. Le splash Android auto-généré et la
  barre système suivront donc l'ancienne palette à chaque lancement de l'app installée.
- Icônes : la même image sert à `purpose: any` et `maskable` (`manifest.json:24-34`) — risque
  de rognage imprévisible selon le masque du launcher si pas de zone de sécurité 40%.
- État hors-ligne : un toast (`useOnlineStatus.js:16-19`, `duration: Infinity`), pas de bannière
  persistante ni d'indicateur "vous voyez une version en cache".

### Micro-perception de performance
- Optimistic UI présent et bien fait sur le chat (`Chat.jsx:116-146`) mais **pas généralisé** :
  approve/reject une demande, marquer récupéré, supprimer une annonce attendent tous la réponse
  serveur avant tout retour visuel (`PostDetail.jsx:96-156`, `Dashboard.jsx:72-98`).
- Skeleton vs spinner : bien fait sur Home (`SkeletonCard`) mais oublié ailleurs — texte brut
  "Chargement..." sur `Dashboard.jsx:156-157,261-263`, spinners plein écran sur
  `Messages.jsx`, `Chat.jsx`, `admin/Dashboard.jsx`, `App.jsx` PageFallback.
- **FOUC du thème sombre** : `ThemeContext.jsx:43-45` applique `.dark` via `useEffect`, donc
  après le premier paint — flash clair visible avant le mode sombre, pas de script bloquant
  inline dans `index.html`.
- `App.jsx:47` : `bg-gray-50` non migré vers `bg-paper dark:bg-night-950`, alors que `body`
  le fait déjà correctement (`index.css:23`) — l'app shell lui-même a l'ancien fond.

## Plan de refacto priorisé

### Quick wins (heures, faible risque, impact perçu élevé)
1. Fermer modales/lightbox sur retour Android (`history.pushState` + `popstate`) —
   `ConfirmDialog.jsx`, `SharePostModal.jsx`, lightbox `PostDetail.jsx`.
2. `active:scale-95` / `active:opacity-60` sur tous les boutons hover-only —
   `Navbar.jsx`, `PostDetail.jsx:211-218`, `PostCard.jsx:53-61`, `admin/Dashboard.jsx:96-108`,
   `Chat.jsx:174-181`.
3. `manifest.json:11-12` → `theme_color: #B4400A`, `background_color: #FAF8F5`.
4. `App.jsx:47` → `bg-gray-50` en `bg-paper dark:bg-night-950`.
5. Script anti-FOUC thème sombre : `<script>` inline synchrone dans `index.html` avant hydratation React.
6. Skeletons au lieu de "Chargement..."/spinner — réutiliser `SkeletonCard` déjà existant sur
   `Dashboard.jsx`, `Messages.jsx`, `Home.jsx` (recherche).
7. `overscroll-contain` sur les listes internes de `PostDetail.jsx:293,423`.

### Chantier moyen (jours, risque modéré)
8. Transitions de navigation directionnelles — via `document.startViewTransition` (natif
   navigateur, poids zéro, fallback silencieux) plutôt qu'une lib lourde en 3G.
9. Swipe-down-to-dismiss + swipe entre photos sur la lightbox — implémentable en
   `touchstart/touchmove/touchend` natif (~40 lignes), transform lié au geste en temps réel.
10. Optimistic UI généralisé (approve/reject/recover/delete) — reprendre le pattern déjà écrit
    dans `Chat.jsx`.
11. Pull-to-refresh applicatif sur Home/Dashboard/Messages — hook custom ou lib ~3 Ko gzip.
12. Audit `visualViewport` pour le clavier iOS dans Chat.

### Chantier de fond
- Background Sync réel (file IndexedDB rejouée à la reconnexion) pour les messages hors-ligne.
- État hors-ligne applicatif au-delà du toast (bandeau persistant + horodatage cache).
- Maskable icon dédiée avec zone de sécurité 40% (nécessite export graphique).

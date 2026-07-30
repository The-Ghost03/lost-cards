# LostCards — Audit esthétique et tendanciel, juillet 2026

> Audit réalisé par l'agent designer le 30/07/2026, en réponse à la question :
> « est-ce qu'en 2026 on fait toujours des interfaces comme ça ? les codes et le style, la tendance »
> Complémentaire de `AUDIT-REFACTO-2026-07.md` (qui traite technique, accessibilité, architecture).

---

## Réponse directe

**Non, en 2026 on ne fait plus des interfaces comme ça — mais le problème n'est pas que l'interface soit laide, c'est qu'elle n'a pas été décidée.** Sur les huit ou neuf choix qui définissent un langage visuel (fond, texte, accent, rayon, ombre, police, échelle, iconographie), au moins sept sont les valeurs livrées avec Tailwind. Y compris la palette « personnalisée », qui est un copier-coller de la palette `orange` du framework, et les deux vraies couleurs ivoiriennes (`ci.orange #F77F00`, `ci.green #009A44`), déclarées dans `tailwind.config.js` et jamais utilisées.

**Époque de référence du style actuel : « Tailwind UI / Refactoring UI, millésime 2020-2022 ».** En 2026, ce cluster (Inter, trois cartes arrondies, soft shadows, icônes filaires, gris bleutés) est identifié comme le look « template / généré » par excellence.

---

## 1. Ce qui date, précisément (ordre décroissant d'effet)

1. **Le gris est bleu.** Fond `#f9fafb` et texte `#1f2937` sont teintés hue ~215-220 (le duo signature Tailwind), en dissonance froide/chaude avec l'accent orange. Le fond dit « SaaS américain », l'accent dit « Abidjan ».
2. **`#f97316` est reconnaissable comme un défaut** (orange-500 Tailwind). Et texte blanc dessus = 2,4:1 — le bouton principal disparaît en plein soleil. Problème esthétique et fonctionnel confondus.
3. **`rounded-2xl` (16px) sur tout** — registre « app amicale » pour un produit qui manipule des CNI. Et 6 valeurs de rayon coexistent (88 occurrences) : aucune n'est un signal.
4. **`shadow-sm` + hover `translateY(-2px)` + ombre 24px** — le tell 2021 numéro un, et un `:hover` élaboré sur un produit à 95 % tactile.
5. **46 % du texte à 12px** (109× `text-xs`), gris `#9ca3af` (2,85:1) pour les métadonnées, `text-[9px]` dans la tab bar. Hiérarchie faite par la nuance de gris au lieu de la taille et du poids.
6. **Emojis comme système d'icônes** (🤳 📸 ⏳ ✓ 👋, ~40 occurrences) : rendu variable selon le constructeur, casse le rythme vertical, registre ludique sur un écran grave.
7. **Animations décoratives en boucle infinie** (`animate-float`, `pulse-glow` avec box-shadow animée, `wiggle`, `shimmer`) — coût CPU permanent sur entrée de gamme, zéro information. `.stagger > *` n'échelonne rien (bug d'intention).
8. **Dark mode déclenché par l'heure** (18h-7h, réévalué toutes les 60 s) au lieu de `prefers-color-scheme` — l'app décide contre le réglage de l'utilisateur.
9. **`theme-color` orange saturé** — marqueur Android 2019-2021 ; la convention 2026 est une barre de statut fondue dans le fond.
10. **8 teintes pastel de badges de documents** — la couleur ne code rien, elle décore. Pourquoi le permis serait-il vert et la carte bancaire violette ?

## 2. Ce qui est juste et qu'il ne faut PAS casser

1. **La bottom tab bar avec libellés textuels** — standard 2026, zone du pouce, et chaque onglet a un mot : décision la plus importante de l'interface pour un public à littératie numérique variable.
2. **L'orange comme couleur de marque** — ivoirien, différenciant (tout le monde est en indigo). Garder la teinte, changer la valeur.
3. **Une seule colonne** `max-w-2xl mx-auto px-4`.
4. **lucide-react** — seuls taille et stroke sont mal réglés.
5. **La liste de cartes** comme pattern principal.
6. **`input { font-size: 16px }`** (anti-zoom iOS) et `.safe-area-pb`.
7. **Les skeletons** au chargement (seul le shimmer est à changer).
8. **Le français d'abord**, dates relatives via `date-fns/locale/fr`.
9. **Le pill de statut `rounded-full`** — un statut est un tampon ; seule utilisation correcte d'un rayon complet.

## 3. Tendances 2026 écartées explicitement (avec raison)

| Tendance | Décision | Raison spécifique au produit |
|---|---|---|
| Liquid Glass / glassmorphism | **Rejeté** | Illisible en plein soleil (grief documenté des marchés à forte luminosité, Apple a reculé en iOS 26.1) ; `backdrop-filter` = la propriété CSS la plus chère sur entrée de gamme. ⚠️ Deux `backdrop-blur-sm` existent déjà **sur le flux vidéo du selfie** (`SelfieCapture.jsx:77,81`) — pire cas possible, à supprimer. |
| Motion orchestrée | Rejeté (forme ambitieuse) | En 3G sur CPU faible, l'animation EST la latence perçue. Budget : 120-200 ms, `opacity`/`transform` uniquement. |
| Neubrutalisme | Rejeté | Registre « indie joueur » incompatible avec « votre CNI est chez un inconnu ». |
| Bento grids | Rejeté | Dispositif desktop ; sur 360px ça se réduit à une pile. |
| 3D / mesh gradients animés | Rejeté | 200 Ko+ pour zéro information, data payée au Mo. |
| Dark mode par défaut | Rejeté | Usage dominant : extérieur, en journée. Le clair est le thème principal. |
| Minimalisme « icônes sans libellé » | Rejeté | Littératie variable : aucun bouton icône seule dans un parcours critique. On retient de « calm interface » la partie structurelle (moins de blocs, plus grands), pas « retirer les mots ». |
| Serif de caractère display | Rejeté | Défaut esthétique le plus reconnaissable de 2026 + ralentit la lecture (littératie). |
| `corner-shape: squircle` | Reporté | Chrome 139+ seulement : forme incohérente entre iOS et Android. À revoir dans 2 ans. |
| Agentic UX / IA dans l'UI | Rejeté | La valeur du produit est humaine ; un vernis IA réduirait la confiance. |
| Mur de badges de sécurité | Rejeté | −12 % de conversion mesurés (« defensive design anxiety »). Un signal par écran. |
| Material 3 Expressive | Partiel | On retient les « emphasized styles » (titres plus grands, graisses lourdes sur actions clés) ; on écarte le morphing de formes. |

## 4. Direction artistique proposée : « Fiche »

**Principe : le produit parle d'un rectangle que vous avez perdu.** Le langage visuel doit être celui du document officiel mis en ordre — un registre, un récépissé — pas une carte de dashboard. En Côte d'Ivoire, la confiance dans un service qui manipule des pièces d'identité s'ancre dans les codes administratifs (numéro de dossier, date, opérateur nommé), pas dans les codes startup. Registre : **de « app amicale » à « service en ordre »**. Le benchmark local est Wave/Djamo/Orange Money, pas Stripe.

### 4.1 Palette (remplace `primary` et `ci`, morts)

```js
colors: {
  // Neutres chauds — remplace la famille gray (bleutée)
  ink: {
    950: '#141210',  // titres, texte principal      · 17,0:1 sur paper
    600: '#4A423B',  // corps secondaire             ·  9,2:1
    400: '#6E655D',  // méta, horodatages            ·  5,4:1  ← remplace gray-400 (2,85:1)
    200: '#E7E2DB',  // filets, bordures 1px
    100: '#F0ECE6',  // remplissages discrets
  },
  paper:   '#FAF8F5', // fond de page   ← remplace bg-gray-50
  surface: '#FFFFFF',

  // Action — l'orange, encré
  flame: {
    50:  '#FDF0E4',
    500: '#E85D04',  // marque, icônes, remplissages larges (3,30:1 ≥ 3:1 UI)
    700: '#B4400A',  // fonds de bouton + texte blanc (5,71:1) ET texte orange sur paper (5,24:1)
    300: '#FF9A5C',  // dark mode uniquement
  },

  // Statuts — 3 couleurs sémantiques (remplacent les 8 badges pastel)
  signal:  { 50: '#E4F2EA', 600: '#0B7A4B' }, // validé — vert « tampon », proche du #009A44 du drapeau
  pending: { 50: '#FBF1D6', 700: '#8A5A00' }, // en attente
  alert:   { 50: '#FBE9E7', 700: '#B42318' }, // refusé / erreur

  // Dark mode — noir chaud, pas slate
  night: { 950: '#12100E', 900: '#1B1815', 700: '#2A2521' },
}
```

Règle clé : **`flame.700` pour tout texte/fond de bouton, `flame.500` pour icônes et éléments non textuels.**
`theme-color` : clair `#FAF8F5`, sombre `#12100E`. `LogoIcon.jsx` : `#F97316`→`#E85D04`, `#10B981`→`#0B7A4B`.
Drapeau ivoirien mobilisé structurellement : orange (action) + blanc (surface) + vert (validé). Pas de motif plaqué.

### 4.2 Typographie

**Public Sans, variable, auto-hébergée, un seul fichier** (`wght 400-700`, subset latin + latin-ext, ≈ 30 Ko) :
- Police du US Web Design System — référence de **fonction** pour une plateforme citoyenne, pas de mode.
- N'est pas Inter (le tell n°1 de 2026), hauteur d'x généreuse, chiffres tabulaires.
- Remplace 5 fichiers Inter (~80-110 Ko) + 2 handshakes DNS/TLS Google Fonts devenus inutiles (cache partitioning). `preload` + `font-display: swap`.
- Contrepoint optionnel : IBM Plex Mono subset `[0-9A-Z-]` (≈ 4 Ko) pour les références de fiche.

Échelle (plancher 13px, hiérarchie par taille/poids et non par nuance de gris) :

```js
fontSize: {
  'display': ['1.875rem', { lineHeight: '2.125rem',  letterSpacing: '-0.02em',  fontWeight: '700' }],
  'h1':      ['1.5rem',   { lineHeight: '1.8125rem', letterSpacing: '-0.015em', fontWeight: '700' }],
  'h2':      ['1.1875rem',{ lineHeight: '1.5rem',    letterSpacing: '-0.01em',  fontWeight: '650' }],
  'lead':    ['1.0625rem',{ lineHeight: '1.625rem' }],
  'body':    ['0.9375rem',{ lineHeight: '1.4375rem' }],
  'label':   ['0.8125rem',{ lineHeight: '1.125rem',  letterSpacing: '0.005em',  fontWeight: '600' }],
  'meta':    ['0.8125rem',{ lineHeight: '1.125rem',  fontWeight: '500' }],   // ← remplace text-xs (109×)
  'ref':     ['0.8125rem',{ lineHeight: '1rem',      letterSpacing: '0.06em', fontWeight: '500' }],
}
```

`text-[9px]`/`text-[10px]` de la Navbar → 12px minimum pour les libellés d'onglets.

### 4.3 Formes : trois rayons, pas six

```js
borderRadius: {
  'fiche':   '12px',   // cartes, images, modales — dérivé de l'objet réel (carte ID : ~3,7 % de rayon relatif)
  'control': '10px',   // boutons, champs, chips
  'stamp':   '9999px', // pastilles de statut, avatars UNIQUEMENT
}
```

### 4.4 Élévation : filets, pas ombres

```css
.fiche { background: #FFF; border: 1px solid #E7E2DB; border-radius: 12px; } /* aucune ombre */
--shadow-float: 0 8px 24px -8px rgb(20 18 16 / 0.18); /* réservé : modales, sheet, toast, bottom bar */
```

Supprimer `.card-hover:hover` (translateY + ombre + bordure orange) et `.btn-primary:hover` (translateY + glow) — produit tactile : ne garder que `:active` et `:focus-visible`.

### 4.5 Iconographie

- lucide-react conservé : `strokeWidth={2}` (2.25 onglet actif), **minimum 18px** contenu / 20px boutons / **24px bottom bar**. Fin des `size={10-13}`.
- Une icône par intention : PostCard passe de 5 icônes à 2 (retirer Calendar et ArrowRight).
- **Tous les emojis sortent du chrome et des statuts** (⏳→`<Clock/>` sur pending.50, ✓→`<Check/>`, 🤳→`<Camera/>`, 👋→rien). **Exception unique : 🇨🇮** — l'emoji est autorisé quand il EST le contenu.

### 4.6 Densité, motion, dark mode

- Échelle 4pt, 7 valeurs (4/8/12/16/24/32/48). Cibles tactiles **48px**. **Une action primaire par écran** (le Dashboard en a 10 aujourd'hui : grille 2×2 multicolore → liste verticale, une action mise en avant).
- Motion : `--dur-press: 120ms`, `--dur-enter: 200ms`, `opacity`/`transform` uniquement. Supprimer float/pulseGlow/wiggle/shimmer/.stagger. Ajouter `prefers-reduced-motion`.
- Dark mode : `prefers-color-scheme` par défaut (toggle système/clair/sombre), surfaces `night.*` (noir chaud, pas slate), `flame.300` en accent. Le clair reste le thème principal (usage extérieur diurne).

### 4.7 Codes de confiance (le budget design va au moment de la vérification)

1. **Élément signature — le face-à-face** : selfie et photo de la pièce côte à côte, même taille, même rayon 12px, titre « Le retrouveur compare votre visage à la photo sur vos pièces ». (Actuellement : cercle avatar 144px bordé orange = code réseau social.)
2. **Référence de fiche** : `FICHE 4A7C-2B19` en mono uppercase sur chaque annonce — l'objet devient un enregistrement, registre administratif instantané.
3. **Provenance visible** : « Édité par Soft Skills — Abidjan » + **numéro WhatsApp cliquable** (fait plus pour la confiance qu'une icône cadenas).
4. **Étapes comptées** : « Étape 2 sur 3 » sur le parcours selfie (réduction d'abandon documentée).
5. **Qui voit quoi** : « Votre selfie n'est visible que par la personne qui a trouvé vos pièces. Supprimé au bout de 30 jours. » — en 15px, pas en 12px gris. (Conditionné à : que ce soit vrai.)
6. **Preuve spécifique** : « 312 portefeuilles rendus à Abidjan » (chiffre réel) plutôt que « 10 000+ utilisateurs ».
7. **Copie** : « C'est bien lui / elle » → « Le visage correspond » ; « Pas le bon » → « Le visage ne correspond pas ».

## 5. Priorisation

### P0 — 80 % de la perception, ~1-1,5 jour, deux fichiers
1. Palette complète dans `tailwind.config.js` (supprimer `primary`/`ci` morts).
2. `body` : `bg-paper` + `text-ink-950` (`index.css:8`).
3. `.card` → rayon 12px + filet, sans ombre ; `.btn-*`/`.input` → 10px ; suppression des blocs `:hover` translate/glow (`index.css:36-96`).
4. Échelle typo + `text-xs`→`text-meta` + fin des 9-10px (Navbar).
5. Public Sans variable auto-hébergée ; retrait Google Fonts + graisse 800 inutilisée ; `theme-color` (`index.html`).

### P1 — le cœur produit, ~4-6 jours
6. Emojis hors chrome/statuts (~40 occurrences, garder 🇨🇮).
7. PostCard refondue en « fiche » (référence mono, nom 19px, 3 statuts, 2 icônes).
8. Écran de vérification : face-à-face, étapes comptées, engagement rétention 15px ; **supprimer les 2 `backdrop-blur-sm` sur la vidéo** (`SelfieCapture.jsx:77,81`).
9. Diète motion + `prefers-reduced-motion`.
10. Dark mode `prefers-color-scheme` + surfaces `night.*` (supprimer le `setInterval` 60 s).
11. Icônes stroke 2 / plancher 18-24px ; cibles 48px.
12. Dashboard : une action primaire, liste verticale.

### P2 — chantier de fond
13. Tokens CSS variables `:root`/`.dark` remplaçant les ~140 lignes de surcharges `.dark` (prérequis technique, recoupe l'audit précédent).
14. Migration Tailwind v4 (`@theme`, OKLCH natif). Actuellement 3.4.19.
15. Page « Qui sommes-nous » : provenance, rétention, compteur réel.
16. Logo aux nouvelles valeurs + icônes PWA (en même temps, sinon deux oranges).
17. Copie des écrans de vérification.

---

## Sources principales

Tendances : [Envato Elements](https://elements.envato.com/learn/ux-ui-design-trends) · [UXPin](https://www.uxpin.com/studio/blog/ui-ux-design-trends/) · [Pixelmatters](https://www.pixelmatters.com/insights/7-UI-design-trends-to-watch-in-2026)
Look par défaut : [925studios](https://www.925studios.co/blog/ai-slop-design-tells) · [Superdesign](https://superdesign.dev/blog/why-ai-design-looks-generic) · [DEV/Alan West — indigo-500](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)
Typo : [FontAlternatives](https://fontalternatives.com/blog/best-variable-fonts-product-ui-2026/) · [Superfiles](https://superfiles.in/7-clean-alternatives-to-inter-font.php) · [madegooddesigns](https://madegooddesigns.com/inter-font/) · [GDJ](https://graphicdesignjunction.com/2026/01/2026-typography-trends/) · [Tune The Web](https://www.tunetheweb.com/blog/should-you-self-host-google-fonts/) · [LogRocket](https://blog.logrocket.com/self-hosted-fonts-vs-google-fonts-api/)
Couleur : [TWColors — Tailwind v4 OKLCH](https://tailwindcolor.tools/blog/tailwind-css-v4-color-system-complete-guide) · [Steve Kinney](https://stevekinney.com/courses/tailwind/oklch-colors)
Formes/profondeur : [Smashing Magazine — corner-shape](https://www.smashingmagazine.com/2026/03/beyond-border-radius-css-corner-shape-property-ui/) · [92learns](https://blog.92learns.com/border-radius-rules/) · [Muzli](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/) · [Android Authority — M3 Expressive](https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/)
Liquid Glass : [Gulf News — Apple recule](https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176) · [Setproduct](https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism) · [Axess Lab](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/)
Confiance : [Mavik Labs](https://www.maviklabs.com/blog/design-for-trust-2026/) · [Outcrowd](https://www.outcrowd.io/blog/fintech-design-trends-2026) · [Eleken](https://www.eleken.co/blog-posts/modern-fintech-design-guide) · [WSA](https://wsa.design/news/top-10-fintech-ux-design-best-practices-for-2026)
Afrique/civic tech : [techbuild.africa](https://techbuild.africa/low-bandwidth-product-design-africa/) · [European Democracy Hub](https://europeandemocracyhub.epd.eu/assessing-civic-tech-that-works-to-build-theafricawewant-citizen-led-tech-for-impact-that-can-help-african-governments-deliver-better-services/) · [ResearchGate — identité graphique ivoirienne](https://www.researchgate.net/publication/351845625_A_Creative_Research_Process_for_a_Modern_African_Graphic_Design_Identity_The_Case_of_Ivory_Coast) · [TriplePundit — Wave CI](https://triplepundit.com/2025/wave-mobile-money-cote-divoire/) · [Digital Mag CI — fintech ivoirienne](https://digitalmag.ci/djamo-cinetpay-wave-yellow-push-ces-start-ups-qui-font-la-fintech-en-cote-divoire/)

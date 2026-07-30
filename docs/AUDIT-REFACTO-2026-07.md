# LostCards — Rapport d'audit & plan de refacto

**Date :** 30 juillet 2026
**Périmètre :** monorepo complet (`backend/` Laravel 11 ~2 100 lignes, `frontend/` React 19 ~4 900 lignes, Docker, déploiement)
**Auteurs :** agents `designer` (audit UX/UI) et `chef-projet` (analyse technique & plan), synthèse consolidée.

---

## 1. Résumé exécutif

Le code applicatif est globalement sain et le durcissement sécurité récent (IDOR, throttle, CSP) est de bonne qualité. **Mais il est annulé par la couche infra** : la ligne CMD de `backend/Dockerfile` concentre à elle seule 3 des 5 risques majeurs (seed admin à chaque boot, `artisan serve` en prod, worker non supervisé).

### Découvertes critiques

| # | Constat | Zone |
|---|---------|------|
| 1 | **Le mot de passe admin était réinitialisé à une valeur en dur à chaque restart en prod** (`db:seed` dans le CMD du Dockerfile), valeur qui était publiée dans le README — corrigé et rotaté le 30/07/2026 | Sécurité |
| 2 | **Aucun backup** des volumes `db_data` et `selfies` — perte du VPS = perte totale des données | Infra |
| 3 | **Queue worker lancé en `&` sans supervision** : s'il meurt, plus aucun mail/notification, invisiblement (exceptions avalées par des `catch {}` vides) | Infra |
| 4 | ~~**Contradiction privacy** : le README affirme que le nom complet n'est jamais exposé, mais `Post::booted()` copie `name_on_cards` tel quel dans `name_partial`~~ → **Arbitré le 30/07/2026 : le nom complet reste affiché** (choix produit). README corrigé, aucun masquage à implémenter | Produit/Sécurité |
| 5 | **Zoom bloqué** (`user-scalable=no`) — violation WCAG 1.4.4 sur une cible grand public mobile | UX |
| 6 | **Aucun code splitting** : le dashboard admin (682 lignes) est téléchargé par tous les visiteurs en 3G | UX/Perf |
| 7 | **Erreurs réseau silencieuses** : faux états vides ("Aucune annonce") sans bouton réessayer sur connexion instable | UX |
| 8 | **Liens push en ID BIGINT** : le fix UUID des liens mail (commit d4b4844) n'a pas été appliqué aux URLs push — deep-links cassés dès réactivation du push | Backend |

---

## 2. Audit backend (`backend/`)

| Constat | Preuve | Gravité |
|---|---|---|
| Aucun test automatisé | Pas de `backend/tests/`, pas de `phpunit.xml` ; le README documente `php artisan test` qui ne teste rien | Élevée |
| Aucune Form Request, aucune Policy | Validation inline et `abort_unless` dupliqués dans `PostController.php` (l.121-137), `ContactRequestController.php` (l.127, 141, 168), `MessageController.php` (l.118-128) | Moyenne |
| Pattern notification copié-collé ×4 | Closures `dispatch(function() { Mail::to()… PushService… })` dans `ContactRequestController.php` (l.105, 147, 174) et `MessageController.php` (l.99) | Moyenne |
| Liens push en ID BIGINT | `ContactRequestController.php` l.104-117, 157 ; `MessageController.php` l.97, 110 — alors que `Post::getRouteKeyName()` = `uuid` | Moyenne (bloquant push) |
| 500 sur route publique | `GET /api/posts?my=1` sans auth → `$request->user()->id` sur `null` (`PostController.php` l.27) | Moyenne |
| ~~Privacy : nom complet exposé~~ → décision produit : affichage assumé, README aligné | `Post.php` l.31-40 | Clos |
| Cascades de suppression dupliquées, sans transaction ni nettoyage disque | `AuthController::deleteAccount` (l.209-215) et `Admin/DashboardController::deleteUser` (l.71-76) | Moyenne |
| Exceptions avalées sans log | `catch (\Throwable) {}` dans `AuthController.php` (l.82, 126), `ContactRequestController.php`, `MessageController.php` | Moyenne |

**Points positifs :** services existants (`ImageOptimizer`, `AlertNotifier`, `PushService`), UUID en route binding, `$hidden` sur les modèles, throttling des routes auth, corrections IDOR récentes.

## 3. Audit frontend (`frontend/src/`)

| Constat | Preuve | Gravité |
|---|---|---|
| Zoom désactivé | `index.html:6` : `maximum-scale=1.0, user-scalable=no` — WCAG 1.4.4 | **Critique** |
| Aucun code splitting | 13 pages importées statiquement dans `App.jsx:12-24`, 0 `React.lazy` | **Critique** |
| Erreurs réseau avalées | `catch(() => {})` dans `pages/Home.jsx:66`, `Dashboard.jsx:57-63`, `Messages.jsx:18`, `Alerts.jsx:17` → faux états vides sans retry | **Critique** |
| Dark mode anti-pattern | `index.css:91-233` : ~80 overrides globaux `.dark .text-gray-900 {…}` hors layer, certains en `!important` | Majeur |
| Pages monolithiques | `admin/Dashboard.jsx` 682 l., `PostDetail.jsx` 485 l., `Dashboard.jsx` 378 l. | Majeur |
| Formulaires inaccessibles | Aucun `htmlFor`/`id` dans tout le projet ; erreurs uniquement en toasts de 3 s | Majeur |
| Modales non conformes | `ConfirmDialog.jsx`, `SharePostModal.jsx`, lightbox `PostDetail` : ni `role="dialog"`, ni focus trap, ni Échap | Majeur |
| `safe-area-pb` inexistante | Classe utilisée dans `Navbar.jsx:150` mais définie nulle part → tab bar sous la home bar iPhone | Majeur |
| "Sortir" en onglet de tab bar | `Navbar.jsx:175-181` — tap destructeur accidentel à côté de "Profil" | Majeur |
| Contrastes < 4,5:1 | `text-gray-400` (≈2,8:1) et `text-orange-500` (≈2,9:1) sur blanc, textes 9-11 px | Majeur |
| Tokens définis jamais utilisés | `tailwind.config.js` déclare `primary.*` et `ci.*`, 0 usage dans `src/` | Mineur |
| Copy obsolète | `Home.jsx:124` : "question secrète" alors que le flow réel est le selfie | Mineur |
| Constantes dupliquées | `DOC_LABELS` en 3 versions divergentes (`PostCard.jsx:7-16`, `PostDetail.jsx:16-20`, `PostCreate.jsx:11-20`) ; badges de statut ×3 | Mineur |
| Aucun test frontend | Pas de Vitest/Testing Library dans `package.json` | Élevée |

**Points positifs :** structure claire (`api/`, `components/`, `context/`, `lib/`, `pages/`), ErrorBoundary, gestion 401 centralisée, états vides soignés, optimistic UI dans le chat, CSP stricte dans `nginx.conf`.

## 4. Audit infra & déploiement

| Constat | Preuve | Gravité |
|---|---|---|
| `db:seed` à chaque boot prod (reset mdp admin) | `backend/Dockerfile` l.29 + `DatabaseSeeder.php` l.14-33 (`updateOrCreate`) + README l.98 | **Critique** |
| `php artisan serve` en production | `backend/Dockerfile` l.29 — mono-processus, aucune tenue en charge | Élevée |
| Worker en `&` non supervisé, logs dans `/tmp` | `backend/Dockerfile` l.29 | Élevée |
| Aucun backup | volumes `db_data`/`selfies` dans `docker-compose.prod.yml` l.40-42 | Élevée |
| Aucune CI/CD | Pas de `.github/` ; `push.sh` fait `git add .`, `pull.sh` = pull + rebuild + `sleep 8` sans healthcheck ni rollback | Élevée |
| Aucun monitoring | Pas de Sentry/uptime/alerting ; combiné aux `catch {}`, dégradation invisible | Élevée |
| Mot de passe DB en fallback committé (valeur en clair dans le dépôt) | `docker-compose.prod.yml` l.6, 11 — fallback retiré le 30/07/2026, la variable est désormais requise ; **la valeur reste à rotater** | Moyenne |
| `chmod -R 777 storage` | `backend/Dockerfile` l.24 | Moyenne |
| Compose dev fragile | `key:generate --force` à chaque boot, `apt+composer install` à chaque `up`, MySQL exposé root/secret | Moyenne (dev) |
| `errors.log` : script de déploiement SSH cassé | Racine : `ECONNREFUSED` sur le port 22 du VPS, quoting buggé | Moyenne |
| Limites upload divergentes | Dockerfile 50M vs validation applicative 8M | Faible |

## 5. Registre des risques

| # | Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|---|
| R1 | Compte admin accessible avec un mot de passe en dur publié dans le README (seed au boot) — **clos** : rotaté le 30/07/2026 | Critique | Élevée | P1-S1 |
| R2 | Mort silencieuse du worker → plus aucune notification | Élevé | Élevée | P1-S3 |
| R3 | Régression non détectée (0 test, 0 CI, déploiement direct prod) | Élevé | Élevée | P1-S6, P1-S7 |
| R4 | Perte de données (pas de backup) | Critique | Moyenne | P1-S4 |
| R5 | Écroulement sous charge (`artisan serve`) | Élevé | Moyenne | P2-S1 |
| R6 | Exposition du nom complet des pièces — **risque accepté** (décision produit du 30/07/2026). Reste ouvert : l'indexation de ces noms par les moteurs de recherche (voir P3-S7) | Moyen (accepté) | Certain | Documenté (README) |
| R7 | Réactivation push avec deep-links cassés | Moyen | Élevée | P1-S5 |
| R8 | Dette de structure frontend → vélocité en baisse | Moyen | Élevée à 6 mois | P2-E3 |
| R9 | Bus factor = 1 (scripts perso, pas de runbook) | Moyen | Moyenne | P2-S11, P3-S6 |

---

## 6. Plan de refacto

### PHASE 1 — Quick wins & stabilisation (Sprint 1, ~1-2 semaines)

| ID | Story | Effort | Agent | Dépend. |
|---|---|---|---|---|
| P1-S1 | Retirer `db:seed` du CMD Dockerfile, durcir le seeder (mdp via env, pas de défaut), retirer les credentials du README. **⚠ Action manuelle : changer immédiatement le mdp admin en prod** | S | securite | — |
| ~~P1-S2~~ | ✅ **Clos le 30/07/2026** — décision : le nom complet reste affiché publiquement. README corrigé en conséquence, aucun changement de code. Dette résiduelle : `name_partial` duplique désormais `name_on_cards` sans raison (à supprimer en Phase 2, cf. P2-S7) | S | — | — |
| P1-S3 | Worker de queue en service compose dédié (`restart: unless-stopped`, logs stdout) | S | devops | — |
| P1-S4 | Backup automatisé : mysqldump quotidien + sauvegarde du volume `selfies` hors VPS, restauration documentée | M | devops | — |
| P1-S5 | Fixes backend : URLs push en `uuid`, garde auth sur `?my=1`, `Log::warning` dans les `catch` vides | S | backend | — |
| P1-S6 | CI GitHub Actions : lint+build frontend, `composer validate`, build des 2 images sur PR | M | devops | — |
| P1-S7 | Tests de non-régression backend sur les flux critiques (auth, autorisations contact, révélation `pickup_address`) | M | qa | P1-S5 |
| P1-S8 | Quick wins UX : réactiver le zoom, définir `.safe-area-pb`, `React.lazy` sur les routes, `aria-label` + `htmlFor`/`id` sur les formulaires, copy "question secrète"→selfie, Spinner unifié | S | frontend | — |

**Jalon M1 :** prod sécurisée, worker supervisé, backups, CI qui bloque les régressions.

### PHASE 2 — Refacto structurel (Sprints 2-4, ~4-6 semaines) — *conditionné à P1-S7*

**E1 Runtime prod** : php-fpm+nginx (ou FrankenPHP) à la place d'`artisan serve`, multi-stage, non-root, sans `chmod 777` (M, devops) · healthcheck `/api/health` + zéro-downtime + suppression des fallbacks secrets (M, devops) · compose dev assaini (S, devops).

**E2 Backend** : Form Requests + Policies (M) · Events/Listeners queued remplaçant les 4 closures de notification (M) · `UserDeletionService` transactionnel avec nettoyage disque + extraction `DeviceDetector` (S) · API Resources remplaçant les `toArray()` custom (M) — agent backend.

**E3 Frontend** : design system minimal `components/ui/` — Button, Modal accessible (portal, focus trap, Échap), StatusBadge, DocumentBadge + `lib/constants.js`, EmptyState, FormField, ErrorState avec retry (M) · branchement des tokens `primary` + migration dark mode vers CSS variables (M) · découpage `admin/Dashboard.jsx` en onglets lazy + hooks (M) · découpage `PostDetail.jsx`/`Dashboard.jsx` en features + `useRole()` (M) · tests Vitest sur login, création d'annonce, réclamation selfie, ProtectedRoute (M, qa).

Structure cible frontend :
```
src/
├── components/ui/        # Button, Modal, StatusBadge, EmptyState, FormField, ErrorState…
├── features/
│   ├── post/             # PostCard, PostPhotoGallery, ClaimSection, ContactRequestList…
│   ├── chat/             # ChatWindow, MessageBubble, MessageInput
│   └── admin/            # StatsTab, AnalyticsTab, PostsTab, UsersTab
├── lib/                  # constants.js (DOC_LABELS, COMMUNES, STATUS_META), useRole.js
└── pages/                # orchestration fine, < 150 lignes chacune
```

**E4 Déploiement** : pipeline CD (images taguées en CI → registry → déploiement SSH par tag/release, rollback = tag précédent), retrait de `push.sh`/`pull.sh` et du mécanisme SSH cassé d'`errors.log` (L, devops).

**Jalon M2 :** backend structuré sous tests, frontend découpé, déploiement reproductible avec rollback.

### PHASE 3 — Amélioration continue (fil de l'eau)

Monitoring Sentry front+back, uptime, alerte `failed_jobs` (M, devops) · réactivation du push web après P1-S5, ou suppression définitive du code mort (M, front+back) · chat websockets Laravel Reverb (L, spike) · contrastes WCAG (`gray-400`→`gray-500`, `orange-500`→`orange-600`, min 12 px) + "Sortir" hors tab bar + erreurs de formulaire inline + self-hosting Inter (M, designer+frontend) · purge/rétention (selfies rejetés, analytics, `CheckLatentUsers` — vérifier son scheduling en prod) (M, backend) · audit sécurité de suivi (M, securite) · runbook d'exploitation + README à jour (S, devops).

---

## 7. Décisions produit

### Tranchées

1. ✅ **Nom sur les pièces (30/07/2026)** : **affichage complet conservé**, pour qu'un propriétaire
   reconnaisse son nom sans ambiguïté. Aucun masquage ne sera implémenté ; le README a été aligné
   sur ce comportement. Conséquences acceptées et à suivre :
   - `name_partial` est désormais un doublon strict de `name_on_cards` → à supprimer en Phase 2 (P2-S7).
   - Ces noms sont dans les pages indexables (sitemap + JSON-LD) → nouvelle story **P3-S7** ci-dessous.
2. ✅ **Compte démo (30/07/2026)** : conservé mais neutralisé (mot de passe aléatoire inconnu),
   car il possède l'unique annonce de la plateforme. Suppression non retenue à ce stade.

### En attente

3. **Push notifications** : réactiver (après fix UUID) ou supprimer définitivement le code mort ?
4. **Indexation des noms (P3-S7, nouveau)** : puisque les noms restent publics, faut-il empêcher
   leur archivage permanent par les moteurs de recherche — `noindex` sur les pages d'annonce et
   retrait de `/posts/*` du sitemap, tout en gardant les pages statiques indexées ? Le nom reste
   alors visible sur le site mais ne survit pas à l'annonce dans les caches Google. Effort S, agent
   backend + designer/SEO.

### Faites

5. ✅ **Mot de passe admin prod** : rotaté le 30/07/2026, nouvelle valeur dans
   un fichier root-only (0600) dans le `$HOME` root du VPS. 86 tokens Sanctum révoqués.

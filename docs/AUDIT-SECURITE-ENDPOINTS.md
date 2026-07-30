# Audit de sécurité — API LostCards (endpoint par endpoint)

**Date** : 30/07/2026 · **Périmètre** : `backend/routes/api.php` (29 routes), contrôleurs, modèles, middlewares, configuration Docker/nginx
**Méthode** : revue de code en lecture seule + lecture des en-têtes HTTP publics de production (2 `GET` anodins). Aucun test intrusif.
**Hors périmètre** : `backend/tests/`, Docker.

---

## 1. Résumé exécutif

L'API est globalement bien tenue : binding UUID systématique, `pickup_address` / `secret_answer` en `$hidden`, `role` hors `$fillable`, CSP + HSTS effectifs, aucune injection SQL (Eloquent bindé partout), ré-encodage GD des images. Les correctifs IDOR sur `approve`/`reject` sont **vérifiés et corrects**, et le TTL des tokens de reset est **déjà corrigé**.

Restent 4 problèmes majeurs, dont deux invisibles dans le code applicatif :

1. `trustProxies(at: '*')` rend l'IP client falsifiable → **tous les throttles d'authentification sont contournables** par rotation de `X-Forwarded-For` (F-01).
2. Les messages sont scopés **par annonce et non par demande approuvée** → deux réclamants approuvés sur la même annonce lisent la conversation privée l'un de l'autre (F-02).
3. `GET /api/posts` est **non throttlé, non authentifié, `limit` non borné**, et expose le **téléphone du retrouveur** → moissonnage complet de la base en une requête, et DoS sur un `php artisan serve` mono-thread (F-03, F-04).
4. Laravel 11 est **EOL depuis le 12/03/2026**, visé par 7 avis dont 3 sans correctif en 11.x ; CVE-2025-27515 touche exactement le motif `photos.*` utilisé à l'upload et ouvre une chaîne vers un XSS same-origin conforme à la CSP (F-05, F-06, F-25).

S'y ajoute une **perte de données silencieuse** : selfies et photos n'étaient écrits dans aucun volume Docker (F-07) — **corrigé le 30/07/2026**, voir `RUNBOOK-BACKUP.md` §0.1.

---

## 2. Cartographie endpoint par endpoint

| Méthode / route | Auth | Throttle | Constats |
|---|---|---|---|
| `POST /api/analytics/track` | non | 120/min | F-18, F-01 |
| `GET /api/push/public-key` | non | **aucun** | OK (donnée publique) |
| `POST /api/register` | non | 10/min | F-01, F-13, F-14 |
| `POST /api/login` | non | 10/min | F-01, F-08, F-13 |
| `POST /api/forgot-password` | non | 5/min | F-01, F-15 |
| `POST /api/reset-password` | non | 5/min | OK (TTL corrigé) |
| `GET /api/posts` | non (`my=1`→401) | **aucun** | **F-03, F-04**, F-17 |
| `GET /api/posts/{uuid}` | non | **aucun** | F-11, F-17 |
| `GET /api/posts/{uuid}/photos/{uuid}` | non | **aucun** | F-06, F-11, F-20 |
| `POST /api/logout` | sanctum | aucun | OK (F-12 partiel) |
| `GET /api/me` | sanctum | aucun | OK |
| `PATCH /api/me/status` | sanctum | aucun | OK |
| `DELETE /api/me` | sanctum | aucun | F-16 |
| `POST /api/posts` | sanctum | **aucun** | **F-05, F-06**, F-09, F-10 |
| `PATCH /api/posts/{uuid}/recover` | sanctum + owner/approuvé/admin | aucun | F-02 (variante) |
| `DELETE /api/posts/{uuid}` | sanctum + owner/admin | aucun | F-16, F-20 |
| `GET /api/me/contacts` | sanctum (scopé) | aucun | OK |
| `GET /api/posts/{uuid}/contact` | sanctum + owner/admin sinon scopé | aucun | **F-11**, F-19 |
| `POST /api/posts/{uuid}/contact` | sanctum | **aucun** | F-05, F-09, F-19 |
| `PATCH .../contact/{uuid}/approve` | sanctum + owner | aucun | OK (IDOR corrigé, vérifié) |
| `PATCH .../contact/{uuid}/reject` | sanctum + owner | aucun | OK (IDOR corrigé, vérifié) |
| `GET .../contact/{uuid}/selfie` | sanctum + owner | aucun | OK (403 avant 404) ; F-11 |
| `GET /api/conversations` | sanctum | aucun | OK |
| `GET /api/conversations/{uuid}/messages` | sanctum + owner/approuvé/admin | aucun | **F-02**, F-21 |
| `POST /api/conversations/{uuid}/messages` | sanctum + owner/approuvé | **aucun** | **F-02**, F-10 |
| `GET|POST /api/alerts`, `DELETE /api/alerts/{uuid}` | sanctum (scopé) | **aucun** | F-10 |
| `POST /api/push/subscribe` | sanctum | aucun | F-22 |
| `POST /api/push/unsubscribe` | sanctum | aucun | OK |
| `POST /api/push/test` | sanctum | **aucun** | F-10 (mineur) |
| `GET /api/admin/*`, `PATCH|DELETE /api/admin/users/{uuid}` | sanctum + `admin` | aucun | F-21, F-23 |

**Aucun throttle global** : `bootstrap/app.php` n'ajoute pas `throttle:api` au groupe `api`, aucun `RateLimiter::for()` défini. **5 routes sur 29 sont limitées.**

---

## 3. Constats détaillés

### F-01 — Élevée — IP falsifiable : throttles d'auth contournables · CVSS 7.5
`bootstrap/app.php:17` → `trustProxies(at: '*')` ; `frontend/nginx.conf:66` utilise `$proxy_add_x_forwarded_for` qui **conserve** la valeur cliente.

Tous les proxys étant approuvés, Laravel retient l'entrée la plus à gauche de `X-Forwarded-For`, contrôlée par le client. `throttle:10,1` (login/register), `5,1` (forgot-password) et `120,1` (analytics) sont keyés sur `$request->ip()` → **débit illimité** par incrémentation de l'en-tête : bruteforce, credential stuffing, énumération, empoisonnement analytics. `users.last_ip` devient falsifiable, invalidant la piste d'audit.

**Remédiation** : `trustProxies(at: ['127.0.0.1', '172.16.0.0/12'])` + `proxy_set_header X-Forwarded-For $remote_addr;` sur le nginx d'edge. Ajouter un limiteur composite : `RateLimiter::for('login', fn($r) => [Limit::perMinute(5)->by($r->input('email')), Limit::perMinute(20)->by($r->ip())])`.

### F-02 — Élevée — IDOR : conversations partagées entre réclamants d'une même annonce · CVSS 7.1
`MessageController.php:49-66` et `:125-135` ; `Message.php` (pas de `contact_request_id`).

`authorizeAccess()` autorise propriétaire **ou** demande approuvée sur l'annonce ; `index()` renvoie **tous** les messages de l'annonce. Rien ne limite le nombre d'approbations par annonce (`unique(['post_id','user_id'])` n'empêche que les doublons d'un même utilisateur).

*Scénario* : le retrouveur approuve A ; la conversation contient l'adresse de remise, le téléphone, l'heure du rendez-vous. Un fraudeur B, approuvé sur la même annonce, lit **l'intégralité du chat A ↔ retrouveur**, peut y écrire, et `MessageController.php:74-87` route les réponses du retrouveur vers le **dernier** approuvé (`->latest()->value('user_id')`) : les messages destinés à A partent chez B. Variante d'intégrité : `PostController.php:114-132` laisse tout réclamant approuvé passer l'annonce en `recovered`.

**Remédiation** : ajouter `contact_request_id` sur `messages`, scoper lectures/écritures sur (annonce, demande approuvée de l'appelant) ; une seule approbation active par annonce ; restreindre `recover` au propriétaire (+ admin).

### F-03 — Élevée — Moissonnage de masse des PII · CVSS 7.5
`PostController.php:20,36` — `Post::with('user:id,name,phone')` et `paginate($request->input('limit', 12))`.

`limit` n'est ni validé ni borné, et la relation expose le **téléphone du retrouveur** à un visiteur anonyme (la décision produit du 30/07/2026 couvre `name_on_cards`, pas le téléphone d'un tiers).

*Scénario* : `GET /api/posts?limit=100000` → dump en un appel : nom complet figurant sur les pièces, commune, documents, `secret_question`, URLs de photos, **téléphone**. Base « nom + téléphone » exploitable pour du phishing ciblé (« votre CNI a été retrouvée, payez les frais »), fléau documenté à Abidjan.

**Remédiation** : `'limit' => 'sometimes|integer|min:1|max:50'` ; retirer `phone` du `with()` public (le servir après approbation, comme `pickup_address`) ; `throttle:60,1` sur les lectures publiques.

### F-04 — Élevée — DoS applicatif (N+1 amplifié × serveur mono-thread) · CVSS 7.5
`Post.php:76-94` ; `Dockerfile:35` ; `nginx.conf:12`.

`Post::toArray()` traduit `user_id` en UUID ; `index()` charge `user:id,name,phone` **sans** `uuid`, donc chaque annonce déclenche `User::where('id',…)->value('uuid')` : **une requête SQL par ligne**. Avec F-03, `?limit=50000` = 50 000 requêtes dans une seule réponse. Amplificateur décisif : la prod tourne sous `php artisan serve`, **mono-processus** — une requête lente bloque toute l'API (`proxy_read_timeout 120s`). Second vecteur : `client_max_body_size 50M` + `post_max_size=50M` sur un `POST /api/posts` non throttlé.

**Remédiation** : php-fpm + nginx (ou Octane/FrankenPHP) ; a minima `PHP_CLI_SERVER_WORKERS > 1` ; sélectionner `uuid` dans le `with()` ; borner `limit` ; aligner les limites d'upload (F-09).

### F-05 — Élevée — Contournement de validation d'upload (CVE-2025-27515) → XSS same-origin · chaîne ~7.3
`PostController.php:77-78` (`'photos.*' => 'image|max:8192'`) ; `composer.json:8` ; **absence de `composer.lock`**.

GHSA-78fx-h6xr-vch4 / CVE-2025-27515 porte sur la **validation par joker des tableaux de fichiers** (`files.*`) : une requête forgée fait échapper un élément aux règles. Corrigé en **11.44.1** ; sans lock, la version déployée est indéterminée.

*Chaîne si version < 11.44.1* : un compte non vérifié (F-14) joint un `.js` et un `.html` échappant à `image`. `ImageOptimizer::optimizeAndStore()` ne sait pas les décoder et retombe sur `return $file->store($dir, 'local');` (`ImageOptimizer.php:33-35`), qui **conserve l'extension**. `PostController::photo()` (`:55-65`) les sert via `response()->file()`, qui fixe le `Content-Type` d'après le contenu → `text/html` / `application/javascript` **sur l'origine de production**. La CSP (`script-src 'self'`) bloque l'inline mais **autorise** `<script src="/api/posts/…/photos/….js">` : exécution JS same-origin → lecture de `localStorage['token']` (`frontend/src/api/axios.js:11`), token Sanctum **sans expiration** (F-12) → compromission durable, admin inclus.

**Remédiation** : (1) mettre à niveau le framework (F-25) ; (2) `'photos.*' => ['file','mimes:jpg,jpeg,png,webp','mimetypes:image/jpeg,image/png,image/webp','max:8192']` ; (3) **ne jamais stocker l'original** — remplacer le fallback d'`ImageOptimizer` par `abort(422)` ; (4) forcer le type de sortie : `response()->file($path, ['Content-Type' => 'image/jpeg', 'Content-Disposition' => 'inline; filename="photo.jpg"', 'X-Content-Type-Options' => 'nosniff'])`.

### F-06 — Moyenne — Upload SVG accepté par la règle `image` (Laravel 11) · CVSS 5.4
`PostController.php:78` ; `ContactRequestController.php:67` ; `ImageOptimizer.php:23-35`.

En 11.x, `validateImage()` délègue à `validateMimes(['jpg','jpeg','png','gif','bmp','svg','webp'])` — **le SVG est accepté** (son retrait est un changement de Laravel 12, sans paramètre `allow_svg` en 11.x). GD ne le décode pas → fallback `$file->store()` → servi en `image/svg+xml`. Sans la CVE de F-05, l'impact est contenu par la CSP, mais il reste une **page arbitraire hébergée sur le domaine de confiance** (phishing crédible) et un vecteur XXE selon les moteurs.

### F-07 — Élevée (opérationnel) — Fichiers hors volume Docker : perte de données et sauvegardes vides · **CORRIGÉ le 30/07/2026**
`config/filesystems.php:6` (`root => storage_path('app/private')`) vs `docker-compose.prod.yml` (montage sur `app/selfies`) vs `scripts/backup.sh` (archivait `selfies`).

**Vérifié en production** : `storage/app/private/post_photos/` contenait 4 fichiers réels, tandis que le volume monté sur `storage/app/selfies` était vide depuis le 25/05. Les fichiers vivaient donc dans la couche éphémère du conteneur (détruits au prochain rebuild), les photos d'annonces n'étaient dans **aucun** volume, et `backup.sh` archivait un répertoire vide **en signalant un succès**.

**Corrigé** : montage vers `app/private`, `backup.sh` archive `private` et compte les fichiers, `restore.sh` refuse les archives au format obsolète. Fichiers récupérés dans `/root/lostcards-rescue-20260730/` + archive dédiée. **Procédure de réinjection obligatoire au prochain déploiement** : voir `RUNBOOK-BACKUP.md` §0.1.

### F-08 — Moyenne — Bruteforce : pas de limite par compte, pas de MFA admin · CVSS 5.9
`routes/api.php:21` ; `AuthController.php:56-83`. `Auth::attempt()` sans limiteur par identifiant ; seul garde-fou throttle par IP, neutralisé par F-01. Compte `admin@lostcards.ci` prévisible, sans second facteur. Politique de mot de passe correcte (`min(8)->mixedCase()->numbers()`) mais sans `->uncompromised()`.
**Remédiation** : limiteur composite email+IP avec verrouillage progressif ; `->uncompromised()` ; MFA (TOTP) obligatoire pour `role=admin` ; renommer le compte admin.

### F-09 — Moyenne — Divergence des limites d'upload (50 Mo PHP/nginx vs 8 Mo appli) · CVSS 5.3
`Dockerfile:11` ; `nginx.conf:12` ; `PostController.php:78`. Le refus à 8 Mo n'intervient qu'**après** réception complète de jusqu'à 50 Mo. Sur serveur mono-thread sans throttle : épuisement bande passante / inodes `/tmp`. `memory_limit=256M` + décompression bombe GD (dimensions énormes, poids < 8 Mo) → fatal error.
**Remédiation** : `upload_max_filesize=10M`, `post_max_size=12M`, `client_max_body_size 12M` ; `dimensions:max_width=6000,max_height=6000` ; `throttle:10,1` sur les uploads.

### F-10 — Moyenne — Aucun rate limiting sur les endpoints coûteux ; amplification e-mail · CVSS 6.5
`routes/api.php:36-59` ; `AlertNotifier.php:22-63`. Le job de `POST /api/posts` charge **tous** les `AlertSubscription` puis **tous** les utilisateurs `status=chercheur` en mémoire, et notifie chaque nom dont un mot intersecte `name_on_cards` (mots ≥ 2 caractères).

*Scénario* : une annonce avec `name_on_cards = "KOUAME KONE TRAORE YAO KOFFI DIALLO BAMBA"` (150 c. autorisés) intersecte la quasi-totalité de la base → **mailing de masse déclenché par un tiers**, contenu partiellement contrôlé, envoyé depuis le domaine légitime : phishing par procuration + réputation SMTP brûlée. Répétable sans limite. Secondaires : `POST .../messages` (mail-bombing), `POST /api/alerts`, `POST /api/push/test`.

**Remédiation** : throttle par route (posts 5/h, contact 5/h, messages 30/min, alerts 10/h, push/test 3/h) ; borner les mots retenus par `extractWords` et le nombre de destinataires par annonce ; `chunkById` au lieu de `->get()` ; digest au lieu d'un mail par message.

### F-11 — Élevée — PII + selfie du réclamant révélés avant vérification · CVSS 6.5
`ContactRequestController.php:23-27` (`with('user:id,name,email,phone')`) et `:132-143`.

La protection est **unidirectionnelle** : dès qu'un citoyen soumet une demande, le propriétaire de l'annonce obtient **nom, e-mail, téléphone et selfie** — avant toute validation, sans garantie réciproque sur l'identité du « retrouveur ».

*Scénario* : un attaquant crée un compte (aucune vérification d'e-mail), publie de fausses annonces à partir de noms moissonnés (F-03), et **collecte des selfies faciaux + coordonnées** — jeu de données idéal pour usurpation d'identité, contournement de KYC ou sextorsion. Aucun coût, aucun plafond d'annonces par compte.

**Remédiation** : ne révéler `email`/`phone` qu'après approbation ; masquer partiellement le nom avant ; vérification d'e-mail (idéalement OTP SMS) avant de **publier** ; plafonner les annonces actives par compte ; filigraner les selfies affichés ; purger les selfies X jours après approbation/rejet (aujourd'hui conservés indéfiniment).

### F-12 — Moyenne — Tokens Sanctum sans expiration, en `localStorage`, non purgés · CVSS 6.5
`config/sanctum.php:10-11` ; `frontend/src/api/axios.js:9-16` ; `AuthController.php:52,81,85-93`.
`'expiration' => null` → token volé valide **éternellement** ; `'token_prefix' => ''` → pas de détection par les scanners de secrets ; chaque login crée un token sans révoquer les précédents, `logout` ne supprime que le courant, aucune purge planifiée. `localStorage` = accessible à tout XSS same-origin (F-05/F-06). *Point positif* : `resetPassword` révoque tous les tokens (`:177`).
**Remédiation** : `expiration => 60*24*7`, `token_prefix => 'lc_'`, planifier `sanctum:prune-expired --hours=24`, écran « sessions actives », à terme cookie `HttpOnly`+`SameSite=Strict` (Sanctum stateful est déjà configuré).

### F-13 — Faible — Énumération de comptes à l'inscription · CVSS 5.3
`AuthController.php:28` — `unique:users` renvoie une erreur explicite sur `email` → oracle d'existence, exploitable en masse via F-01. Sur une plateforme liée aux pièces d'identité, savoir qu'une personne est inscrite est déjà sensible.

### F-14 — Moyenne — Aucune vérification d'e-mail
`AuthController.php:35-53` (`email_verified_at` jamais renseigné), aucun middleware `verified`. Habilitant direct de F-10 et F-11.
**Remédiation** : `MustVerifyEmail` + `middleware('verified')` sur `POST /api/posts` et `POST /api/posts/{post}/contact`.

### F-15 — Faible — Énumération par canal temporel sur `/forgot-password` · CVSS 5.3
`AuthController.php:133-137` — réponse uniforme mais envoi SMTP **synchrone** : compte existant = latence de plusieurs centaines de ms, inexistant = réponse immédiate → oracle temporel fiable.
**Remédiation** : `Mail::to(...)->queue(...)` (le worker existe) ou délai constant.

### F-16 — Moyenne — Suppression de compte incomplète : rétention de données personnelles
`AuthController.php:212-235` ; `Admin/DashboardController.php:65-79`. Les lignes sont supprimées, **pas les fichiers** : selfies et photos restent sur disque et dans les sauvegardes, sans référence permettant de les retrouver. Enjeu de conformité : loi ivoirienne n° 2013-450 (droit à l'effacement, ARTCI) et RGPD si des ressortissants UE sont concernés.
**Remédiation** : supprimer les fichiers avant les lignes, dans une transaction ; commande `artisan lostcards:purge-orphan-files` de rattrapage ; politique de rétention documentée (selfies 30 j après clôture, annonces `recovered` 90 j, analytics 12 mois).

### F-17 — Faible — `secret_question` exposée publiquement (mécanisme mort) · CVSS 4.3
`Post.php:31` (absente de `$hidden`) ; `PostController.php:48` (no-op). Une question saisie librement peut contenir des informations personnelles (« Confirmez votre date de naissance ») lisibles par tous, et sert de guide de fraude.
**Remédiation** : ajouter à `$hidden`, supprimer la ligne 48, retirer de la validation puis les colonnes par migration.

### F-18 — Faible — `/api/analytics/track` : insertion non authentifiée, sans rétention, dépassement de colonne · CVSS 5.3
`AnalyticsController.php:21-38` ; migration `…000008:20` (`unsignedSmallInteger duration_seconds`). 120 insertions/min/IP × IP falsifiables = croissance illimitée (path et referrer libres, 500 c.) → saturation disque sur une **machine mutualisée**. La validation accepte `duration` jusqu'à `86400` alors que la colonne plafonne à 65 535 → erreur SQL 500 en mode strict.
**Remédiation** : `max:65535`, plafond quotidien par session, purge > 12 mois, outil de métrologie dédié.

### F-19 — Faible — `selfie_path` et IDs BIGINT internes exposés · CVSS 3.7
`ContactRequest.php:13` (`$hidden = ['id']` seulement) ; `Message.php` (aucun `$hidden`) ; `PushController.php:43`. Divulgation du chemin de stockage interne (non atteignable directement, mais inutile) et de la volumétrie de la messagerie.
**Remédiation** : `$hidden = ['id','selfie_path']` sur `ContactRequest`, `$hidden = ['id']` sur `Message`, booléen au lieu de l'`id` sur `push/subscribe`.

### F-20 — Moyenne — Photos de pièces publiques, non modérées, cache 30 j immutable · CVSS 5.3
`PostController.php:55-65` ; `PostPhoto::getUrlAttribute()`. L'UI demande des « photos floutées » (`PostCreate.jsx:159`) : rien ne le vérifie côté serveur. Une photo non floutée de CNI devient une ressource **publique, anonyme, non throttlée**, en cache `public, max-age=2592000, immutable` (encore servie après suppression de l'annonce) et indexable (F-24). Fichiers non supprimés au `DELETE` (F-16).
**Remédiation** : `Cache-Control: private, max-age=3600` ; modération admin (ou floutage automatique) avant publication ; suppression des fichiers ; `X-Robots-Tag: noindex, noimageindex`.

### F-21 — Moyenne — Accès admin aux messages privés sans traçabilité, aucun journal d'audit
`MessageController.php:51-61` ; `Admin/DashboardController.php`. Un admin lit toutes les conversations privées (`$isAdmin` court-circuite `authorizeAccess`) sans aucune trace ; `updateUser` (promotion admin) et `deleteUser` n'écrivent aucun journal. En cas d'abus ou de compromission du compte admin (F-08, sans MFA), l'investigation est impossible.
**Remédiation** : table `audit_logs` (acteur, action, cible, IP, horodatage) ; accès admin aux messages sur motif saisi (« break-glass ») ; notifier l'utilisateur concerné.

### F-22 — Faible — Détournement d'abonnement push par `endpoint` · CVSS 4.3
`PushController.php:33-41` — `updateOrCreate(['endpoint' => …], ['user_id' => …])`. L'`endpoint` étant la clé unique, un utilisateur authentifié connaissant celui d'un tiers se l'approprie → le navigateur de la victime reçoit les notifications de l'attaquant (injection de contenu sur un canal de confiance, deep-link contrôlé) et perd les siennes.
**Remédiation** : clé unique composite `(user_id, endpoint)` et `403` si l'endpoint appartient à un autre `user_id`.

### F-23 — Moyenne — Provisionnement admin silencieusement ignoré (garde de mass assignment)
`DatabaseSeeder.php:41` ; `User.php:20-24`. Le seeder passe `'role' => 'admin'` à `firstOrCreate()`, or `role` **n'est pas dans `$fillable`** : Laravel **écarte silencieusement** l'attribut et la colonne prend son défaut `'user'`. Un compte admin créé par `db:seed` n'aurait donc **pas** les droits, alors que le seeder affiche « Compte admin créé ».
*Vérifié en production le 30/07/2026* : `users.role = 'admin'` est bien positionné pour `admin@lostcards.ci` (promotion antérieure), le problème ne concerne donc que les installations neuves.
**Remédiation** : `$admin->forceFill(['role' => 'admin'])->save()` après le `firstOrCreate` (pattern déjà correct dans `AuthController.php:48`) ; activer `Model::preventSilentlyDiscardingAttributes(!app()->isProduction())`.
*Point positif vérifié* : `Admin\DashboardController::updateUser` valide `in:admin,user` avant le `forceFill` — aucun contournement du garde `role` ailleurs.

### F-24 — Faible — `X-Powered-By`, indexation de `/api/`, CORS `localhost` en prod · CVSS 3.7
`nginx.conf:20-27` ; `config/cors.php:6,11` ; `frontend/public/robots.txt`.
Mesuré en prod : HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `COOP`, `Permissions-Policy` bien présents **y compris sur `/api/`** — c'est ce qui limite F-06. Manquent : suppression de `X-Powered-By: PHP/8.3.31` (fingerprinting), `Cross-Origin-Resource-Policy`, `X-Robots-Tag` sur `/api/`. `robots.txt` interdit `/admin`, `/dashboard`, `/messages`, `/profile` mais **autorise `/posts/*` et `/api/*`** → noms figurant sur les pièces (décision produit assumée) **et photos de documents** (F-20) indexables et durablement archivés (cache Google, Wayback), même après clôture. Enfin `allowed_origins` conserve `http://localhost:3000` avec `supports_credentials: true` en production.
**Remédiation** : `expose_php = Off` / `proxy_hide_header X-Powered-By` ; `add_header X-Robots-Tag "noindex, nofollow, noimageindex" always;` dans `location /api/` + `Disallow: /api/` ; décider de l'indexabilité de `/posts/{uuid}` ; conditionner l'origine `localhost` à `APP_ENV !== 'production'` ; `Cross-Origin-Resource-Policy: same-site`.

### F-25 — Élevée — Laravel 11 en fin de support : 7 avis, dont 3 sans correctif en 11.x
`composer.json:8` (`"laravel/framework": "^11.0"`) ; **absence de `composer.lock`**.

| Avis | CVE | Sévérité | Versions affectées | Correctif |
|---|---|---|---|---|
| PKSA-3r5d-mb8f-1qw9 | GHSA-5vg9-5847-vvmq | **Haute — 8.9** | `< 12.60.0` (tout 11.x) | 12.60.0 — **aucun en 11.x** |
| PKSA-mdq4-51ck-6kdq | **CVE-2026-48019** | Haute (CRLF `email`) | `>= 11.0.0, < 12.0.0` | **aucun en 11.x** |
| PKSA-m5cs-t1y6-qpcs | GHSA-crmm-hgp2-wgrp | Moyenne | `< 12.61.1` (tout 11.x) | 12.61.1 — **aucun en 11.x** |
| PKSA-8qx3-n5y5-vvnd | **CVE-2025-27515** | Moyenne — 6.9 | `>= 11.0.0, < 11.44.1` | **11.44.1** |
| PKSA-w7xr-vk7n-rstm | **CVE-2024-52301** | Haute | `>= 11.0.0, < 11.31.0` | **11.31.0** |
| PKSA-qzrn-rnz3-85w1 | **CVE-2024-13918** | Moyenne | `>= 11.9.0, < 11.36.0` | **11.36.0** |
| PKSA-q46n-4fdk-zjr4 | **CVE-2024-13919** | Moyenne | `>= 11.9.0, < 11.36.0` | **11.36.0** |

Criticité réelle dans ce contexte :
- **CVE-2025-27515** — le plus critique ici : c'est exactement le motif `'photos.*' => 'image|max:8192'` (F-05). Corrigeable en restant en 11.x (≥ 11.44.1).
- **CVE-2024-52301** (manipulation d'environnement via query string) — normalement peu exploitable car requiert `register_argc_argv=On`, **or la prod tourne sous `php artisan serve`, donc en SAPI CLI où l'option est activée par défaut**. Un `?--env=…` suffit. **À traiter comme exploitable tant que le serveur applicatif est `artisan serve`.**
- **CVE-2024-13918 / 13919** (XSS réfléchi sur la page d'erreur en mode debug) — impact nul si `APP_DEBUG=false`, mais `backend/.env.example:4` porte `APP_DEBUG=true` : **à vérifier sur le `.env` de prod**.
- **CRLF dans la règle `email`** (CVSS 8.9) — `'email' => 'required|email'` est utilisé sur register/login/forgot/reset, et l'adresse est réutilisée dans `Mail::to($user->email)` sur 6 mailables : schéma précisément visé. **Aucun correctif en 11.x** → seule issue, la migration.

*Conséquence opérationnelle* : `Dockerfile:25` exécute `composer install --no-dev` **sans lock**. Avec la politique d'avis de Composer ≥ 2.10, **le prochain build échouera**, tout comme le job `backend` de la CI (dont le cache est keyé sur un `composer.lock` inexistant). La version déployée est **inconnue**, donc l'exposition à CVE-2025-27515 et CVE-2024-52301 n'est pas déterminable de l'extérieur.

**Remédiation, dans cet ordre** : (1) constater la version (`php artisan --version` dans le conteneur) ; (2) **migrer vers Laravel 12** (`^12.61.1`) — chemin court, l'application n'utilise aucune API exotique ; clôt les 7 avis et rétablit la capacité de build ; (3) **committer `composer.lock`** ; (4) ajouter `composer audit` bloquant en CI + `npm audit --omit=dev` ; (5) en secours : correctifs applicatifs de F-05 et abandon d'`artisan serve` (ou `register_argc_argv=Off`).

---

## 4. Vérification des correctifs annoncés

| Correctif | Statut | Preuve |
|---|---|---|
| IDOR `approve`/`reject` | **Corrigé, conforme** | `ContactRequestController.php:147-148` et `:180-181` : `abort_unless($contactRequest->post_id === $post->id, 404)` **puis** `abort_unless($request->user()->id === $post->user_id, 403)`. `selfie()` `:134-136` avec l'ordre inverse (403 avant 404), ce qui évite un oracle d'existence. |
| Throttle sur les routes d'auth | **Présent mais neutralisé** | `routes/api.php:20-23` — voir **F-01**. |
| 401 au lieu de 500 sur `?my=1` | **Corrigé, conforme** | `PostController.php:30` + rendu JSON `bootstrap/app.php:44-48`. |
| Deep-links push en UUID | **Corrigé, conforme** | `ContactRequestController.php:122,168,201`, `MessageController.php:115`, `AlertNotifier.php:38` — aucun `$post->id` résiduel dans une URL. |
| 15 `catch` vides loggés | **Corrigé, conforme** | Tous journalisent avec contexte. *Réserve* : les contextes contiennent `user_id`/`receiver_id` et l'exception complète — vérifier que `storage/logs` n'est pas exposé et appliquer une rétention. |
| Expiration des tokens de reset | **Déjà corrigé — la faille décrite n'existe plus** | `AuthController.php:156-166` : comparaison par instants absolus `$createdAt->lt(now()->subMinutes(60))`, aucun appel à `diffInMinutes`. Implémentation **insensible à la version de Carbon** (non vérifiable, `composer.lock` absent). Cas `created_at IS NULL` traité comme expiré. |
| `name_on_cards` / `name_partial` | **Décision produit assumée** | Seul le volet indexation est traité (F-24). |

---

## 5. Synthèse triée par sévérité

| # | Constat | Sévérité | CVSS |
|---|---|---|---|
| F-25 | Laravel 11 EOL : 7 avis, 3 sans correctif ; build cassé, pas de `composer.lock` | **Élevée** | 8.9 (amont) |
| F-01 | IP falsifiable → throttles d'auth contournables | **Élevée** | 7.5 |
| F-03 | Moissonnage PII de masse (`limit` non borné + téléphone public) | **Élevée** | 7.5 |
| F-04 | DoS applicatif (N+1 × `artisan serve` mono-thread) | **Élevée** | 7.5 |
| F-05 | Contournement validation upload → XSS same-origin → vol de token | **Élevée** | 7.3 |
| F-02 | IDOR : conversations partagées entre réclamants | **Élevée** | 7.1 |
| F-11 | PII + selfie du réclamant révélés avant vérification | **Élevée** | 6.5 |
| F-07 | Fichiers hors volume → perte de données + sauvegardes vides | **Élevée** | n/a — **corrigé** |
| F-10 | Aucun rate limiting ; amplification e-mail | Moyenne | 6.5 |
| F-12 | Tokens Sanctum sans expiration, `localStorage`, non purgés | Moyenne | 6.5 |
| F-08 | Bruteforce : pas de limite par compte, pas de MFA admin | Moyenne | 5.9 |
| F-06 | Upload SVG accepté par la règle `image` | Moyenne | 5.4 |
| F-09 | Divergence des limites d'upload | Moyenne | 5.3 |
| F-20 | Photos de pièces publiques, non modérées, cache 30 j | Moyenne | 5.3 |
| F-16 | Suppression de compte incomplète (fichiers conservés) | Moyenne | conformité |
| F-21 | Accès admin aux messages privés sans journal d'audit | Moyenne | traçabilité |
| F-14 | Aucune vérification d'e-mail | Moyenne | n/a |
| F-23 | Provisionnement admin silencieusement ignoré | Moyenne | n/a |
| F-13 | Énumération de comptes à l'inscription | Faible | 5.3 |
| F-15 | Énumération par timing sur `/forgot-password` | Faible | 5.3 |
| F-18 | Analytics : non authentifié, sans rétention, dépassement `SMALLINT` | Faible | 5.3 |
| F-17 | `secret_question` exposée publiquement | Faible | 4.3 |
| F-22 | Détournement d'abonnement push par `endpoint` | Faible | 4.3 |
| F-19 | `selfie_path` et IDs BIGINT internes exposés | Faible | 3.7 |
| F-24 | `X-Powered-By`, `/api/` indexable, CORS `localhost` en prod | Faible | 3.7 |

---

## 6. Plan d'action priorisé

**Sous 48 h (aucune migration requise)** — F-01 (`trustProxies` restreint + `X-Forwarded-For` écrasé au bord) · F-03 (`limit` borné, `phone` retiré du `with()`) · F-05/F-06 (`mimes` explicite, suppression du fallback de stockage, `Content-Type` forcé) · F-07 (**fait** — réinjecter les fichiers au déploiement, cf. runbook §0.1) · vérifier `APP_DEBUG=false` en prod.

**Sous 2 semaines** — F-02 (scoper les messages par demande approuvée) · F-25 (committer le lock, migrer Laravel 12, `composer audit` en CI, abandonner `artisan serve`) · F-10 (throttles par route + plafond de destinataires) · F-11/F-14 (vérification d'e-mail, PII après approbation) · F-12 (expiration des tokens + purge).

**Sous 1 mois** — F-08 (MFA admin, limiteur par compte) · F-16 (purge des fichiers + rétention documentée) · F-20 (modération des photos) · F-21 (journal d'audit) · F-24 (`noindex` sur `/api/`) · reliquats Faible.

---

## Sources

[Packagist security-advisories API — laravel/framework](https://packagist.org/api/security-advisories/?packages%5B%5D=laravel/framework) · [GHSA-78fx-h6xr-vch4 (CVE-2025-27515)](https://github.com/advisories/GHSA-78fx-h6xr-vch4) · [GHSA-5vg9-5847-vvmq (CRLF `email`)](https://github.com/advisories/GHSA-5vg9-5847-vvmq) · [laravel/framework security advisories](https://github.com/laravel/framework/security/advisories) · [ValidatesAttributes (branche 11.x)](https://raw.githubusercontent.com/laravel/framework/11.x/src/Illuminate/Validation/Concerns/ValidatesAttributes.php)

# Matrice de couverture de tests — API LostCards

Source de vérité : `backend/routes/api.php`. Dernière mise à jour : 2026-07-30.

Légende statut :
- **Couvert** : cas nominal + accès non authentifié + accès non autorisé + validation invalide, tous testés.
- **Partiel** : au moins le cas nominal est testé, mais un des axes ci-dessus manque (raison précisée).
- **Non couvert** : aucun test.
- **Bloqué** : test écrit mais ne peut pas s'exécuter dans cet environnement (raison précisée) ; comportement attendu tel que documenté depuis la lecture du code.

Aucun test n'a pu être **exécuté** au moment de la rédaction (voir section « Exécution » en fin de document) : la stack Docker était en cours de (re)construction par l'agent backend (compilation des extensions PHP + `composer install`) pendant toute la session. Les statuts ci-dessous reflètent donc une revue statique rigoureuse (cohérence avec le code réel : validation, codes HTTP, route model binding par `uuid`), pas une exécution verte.

## Auth (`AuthController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| POST | /register | - | champs requis manquants, email dupliqué, mot de passe hors règles de complexité, succès + token + id=uuid | `AuthTest.php` | Couvert |
| POST | /login | - | succès, mauvais mot de passe, email inconnu | `AuthTest.php` | Couvert |
| POST | /forgot-password | - | — | — | Non couvert |
| POST | /reset-password | - | token frais, token expiré (>60min), très vieux token, `created_at` null, token invalide | `AuthTest.php` | Partiel (nominal + erreurs ; pas de test sur le cas « aucun utilisateur » côté forgot-password qui alimente ce flux) |
| POST | /logout | auth:sanctum | non authentifié (401), révocation réelle du token (login réel → logout → token rejeté) | `AccountManagementTest.php` | Couvert |
| GET | /me | auth:sanctum | non authentifié (401), token invalide (401), succès via flux register/login réel | `AuthTest.php` | Couvert |
| PATCH | /me/status | auth:sanctum | non authentifié, validation (valeur hors enum), succès | `AccountManagementTest.php` | Couvert |
| DELETE | /me | auth:sanctum | non authentifié, mauvais mot de passe, mot de passe absent (validation), compte admin protégé (403), suppression + cascade (posts, contact_requests, alert_subscriptions, messages, tokens) | `AccountManagementTest.php` | Couvert |

## Posts (`PostController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /posts | - (401 applicatif si `?my=1` sans auth) | `my=1` sans auth → 401 (régression), `my=1` authentifié ne renvoie que ses annonces (y compris non-actives), listing public ne montre que `status=active`, filtre `name`, `limit`, pagination par défaut (12) | `PostVisibilityTest.php`, `PostShowAndSearchTest.php` | Couvert |
| GET | /posts/{post} | - | détail public, `secret_question` toujours exposé (`secret_answer` jamais), révélation de `pickup_address` (anonyme/refusé/en attente/approuvé/owner/admin — via IDOR tests), 404 uuid inconnu | `PostShowAndSearchTest.php`, `ContactRequestAuthorizationTest.php` | Couvert |
| GET | /posts/{post}/photos/{photo} | - | fichier servi publiquement, 404 si photo n'appartient pas au post, 404 si fichier absent du disque | `PostShowAndSearchTest.php` | Couvert |
| POST | /posts | auth:sanctum | non authentifié (401), validation champs requis, type de document invalide, création sans photo, création avec photos (upload + optimisation), >5 photos rejeté, retrait du flag `latent_at` | `PostCrudTest.php` | **Bloqué** uniquement pour `test_store_creates_post_with_photos_and_optimizes_them`, qui va jusqu'à l'exécution réelle de `ImageOptimizer::optimizeAndStore()` (fonctions **GD** : `imagecreatefromjpeg`, etc.), absente de l'image `php:8.3-cli` telle que provisionnée par `docker-compose.yml` (dev), qui n'installe que `pdo_mysql mbstring`. `test_store_rejects_more_than_five_photos` échoue en validation (`max:5`) *avant* d'atteindre `ImageOptimizer` et utilise `UploadedFile::fake()->create()` (mime deviné par extension, ne nécessite pas GD) : ce test-là est exécutable. Le reste du fichier est couvert et indépendant de GD. |
| PATCH | /posts/{post}/recover | auth:sanctum | non authentifié, owner, requester approuvé, requester en attente (refusé), stranger (403), admin, 404 uuid inconnu | `PostCrudTest.php` | Couvert |
| DELETE | /posts/{post} | auth:sanctum | non authentifié, owner, stranger (403), admin, 404 uuid inconnu | `PostCrudTest.php` | Couvert |

## Selfie / demandes de contact (`ContactRequestController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /posts/{post}/contact | auth:sanctum | owner voit toutes les demandes, non-owner ne voit que la sienne | `ContactRequestAuthorizationTest.php` | Couvert (le cas admin voyant toutes les demandes comme l'owner n'est pas testé explicitement) |
| GET | /me/contacts | auth:sanctum | — | — | Non couvert |
| POST | /posts/{post}/contact | auth:sanctum | non authentifié, selfie requis (validation), owner ne peut pas réclamer sa propre annonce (422), post déjà récupéré (422), 404 uuid inconnu, création (pending), doublon pending renvoyé tel quel (200, pas 201), doublon approved renvoyé tel quel (200), rejeté → nouvelle tentative (ancien selfie supprimé, nouvelle demande créée) | `ContactRequestStoreTest.php` | **Bloqué** uniquement pour les 2 tests qui vont jusqu'à l'exécution réelle de `ImageOptimizer::optimizeAndStore()` (GD) : `test_store_creates_a_pending_contact_request_with_selfie` et `test_rejected_request_can_be_retried_and_replaces_the_old_selfie` (ce dernier supprime l'ancien selfie puis retombe dans le chemin de création). Les autres — y compris les 2 tests de doublon (`already_pending`/`already_approved`), qui `return`nt *avant* d'appeler `ImageOptimizer` — utilisent `UploadedFile::fake()->create()` (mime deviné par extension) et sont indépendants de GD, donc exécutables. |
| PATCH | /posts/{post}/contact/{contactRequest}/approve | auth:sanctum | owner, stranger (403 — IDOR), requester lui-même (403), 404 si contactRequest n'appartient pas au post, non authentifié (401) | `ContactRequestAuthorizationTest.php` | Couvert |
| PATCH | /posts/{post}/contact/{contactRequest}/reject | auth:sanctum | owner, stranger (403 — IDOR) | `ContactRequestAuthorizationTest.php` | Couvert |
| GET | /posts/{post}/contact/{contactRequest}/selfie | auth:sanctum | stranger refusé (403), owner peut voir si le fichier existe | `ContactRequestAuthorizationTest.php` | Partiel (pas de test sur le 404 « selfie_path vide » ni « fichier référencé mais absent du disque » pour cet endpoint précis, contrairement à `photo()`) |

## Messages (`MessageController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /conversations | auth:sanctum | — | — | Non couvert |
| GET | /conversations/{post}/messages | auth:sanctum | non authentifié, stranger (403), requester en attente refusé (403), owner, requester approuvé, marquage lu | `MessageAuthorizationTest.php` | Couvert (le marquage `read_at` n'est pas explicitement asserté en base, seul l'accès l'est) |
| POST | /conversations/{post}/messages | auth:sanctum | stranger (403), requester en attente refusé (403), requester approuvé peut poster, owner peut poster une fois approuvé, owner ne peut pas poster sans demande approuvée (422) | `MessageAuthorizationTest.php` | Couvert |

## Alertes (`AlertSubscriptionController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /alerts | auth:sanctum | non authentifié, ne renvoie que les alertes de l'utilisateur courant | `AlertSubscriptionTest.php` | Couvert |
| POST | /alerts | auth:sanctum | non authentifié, validation nom requis, création, idempotence (`firstOrCreate`, pas de doublon) | `AlertSubscriptionTest.php` | Couvert |
| DELETE | /alerts/{uuid} | auth:sanctum | non authentifié, owner peut supprimer, stranger ne peut pas supprimer l'alerte d'un autre (404 — IDOR), 404 uuid inconnu | `AlertSubscriptionTest.php` | Couvert |

## Push (`PushController`) — hors périmètre prioritaire, ajouté pour l'exhaustivité

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /push/public-key | - | endpoint public, structure | `PushSubscriptionTest.php` | Couvert |
| POST | /push/subscribe | auth:sanctum | non authentifié, validation, création, upsert par `endpoint` (pas de doublon) | `PushSubscriptionTest.php` | Couvert |
| POST | /push/unsubscribe | auth:sanctum | non authentifié, suppression de sa propre subscription, ne supprime pas celle d'un autre (IDOR) | `PushSubscriptionTest.php` | Couvert |
| POST | /push/test | auth:sanctum | non authentifié, `sent=0` sans subscription | `PushSubscriptionTest.php` | Partiel (le cas avec une vraie subscription et un envoi WebPush effectif n'est pas testé — nécessiterait de mocker `Minishlink\WebPush\WebPush`, hors périmètre de cette passe) |

## Analytics (`AnalyticsController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| POST | /analytics/track | throttle:120,1 | pas d'authentification requise, validation champs requis, borne `duration` (max 86400), classification de `source` (organic via referrer Google), les bots/crawlers sont ignorés (aucune ligne créée) | `AnalyticsTrackTest.php` | Partiel (le throttle lui-même — dépassement de 120 req/min — n'est pas testé, jugé hors valeur ajoutée pour un test unitaire rapide) |
| GET | /admin/analytics | auth:sanctum + admin | non-admin refusé (403), non authentifié (401), admin peut lire, structure de la réponse | `AdminDashboardTest.php` | Couvert |

## Admin (`Admin\DashboardController`)

| Méthode | URI | Middleware | Scénarios couverts | Fichier de test | Statut |
|---|---|---|---|---|---|
| GET | /admin/stats | auth:sanctum + admin | non authentifié (401), non-admin (403), admin (200 + valeurs correctes) | `AdminDashboardTest.php` | Couvert |
| GET | /admin/posts | auth:sanctum + admin | non authentifié, non-admin, admin voit toutes les annonces (actives et récupérées) | `AdminDashboardTest.php` | Couvert |
| GET | /admin/users | auth:sanctum + admin | non authentifié, non-admin, recherche `q`, compteurs relationnels (`posts_count`, etc.) | `AdminDashboardTest.php` | Couvert |
| PATCH | /admin/users/{user} | auth:sanctum + admin | non authentifié, non-admin (403, aucune modification), promotion `role`, changement `status`, validation enum invalide, 404 uuid inconnu | `AdminDashboardTest.php` | Couvert |
| DELETE | /admin/users/{user} | auth:sanctum + admin | non authentifié, non-admin (403), suppression d'un admin refusée (403), suppression d'un utilisateur normal + cascade | `AdminDashboardTest.php` | Couvert |

## Récapitulatif des non-couverts / bloqués

**Non couverts (aucun test)** :
- `POST /forgot-password` — le flux de reset est testé en aval (`reset-password`), mais l'émission de l'email (utilisateur existant / inexistant, réponse 200 dans les deux cas pour ne pas fuiter l'existence du compte) n'est pas testée.
- `GET /me/contacts` — dashboard « mes demandes en cours » du chercheur.
- `GET /conversations` — liste des conversations avec dernier message et compteur de non-lus.

Ces trois endpoints n'ont pas pu être ajoutés dans le temps imparti de cette passe ; ils sont recommandés en prochaine itération (logique non triviale à couvrir, notamment `myContacts()` et `conversations()` qui agrègent plusieurs relations).

**Bloqués par l'environnement (extension GD absente)** — uniquement les tests qui vont réellement jusqu'à `ImageOptimizer::optimizeAndStore()` :
- `PostCrudTest::test_store_creates_post_with_photos_and_optimizes_them`
- `ContactRequestStoreTest::test_store_creates_a_pending_contact_request_with_selfie`
- `ContactRequestStoreTest::test_rejected_request_can_be_retried_and_replaces_the_old_selfie`

Tous les autres tests de ces deux fichiers — y compris ceux qui envoient un fichier (validation, doublons pending/approved qui `return`nt avant d'appeler `ImageOptimizer`) — utilisent délibérément `UploadedFile::fake()->create()` (mime deviné par extension, ne nécessite pas GD) plutôt que `->image()` (qui, selon la documentation Laravel, nécessite l'extension GD pour générer une image valide), et sont donc indépendants de cette limite d'environnement.

Ces 3 tests bloqués sont écrits et raisonnés sur le code réel (`ImageOptimizer::optimizeAndStore()`), mais `imagecreatefromjpeg()`/`imagecreatefrompng()`/etc. sont des fonctions de l'extension **gd**, non chargée dans le conteneur tel qu'il est provisionné actuellement par `docker-compose.yml` (dev) — celui-ci n'installe que `pdo_mysql mbstring` au démarrage (`docker-php-ext-install pdo_mysql mbstring`). Le `backend/Dockerfile` de prod, lui, installe bien `gd` et `exif`. Cette divergence dev/prod est une découverte de cette mission, à signaler à l'agent backend (aucune modification faite ici, conformément au périmètre).

## Exécution

Commande d'exécution prévue (image `php:8.3-cli` du `docker-compose.yml` de dev, une fois la stack montée) :

```
docker compose exec -T backend php artisan test
```

Au moment de la rédaction de ce rapport, le conteneur `backend` était en cours de (re)construction par l'agent backend en parallèle (compilation depuis les sources de `pdo_mysql`/`mbstring` puis `composer install`) : `vendor/` n'existait pas encore, donc **aucune exécution n'a été possible**. Points vérifiés statiquement pendant l'attente :
- `pdo_sqlite` **est** disponible dans l'image `php:8.3-cli` de base (`php -m` le confirme), contrairement à l'hypothèse initiale de la mission — donc `phpunit.xml` (SQLite in-memory) devrait fonctionner une fois `vendor/` installé.
- `gd` et `exif` ne sont **pas** installés dans le conteneur du `docker-compose.yml` de dev (seuls `pdo_mysql`, `mbstring` le sont), d'où le blocage documenté ci-dessus pour les endpoints d'upload d'image.

Si la stack est prête dans une itération ultérieure, relancer cette commande et mettre à jour les statuts « Bloqué » ci-dessus en fonction du résultat réel.

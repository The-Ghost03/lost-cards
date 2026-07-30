# LostCards 🔑

> **Plateforme citoyenne de recouvrement de portefeuilles & pièces d'identité perdus à Abidjan, Côte d'Ivoire.**
> Quand quelqu'un trouve un portefeuille, il publie une annonce. Le propriétaire cherche son nom, prouve son identité par selfie, et entre en contact via une messagerie sécurisée.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Laravel](https://img.shields.io/badge/Laravel-11-FF2D20?logo=laravel&logoColor=white)](https://laravel.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![PWA](https://img.shields.io/badge/PWA-mobile--first-5A0FC8)](https://web.dev/progressive-web-apps/)

🌐 **Production** — [lost-card.softskills.ci](https://lost-card.softskills.ci)

---

## ✨ Fonctionnalités

### Pour les chercheurs (proprios)
- 🔍 Recherche par nom partiel sur les pièces
- 🔔 Alertes email automatiques si un portefeuille correspondant est publié
- 📸 Réclamation d'une annonce via **selfie** (comparé visuellement à la photo de la pièce)
- 💬 Messagerie chiffrée après validation par le retrouveur
- 🔁 Bascule libre vers le mode Retrouveur

### Pour les retrouveurs
- 📢 Publication rapide d'une annonce (nom partiel, commune, documents, adresse de récupération)
- ✅ Validation/refus du selfie d'un demandeur
- 💬 Chat 1-1 sécurisé
- 📦 Marquage "récupéré" pour archiver l'annonce
- 📊 Tableau de bord avec compteurs (actives / récupérées)

### Plateforme
- 🌓 **Dark mode** complet avec toggle persistant
- 📱 **PWA mobile-first** installable, gestes natifs
- ⚡ **Squelettes & spinners** sur toutes les actions asynchrones
- 🔐 Tokens **Sanctum** (Bearer), pas de session cookie
- 📧 Notifications email (selfie reçu, contact approuvé/refusé, nouveau message, alerte)

### Administration
- 🛡️ **Tableau de bord admin** (`/admin`) avec 4 onglets : Statistiques, Analytiques, Annonces, Utilisateurs
- 📊 **Statistiques globales** — annonces actives/récupérées, comptes par rôle, engagement (vérifications, messages, alertes)
- 📈 **Analytiques temps réel** (custom, sans service tiers) — voir [Analytiques](#-analytiques)
- 👥 **Gestion utilisateurs** — recherche, promotion admin, suppression en cascade, **détection appareil/OS/navigateur** sur chaque compte
- 📋 **Gestion annonces** — vue admin sur n'importe quelle annonce : voir les messages, voir les demandes de contact, supprimer (l'admin ne peut pas approuver de selfie ni envoyer de message)

---

## 📊 Analytiques

Module d'analytics **maison** intégré au backend Laravel — pas de Google Analytics, pas de dépendance externe, RGPD-friendly (aucun PII, juste un session ID anonyme stocké en `sessionStorage`).

**KPIs** sur 7/30/90 jours :
- 👁 Pages vues totales · 👤 Visiteurs uniques · ⏱ Durée moyenne · ↩ Taux de rebond

**Visualisations** :
- 📈 Sparkline SVG inline (pages vues + visiteurs sur la période)
- 🏆 Top 10 des pages les plus visitées
- 🌐 Sources de trafic catégorisées : 🔗 Direct / 🔍 Recherche organique (Google, Bing…) / 📱 Réseaux sociaux (Facebook, WhatsApp…) / 🌐 Sites référents
- 📱 Répartition appareils (Mobile / Desktop / Tablette) + OS (iOS / Android / Windows / macOS / Linux)

**Tracking** : hook `usePageTracking` côté React, throttle 120 req/min, filtre bots côté backend (Googlebot, Bingbot, etc.).

---

## 🧱 Stack technique

| Couche | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 3.4, React Router 6, lucide-react, date-fns, react-hot-toast |
| Backend | Laravel 11, Sanctum, Eloquent, Mail |
| DB | MySQL 8 |
| Infra | Docker Compose (dev & prod), Nginx (reverse proxy + static), php-cli (serve) |
| Hébergement | VPS Contabo Ubuntu 24.04 |

---

## 🚀 Lancement rapide (Docker)

### Développement local

```bash
git clone git@github.com:The-Ghost03/lost-cards.git
cd lost-cards
docker compose up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000      |
| API       | http://localhost:8000/api  |
| Mailpit   | http://localhost:8025      |

**Comptes seedés** :

Aucun mot de passe n'est embarqué dans le code. Le seeder provisionne les comptes uniquement si les variables d'environnement correspondantes sont définies (dans `backend/.env` ou l'environnement du conteneur) :

| Rôle  | Email              | Variable d'environnement |
|-------|--------------------|--------------------------|
| Admin | admin@lostcards.ci | `SEED_ADMIN_PASSWORD`    |
| Demo  | demo@lostcards.ci  | `SEED_DEMO_PASSWORD` (ignoré en production) |

Si la variable est absente, le compte n'est ni créé ni modifié. Le seeder n'écrase jamais le mot de passe d'un compte existant.

### Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Le `docker-compose.prod.yml` build un bundle Vite figé servi par Nginx (couche statique + proxy `/api → backend:8000`).

---

## 🔧 Installation manuelle

### Prérequis
- PHP 8.2+ (`pdo_mysql`, `mbstring`, `openssl`, `gd` ou `imagick`)
- Composer 2
- Node 20+ (24 recommandé)
- MySQL 8

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Renseigner DB_* + MAIL_* dans .env
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
npm run build # production → dist/
```

---

## 🗺 Architecture API

### Public
```
POST   /api/register
POST   /api/login
POST   /api/forgot-password
POST   /api/reset-password
GET    /api/posts                      # Recherche ?name=… ou récents
GET    /api/posts/:id
POST   /api/analytics/track            # Tracking page (throttled)
```

### Authentifié (Sanctum Bearer)
```
GET    /api/me
PATCH  /api/me/status                  # Bascule chercheur/retrouveur
DELETE /api/me                         # Suppression compte (password requis)
POST   /api/logout

POST   /api/posts                      # Créer annonce
PATCH  /api/posts/:id/recover          # Marquer récupéré
DELETE /api/posts/:id                  # Supprimer (owner ou admin)

GET    /api/posts/:id/contact          # Liste demandes
POST   /api/posts/:id/contact          # Selfie + créer demande
GET    /api/posts/:id/contact/:rid/selfie
PATCH  /api/posts/:id/contact/:rid/approve
PATCH  /api/posts/:id/contact/:rid/reject

GET    /api/conversations
GET    /api/conversations/:postId/messages
POST   /api/conversations/:postId/messages

GET    /api/alerts
POST   /api/alerts
DELETE /api/alerts/:id
```

### Admin (rôle `admin`)
```
GET    /api/admin/stats                # Compteurs globaux
GET    /api/admin/posts
GET    /api/admin/users                # Avec device_type, device_os, last_login_at, last_ip
PATCH  /api/admin/users/:id            # Toggle rôle
DELETE /api/admin/users/:id            # Cascade supprime annonces, messages, alertes
GET    /api/admin/analytics?days=7|30|90
```

---

## 🌳 Structure du projet

```
lost-cards/
├── backend/                      # Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── PostController.php
│   │   │   ├── ContactRequestController.php
│   │   │   ├── MessageController.php
│   │   │   ├── AlertSubscriptionController.php
│   │   │   ├── AnalyticsController.php
│   │   │   └── Admin/DashboardController.php
│   │   ├── Mail/                 # NewMessageNotification, etc.
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
│
├── frontend/                     # React 19 + Vite
│   ├── src/
│   │   ├── api/                  # axios instance + endpoints
│   │   ├── components/           # Navbar, ProtectedRoute, ConfirmDialog,
│   │   │                         # SelfieCapture, Spinner, ThemeToggle
│   │   ├── context/              # Auth, Theme, Unread, Confirm
│   │   ├── lib/                  # toast, useAsyncAction, usePageTracking
│   │   ├── pages/
│   │   │   ├── Home, Login, Register, ForgotPassword, ResetPassword
│   │   │   ├── PostCreate, PostDetail
│   │   │   ├── Messages, Chat
│   │   │   ├── Dashboard, Alerts, Profile
│   │   │   └── admin/Dashboard.jsx
│   │   └── App.jsx
│   ├── public/                   # PWA manifest, icons, sw.js
│   ├── nginx.conf                # Reverse proxy /api → backend
│   └── Dockerfile
│
├── docker-compose.yml            # Dev (hot-reload, volume mount)
└── docker-compose.prod.yml       # Prod (multi-stage build)
```

---

## 🔐 Sécurité & vie privée

- **Hash bcrypt** (Laravel default) pour les mots de passe
- **Tokens Sanctum** révoqués au logout et à la suppression de compte
- **Selfies** stockés en disque local non-public (`storage/app/selfies`), accessibles uniquement au propriétaire de l'annonce via endpoint authentifié
- **Nom sur les pièces : affiché publiquement** — choix produit assumé, pour qu'un propriétaire
  reconnaisse sans ambiguïté son nom dans la liste des annonces. Le champ `name_partial`
  contient donc la même valeur que `name_on_cards` (aucune troncature), et les deux sont
  lisibles par tout visiteur, y compris non authentifié.
  *Conséquence à garder en tête : ces noms sont dans les pages indexables par les moteurs
  de recherche (sitemap + JSON-LD).*
- **Adresse de récupération** masquée jusqu'à approbation explicite du selfie
- **Throttle** sur `/api/analytics/track` (120 req/min) et bots filtrés
- **CORS** restrictif sur le domaine production
- **HTTPS** géré au niveau du reverse proxy (Caddy/Nginx hôte) avec certificat Let's Encrypt
- **Analytics anonymes** — session ID aléatoire en `sessionStorage`, aucun cookie, aucun PII

---

## 🚢 Déploiement (VPS)

```bash
# Sur le VPS, à la racine du projet
git pull origin main
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend
docker exec lostcards-backend-1 php artisan migrate --force
```

Le frontend est buildé en multi-stage (Node → Nginx alpine) et exposé sur le port `8083` que le reverse proxy hôte route vers `https://lost-card.softskills.ci`.

---

## 🧪 Tests rapides

```bash
# Backend
cd backend && php artisan test

# Frontend
cd frontend && npm run lint
```

---

## 🤝 Contribution

1. Fork le repo
2. Crée une branche `feat/ma-feature` ou `fix/mon-bug`
3. Commit avec un message clair (français ou anglais OK)
4. Pull request vers `main`

Style : Tailwind utility-first, composants fonctionnels uniquement, hooks pour la logique. Suivre les conventions Laravel sur le backend.

---

## 📄 Licence

Code propriétaire — © SoftSkills CI 2025. Tous droits réservés.

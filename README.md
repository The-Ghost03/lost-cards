<div align="center">

<img src="frontend/public/logo.png" alt="LostCards Logo" width="80" height="80" />

# LostCards

**Plateforme de recouvrement de portefeuilles et pièces d'identité perdus à Abidjan, Côte d'Ivoire.**

[![Live](https://img.shields.io/badge/Live-lost--card.softskills.ci-orange?style=flat-square&logo=vercel)](https://lost-card.softskills.ci)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Laravel](https://img.shields.io/badge/Laravel-11-FF2D20?style=flat-square&logo=laravel)](https://laravel.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)](https://docker.com)

</div>

---

## 🎯 Concept

Quelqu'un a trouvé un portefeuille contenant des pièces d'identité à Abidjan ? Il publie une annonce sur LostCards. Le propriétaire recherche son nom, prouve son identité par **selfie**, et récupère ses documents.

Tout le processus se fait de façon sécurisée : l'adresse de remise n'est révélée qu'après validation, et une messagerie intégrée permet d'organiser la récupération.

---

## ✨ Fonctionnalités

### Pour le retrouveur
- 📢 Publier une annonce avec le nom partiel, la commune et les documents trouvés
- 📸 Recevoir et comparer le selfie du réclamant avec les pièces trouvées
- ✅ Approuver ou refuser les demandes de contact
- 💬 Messagerie sécurisée avec le propriétaire validé (disponible dès la demande en attente)
- ✔️ Marquer le portefeuille comme récupéré pour archiver l'annonce
- 📊 Dashboard personnel avec statistiques

### Pour le chercheur (propriétaire)
- 🔍 Recherche par nom parmi toutes les annonces actives
- 🔔 Alertes email automatiques si un portefeuille correspondant est signalé
- 🤳 Envoi de selfie pour vérification d'identité
- 💬 Chat avec le retrouveur dès l'envoi du selfie
- 📍 Accès à l'adresse de remise après approbation

### Plateforme
- 🛡️ **Vérification par selfie** — comparaison visuelle avant de révéler l'adresse
- 🔐 **Auth sécurisée** — Laravel Sanctum (Bearer token)
- 📱 **PWA mobile-first** — installable sur Android/iOS, icônes, splash screen
- 🔎 **SEO complet** — meta OpenGraph, Twitter Cards, JSON-LD, sitemap.xml, robots.txt
- 📧 **Emails transactionnels** — alertes et notifications via SMTP
- 🛠️ **Admin panel** — modération des annonces et statistiques
- ⚡ **UX soignée** — spinners, skeleton loaders, feedback en temps réel, confirm dialogs

---

## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 19 · Vite · Tailwind CSS · React Router · Axios |
| **UI / UX** | Lucide Icons · react-hot-toast · date-fns · react-helmet-async |
| **Backend** | Laravel 11 · PHP 8.2 · Sanctum · Laravel Mail |
| **Base de données** | MySQL 8 |
| **Infrastructure** | Docker · Nginx · VPS (Debian) |
| **Dev tools** | Mailpit (test emails) |

---

## 🚀 Lancer le projet

### Avec Docker (recommandé)

```bash
git clone https://github.com/The-Ghost03/lost-cards.git
cd lost-cards
docker compose up --build
```

| Service   | URL                       |
|-----------|---------------------------|
| Frontend  | http://localhost:3000     |
| API       | http://localhost:8000/api |
| Mailpit   | http://localhost:8025     |

**Comptes de démonstration (seeder) :**

| Rôle        | Email              | Mot de passe |
|-------------|---------------------|--------------|
| Admin       | admin@lostcards.ci  | Admin@1234   |
| Démo        | demo@lostcards.ci   | Demo@1234    |

---

### Installation manuelle

#### Prérequis
- PHP 8.2+ (`pdo_mysql`, `mbstring`, `openssl`, `gd`)
- Composer
- Node 20+
- MySQL 8

#### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configurer .env :
#   DB_DATABASE, DB_USERNAME, DB_PASSWORD
#   MAIL_* (SMTP ou Mailpit)
#   FRONTEND_URL=http://localhost:3000

php artisan migrate --seed
php artisan serve
```

#### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## 🗂️ Architecture API

```
POST   /api/register
POST   /api/login
POST   /api/logout
GET    /api/me

GET    /api/posts                         # Liste + recherche ?name= + ?my=1
POST   /api/posts                         # Créer une annonce (auth · retrouveur)
GET    /api/posts/:id                     # Détail (pickup_address masquée si non autorisé)
PATCH  /api/posts/:id/recover             # Marquer récupéré
DELETE /api/posts/:id                     # Supprimer

POST   /api/posts/:id/contact             # Envoyer selfie (multipart)
GET    /api/posts/:id/contact             # Lister demandes reçues
GET    /api/posts/:id/contact/:cid/selfie # Télécharger le selfie (owner only)
PATCH  /api/posts/:id/contact/:cid/approve
PATCH  /api/posts/:id/contact/:cid/reject

GET    /api/conversations                 # Mes conversations actives
GET    /api/posts/:id/messages            # Messages d'un fil (owner + requester pending/approved)
POST   /api/posts/:id/messages            # Envoyer un message

GET    /api/alerts                        # Mes alertes email
POST   /api/alerts
DELETE /api/alerts/:id

GET    /api/admin/stats                   # Admin only
GET    /api/admin/posts
```

---

## 📁 Structure du projet

```
lost-cards/
├── backend/                  # Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/ # PostController, MessageController, AlertController…
│   │   ├── Models/           # User, Post, ContactRequest, Message, Alert
│   │   └── Notifications/    # AlertNotification (email)
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── routes/api.php
│
├── frontend/                 # React 19 + Vite
│   ├── src/
│   │   ├── api/              # posts.js, messages.js, alerts.js
│   │   ├── components/       # Navbar, PostCard, SelfieCapture, LogoIcon, Spinner, SEO…
│   │   ├── context/          # AuthContext, UnreadContext
│   │   ├── lib/              # useAsyncAction, toast
│   │   └── pages/            # Home, Login, Register, PostDetail, PostCreate,
│   │                         # Dashboard, Chat, Messages, Alerts, Profile, Admin
│   ├── public/               # robots.txt, sitemap.xml, PWA icons
│   └── Dockerfile            # Multi-stage : Node build → Nginx serve
│
├── docker-compose.yml        # Dev (volumes + hot-reload)
└── docker-compose.prod.yml   # Prod (build + Nginx)
```

---

## 🔐 Sécurité & vie privée

- Les selfies sont stockés en dehors du dossier public et accessibles uniquement au retrouveur concerné
- L'adresse de récupération (`pickup_address`) n'est jamais renvoyée par l'API à un utilisateur non autorisé (uniquement owner et chercheur approuvé)
- Les messages sont filtrés par paire (owner ↔ requester) — aucun accès aux conversations d'autrui
- Tokens Sanctum révoqués à la déconnexion

---

## 🌍 Déploiement production

Le site tourne sur un VPS Debian avec Docker :

```bash
# Build l'image de production (multi-stage)
docker compose -f docker-compose.prod.yml build frontend

# Relancer le conteneur
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend
```

Le frontend est servi par **Nginx** (port 8083) derrière un reverse proxy.  
Le backend Laravel tourne en PHP-FPM exposé sur le port 8000.

---

## 📸 Aperçu

| | |
|---|---|
| Recherche d'annonces | Dashboard retrouveur |
| Vérification par selfie | Chat sécurisé |

> 🔗 Voir la version live : **[lost-card.softskills.ci](https://lost-card.softskills.ci)**

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration :

1. Fork le repo
2. Crée une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m "feat: ma feature"`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvre une Pull Request

---

## 📄 Licence

MIT © 2025 [The-Ghost03](https://github.com/The-Ghost03)

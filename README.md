# LostCards 🔑

> Plateforme de recouvrement de portefeuilles et pièces perdus à Abidjan, Côte d'Ivoire.

## Stack
- **Frontend** — React 18 + Vite + Tailwind CSS
- **Backend** — Laravel 11 API REST + Sanctum
- **Base de données** — MySQL 8
- **Emails** — Laravel Mail (Mailpit en dev)

---

## Lancer avec Docker (recommandé)

```bash
docker compose up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000      |
| API       | http://localhost:8000/api  |
| Mailpit   | http://localhost:8025      |

**Comptes créés par le seeder :**

| Rôle  | Email                | Mot de passe |
|-------|----------------------|--------------|
| Admin | admin@lostcards.ci   | Admin@1234   |
| Demo  | demo@lostcards.ci    | Demo@1234    |

---

## Installation manuelle

### Prérequis
- PHP 8.2+ avec extensions : `pdo_mysql`, `mbstring`, `openssl`
- Composer
- Node 18+
- MySQL 8

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Configurer .env (DB_*)
php artisan migrate --seed
php artisan serve
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Fonctionnalités MVP

- 📢 **Signalement** — le retrouveur publie un portefeuille trouvé avec les infos partielles
- 🔍 **Recherche** — le propriétaire cherche son nom parmi les annonces
- 🔐 **Vérification** — question secrète pour confirmer l'identité du propriétaire
- 💬 **Chat interne** — messagerie sécurisée après validation
- 🔔 **Alertes email** — notification automatique si un portefeuille correspond
- ✅ **Archivage** — le post disparaît une fois récupéré
- 🛡️ **Admin** — modération des annonces et statistiques

---

## Architecture API

```
POST   /api/register
POST   /api/login
POST   /api/logout
GET    /api/me

GET    /api/posts              # Liste + recherche par ?name=
POST   /api/posts              # Créer une annonce (auth)
GET    /api/posts/:id          # Détail
PATCH  /api/posts/:id/recover  # Marquer récupéré
DELETE /api/posts/:id          # Supprimer

POST   /api/posts/:id/contact           # Envoyer demande de contact
GET    /api/posts/:id/contact           # Lister demandes
PATCH  /api/posts/:id/contact/:id/approve

GET    /api/conversations               # Mes conversations
GET    /api/conversations/:postId/messages
POST   /api/conversations/:postId/messages

GET    /api/alerts             # Mes alertes
POST   /api/alerts
DELETE /api/alerts/:id

GET    /api/admin/stats        # (admin only)
GET    /api/admin/posts
```

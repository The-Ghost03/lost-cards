# RUNBOOK — Sauvegardes et restauration LostCards

Périmètre : base MySQL (volume `db_data`) + photos/selfies (volume `selfies`)
de la stack de production (`docker-compose.prod.yml`).

Scripts : `scripts/backup.sh` et `scripts/restore.sh` (bash, à exécuter **sur le VPS**).

---

## 0. État réellement installé en production (30/07/2026)

La sauvegarde est **déjà active**, mais installée hors du dépôt pour ne pas gêner
`git pull` (un fichier non suivi que le merge voudrait écraser fait échouer le pull) :

| Élément | Emplacement réel |
|---|---|
| Serveur | hôte SSH `vps` (⚠ ce n'est **pas** `softskills`, malgré le domaine `lost-card.softskills.ci`) |
| Dépôt | `/root/LostCards` (et non `/opt/lostcards` utilisé en exemple ci-dessous) |
| Script de backup | `/root/lostcards-backup.sh` (copie autonome, `PROJECT_DIR` par défaut = `/root/LostCards`) |
| Destination | `/var/backups/lostcards` (mode 700, archives en 600) |
| Cron root | `15 3 * * *` → sortie envoyée à syslog avec le tag `lostcards-backup` |
| Sauvegarde de la crontab d'origine | `/root/crontab.bak.20260730` |

Premier test de sauvegarde validé le 30/07/2026 : dump de 32 Ko (16 tables,
marqueur `Dump completed` présent), archive selfies vide car aucun selfie n'existe
encore en base.

**Consulter les exécutions du cron :**

```bash
journalctl -t lostcards-backup --since '2 days ago'
```

**Une fois `scripts/backup.sh` déployé via git**, basculer le cron sur la version
du dépôt (source unique) et supprimer la copie autonome :

```bash
crontab -l | sed 's#/root/lostcards-backup.sh#/root/LostCards/scripts/backup.sh#' | crontab -
rm /root/lostcards-backup.sh
```

⚠️ **Sauvegarde hors-site : toujours manquante.** Les archives sont sur le même
disque que la base — une panne du VPS reste une perte totale. Voir §4.

---

## 1. Ce qui est sauvegardé

| Donnée | Source | Format produit |
|---|---|---|
| Base MySQL | `mysqldump` dans le conteneur `db` (`--single-transaction`, routines, triggers) | `db_YYYYMMDD_HHMMSS.sql.gz` |
| Selfies | tar du dossier `/var/www/storage/app/selfies` via le conteneur `backend` | `selfies_YYYYMMDD_HHMMSS.tar.gz` |

- Le mot de passe MySQL n'apparaît **jamais** sur l'hôte : il est lu depuis
  l'environnement du conteneur (`MYSQL_ROOT_PASSWORD`).
- Chaque dump est vérifié (intégrité gzip + marqueur `Dump completed`) avant
  d'être considéré valide.
- Rotation automatique : les fichiers de plus de `RETENTION_DAYS` jours
  (défaut **14**) sont supprimés.

## 2. Installation sur le VPS

> Convention projet : confirmer le serveur cible avant toute action —
> ces commandes sont à exécuter sur le VPS de **production** LostCards uniquement.

```bash
# 1. Rendre les scripts exécutables (une fois, après git pull)
chmod +x /opt/lostcards/scripts/backup.sh /opt/lostcards/scripts/restore.sh
# (adapter /opt/lostcards au chemin réel du dépôt sur le VPS)

# 2. Créer le répertoire de destination
sudo mkdir -p /var/backups/lostcards
sudo chown root:root /var/backups/lostcards
sudo chmod 700 /var/backups/lostcards

# 3. Test manuel (la stack doit tourner : conteneurs db et backend up)
sudo PROJECT_DIR=/opt/lostcards /opt/lostcards/scripts/backup.sh
ls -lh /var/backups/lostcards/
```

### Variables de configuration (env)

| Variable | Défaut | Rôle |
|---|---|---|
| `PROJECT_DIR` | parent du dossier `scripts/` | racine du dépôt (où se trouve le compose) |
| `COMPOSE_FILE` | `docker-compose.prod.yml` | fichier compose utilisé |
| `BACKUP_DIR` | `/var/backups/lostcards` | destination des sauvegardes |
| `RETENTION_DAYS` | `14` | rotation |

## 3. Cron quotidien

Éditer la crontab **root** (docker requiert root ou le groupe docker) :

```bash
sudo crontab -e
```

Ajouter :

```cron
# Sauvegarde LostCards — tous les jours à 03h15, log vers syslog
15 3 * * * PROJECT_DIR=/opt/lostcards /opt/lostcards/scripts/backup.sh 2>&1 | logger -t lostcards-backup
```

Vérifier l'exécution le lendemain :

```bash
grep lostcards-backup /var/log/syslog | tail
ls -lh /var/backups/lostcards/
```

### Copie hors-serveur (fortement recommandé)

Une sauvegarde sur le même VPS ne protège ni d'une panne disque ni d'une
compromission. Ajouter une synchronisation vers un stockage externe, p. ex. :

```cron
# 30 min après le backup : réplication vers un stockage distant (rclone à configurer)
45 3 * * * rclone sync /var/backups/lostcards remote:lostcards-backups --min-age 30m 2>&1 | logger -t lostcards-offsite
```

## 4. Restauration

> DESTRUCTIF : écrase la base et/ou les selfies actuels. Le script arrête
> `backend` et `queue` pendant l'import DB puis les redémarre. Une confirmation
> interactive (saisie du nom de la base) est exigée.

```bash
# Base seule
sudo PROJECT_DIR=/opt/lostcards /opt/lostcards/scripts/restore.sh \
    --db /var/backups/lostcards/db_20260730_031500.sql.gz

# Selfies seuls
sudo PROJECT_DIR=/opt/lostcards /opt/lostcards/scripts/restore.sh \
    --selfies /var/backups/lostcards/selfies_20260730_031500.tar.gz

# Les deux
sudo PROJECT_DIR=/opt/lostcards /opt/lostcards/scripts/restore.sh \
    --db ...sql.gz --selfies ...tar.gz
```

Après restauration : tester login, consultation d'une annonce avec photos,
et `docker compose -f docker-compose.prod.yml ps` (tous les services `healthy`/`running`).

## 5. Test de restauration périodique (obligatoire)

Une sauvegarde non testée n'est pas une sauvegarde. **Une fois par mois**,
valider un dump sur un environnement jetable (jamais sur la prod) :

```bash
# Sur une machine locale ou un VPS de test :
docker run -d --name restore-test \
    -e MYSQL_ROOT_PASSWORD=testonly -e MYSQL_DATABASE=lostcards mysql:8.0
sleep 30
zcat db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i restore-test \
    mysql -uroot -ptestonly lostcards

# Contrôles de cohérence :
docker exec -i restore-test mysql -uroot -ptestonly lostcards \
    -e "SHOW TABLES; SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS posts FROM posts;"

docker rm -f restore-test
```

Consigner la date et le résultat du test (p. ex. dans un fichier
`docs/backup-tests.log` ou l'outil de suivi de l'équipe).

## 6. Points de vigilance

- **Le backup nécessite la stack démarrée** (`db` pour le dump, `backend` pour
  les selfies). Si les conteneurs sont arrêtés, le script échoue explicitement.
- Le seed de la base est désormais une **opération manuelle** (retirée du boot) :
  `docker compose -f docker-compose.prod.yml exec backend php artisan db:seed --class=DatabaseSeeder --force`
  — à n'exécuter qu'à l'initialisation d'un environnement neuf, jamais sur une
  base contenant des données réelles.
- Surveiller l'espace disque : `du -sh /var/backups/lostcards` ; ajuster
  `RETENTION_DAYS` si le VPS est contraint.
- Les fichiers de sauvegarde contiennent des **données personnelles**
  (utilisateurs, selfies) : permissions `600`, répertoire `700`, chiffrer la
  copie hors-site (rclone crypt ou équivalent).

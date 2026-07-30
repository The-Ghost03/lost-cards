#!/usr/bin/env bash
#
# backup.sh — Sauvegarde LostCards (base MySQL + volume selfies)
#
# - Dump MySQL via `docker compose exec db` (mot de passe lu DANS le conteneur,
#   jamais passé en argument sur l'hôte → invisible dans `ps`).
# - Archive tar.gz du volume selfies via le conteneur backend.
# - Rotation : suppression des sauvegardes de plus de RETENTION_DAYS jours.
#
# Usage :
#   ./scripts/backup.sh
#
# Variables surchargeables (env ou en tête de crontab) :
#   PROJECT_DIR     Racine du dépôt sur le VPS   (défaut : parent de ce script)
#   COMPOSE_FILE    Fichier compose              (défaut : docker-compose.prod.yml)
#   BACKUP_DIR      Destination des sauvegardes  (défaut : /var/backups/lostcards)
#   RETENTION_DAYS  Jours de rétention           (défaut : 14)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lostcards}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_DUMP="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
SELFIES_ARCHIVE="${BACKUP_DIR}/selfies_${TIMESTAMP}.tar.gz"

compose() {
    docker compose -f "${PROJECT_DIR}/${COMPOSE_FILE}" --project-directory "$PROJECT_DIR" "$@"
}

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
    log "ERREUR : $*" >&2
    exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker introuvable dans le PATH"
[ -f "${PROJECT_DIR}/${COMPOSE_FILE}" ] || fail "fichier compose introuvable : ${PROJECT_DIR}/${COMPOSE_FILE}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ── 1. Dump MySQL ────────────────────────────────────────────────────────────
# Le mot de passe et le nom de la base sont lus depuis l'environnement du
# conteneur db (MYSQL_ROOT_PASSWORD / MYSQL_DATABASE) : rien ne transite en clair.
log "Dump MySQL -> ${DB_DUMP}"
compose exec -T db sh -c \
    'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
        --single-transaction --quick --routines --triggers \
        "$MYSQL_DATABASE"' \
    | gzip > "${DB_DUMP}.tmp"

# Vérification minimale : un dump valide se termine par "Dump completed"
if ! gzip -t "${DB_DUMP}.tmp" 2>/dev/null; then
    rm -f "${DB_DUMP}.tmp"
    fail "dump MySQL corrompu (gzip invalide)"
fi
if ! zcat "${DB_DUMP}.tmp" | tail -n 5 | grep -q 'Dump completed'; then
    rm -f "${DB_DUMP}.tmp"
    fail "dump MySQL incomplet (marqueur 'Dump completed' absent)"
fi
mv "${DB_DUMP}.tmp" "$DB_DUMP"
chmod 600 "$DB_DUMP"
log "Dump MySQL OK ($(du -h "$DB_DUMP" | cut -f1))"

# ── 2. Archive du volume selfies ─────────────────────────────────────────────
# Via le conteneur backend (le volume y est monté sur /var/www/storage/app/selfies) :
# indépendant du nom de projet compose qui préfixe le nom du volume Docker.
log "Archive selfies -> ${SELFIES_ARCHIVE}"
if compose exec -T backend sh -c 'tar czf - -C /var/www/storage/app selfies' \
    > "${SELFIES_ARCHIVE}.tmp"; then
    mv "${SELFIES_ARCHIVE}.tmp" "$SELFIES_ARCHIVE"
    chmod 600 "$SELFIES_ARCHIVE"
    log "Archive selfies OK ($(du -h "$SELFIES_ARCHIVE" | cut -f1))"
else
    rm -f "${SELFIES_ARCHIVE}.tmp"
    fail "archive selfies échouée (conteneur backend arrêté ?)"
fi

# ── 3. Rotation ──────────────────────────────────────────────────────────────
log "Rotation : suppression des sauvegardes > ${RETENTION_DAYS} jours"
find "$BACKUP_DIR" -maxdepth 1 -name 'db_*.sql.gz'      -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'selfies_*.tar.gz' -mtime "+${RETENTION_DAYS}" -delete

log "Sauvegarde terminée : ${DB_DUMP} + ${SELFIES_ARCHIVE}"

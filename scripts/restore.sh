#!/usr/bin/env bash
#
# restore.sh — Restauration LostCards (base MySQL et/ou volume selfies)
#
# ATTENTION : opération DESTRUCTIVE (écrase les données actuelles).
# Une confirmation interactive est demandée (saisir le nom de la base).
#
# Usage :
#   ./scripts/restore.sh --db /var/backups/lostcards/db_20260730_030000.sql.gz
#   ./scripts/restore.sh --selfies /var/backups/lostcards/selfies_20260730_030000.tar.gz
#   ./scripts/restore.sh --db <dump.sql.gz> --selfies <selfies.tar.gz>
#
# Variables surchargeables :
#   PROJECT_DIR   Racine du dépôt sur le VPS  (défaut : parent de ce script)
#   COMPOSE_FILE  Fichier compose             (défaut : docker-compose.prod.yml)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$SCRIPT_DIR")}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

DB_DUMP=""
SELFIES_ARCHIVE=""

usage() {
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    exit 1
}

while [ $# -gt 0 ]; do
    case "$1" in
        --db)      DB_DUMP="${2:?--db requiert un chemin}";      shift 2 ;;
        --selfies) SELFIES_ARCHIVE="${2:?--selfies requiert un chemin}"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "Argument inconnu : $1" >&2; usage ;;
    esac
done

[ -n "$DB_DUMP" ] || [ -n "$SELFIES_ARCHIVE" ] || usage

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

DB_NAME="$(compose exec -T db sh -c 'printf %s "$MYSQL_DATABASE"')" \
    || fail "impossible de lire MYSQL_DATABASE (conteneur db arrêté ?)"

# ── Confirmation explicite ───────────────────────────────────────────────────
echo "=================================================================="
echo "  RESTAURATION — les données actuelles seront ECRASEES"
[ -n "$DB_DUMP" ]          && echo "  - Base '${DB_NAME}'  <- ${DB_DUMP}"
[ -n "$SELFIES_ARCHIVE" ]  && echo "  - Volume selfies     <- ${SELFIES_ARCHIVE}"
echo "=================================================================="
printf "Pour confirmer, saisir le nom de la base (%s) : " "$DB_NAME"
read -r CONFIRM
[ "$CONFIRM" = "$DB_NAME" ] || fail "confirmation invalide, abandon."

# ── 1. Restauration MySQL ────────────────────────────────────────────────────
if [ -n "$DB_DUMP" ]; then
    [ -f "$DB_DUMP" ] || fail "dump introuvable : $DB_DUMP"
    gzip -t "$DB_DUMP" || fail "dump corrompu (gzip invalide) : $DB_DUMP"

    log "Arrêt du backend et du worker pendant la restauration..."
    compose stop backend queue

    log "Import du dump dans la base '${DB_NAME}'..."
    zcat "$DB_DUMP" | compose exec -T db sh -c \
        'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

    log "Redémarrage du backend et du worker..."
    compose start backend queue
    log "Base restaurée."
fi

# ── 2. Restauration des fichiers utilisateurs ────────────────────────────────
# Cible : storage/app/private (racine du disque `local` Laravel), et non
# storage/app/selfies — voir la note dans backup.sh. Les archives produites
# AVANT le 30/07/2026 contiennent un dossier `selfies/` et sont vides : elles
# ne sont pas restaurables ici, c'est normal.
if [ -n "$SELFIES_ARCHIVE" ]; then
    [ -f "$SELFIES_ARCHIVE" ] || fail "archive introuvable : $SELFIES_ARCHIVE"
    gzip -t "$SELFIES_ARCHIVE" || fail "archive corrompue (gzip invalide) : $SELFIES_ARCHIVE"

    RACINE_ARCHIVE="$(tar tzf "$SELFIES_ARCHIVE" | head -n1 | cut -d/ -f1)"
    if [ "$RACINE_ARCHIVE" != "private" ]; then
        fail "archive au format obsolète (racine « ${RACINE_ARCHIVE} », attendu « private »).
       Les sauvegardes antérieures au 30/07/2026 ciblaient un répertoire que
       l'application n'écrivait pas : elles sont vides et sans valeur."
    fi

    log "Restauration des fichiers utilisateurs (selfies + photos d'annonces)..."
    compose exec -T backend sh -c \
        'rm -rf /var/www/storage/app/private.old \
         && { [ -d /var/www/storage/app/private ] && mv /var/www/storage/app/private /var/www/storage/app/private.old || true; }'
    compose exec -T backend sh -c 'tar xzf - -C /var/www/storage/app' < "$SELFIES_ARCHIVE"
    compose exec -T backend sh -c 'rm -rf /var/www/storage/app/private.old'
    log "Fichiers utilisateurs restaurés."
fi

log "Restauration terminée. Vérifier l'application (login, affichage des selfies)."

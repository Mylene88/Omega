#!/bin/bash

###############################################################################
# Script de restauration de la base de données PostgreSQL
# Application OMEGA - DDT Eure-et-Loir
#
# Usage: ./restore-database.sh <fichier_backup.sql.gz>
# Exemple: ./restore-database.sh ../backups/database/omega_backup_2024-12-04_03-00-00.sql.gz
###############################################################################

set -e  # Arrêter en cas d'erreur

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"
LOG_FILE="${PROJECT_ROOT}/logs/restore.log"

# Créer le répertoire de logs
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Vérifier les arguments
if [ $# -ne 1 ]; then
    echo "Usage: $0 <fichier_backup.sql.gz>"
    echo "Exemple: $0 ../backups/database/omega_backup_2024-12-04_03-00-00.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Vérifier l'existence du fichier
if [ ! -f "$BACKUP_FILE" ]; then
    log "❌ ERREUR: Fichier de sauvegarde non trouvé: $BACKUP_FILE"
    exit 1
fi

# Charger les variables d'environnement
if [ -f "${PROJECT_ROOT}/.env" ]; then
    set -a  # Automatically export all variables
    source "${PROJECT_ROOT}/.env"
    set +a
    log "✅ Fichier .env chargé: ${PROJECT_ROOT}/.env"
else
    log "❌ ERREUR: Fichier .env non trouvé: ${PROJECT_ROOT}/.env"
    exit 1
fi

# Mapper les variables (support des deux formats)
DB_NAME="${POSTGRES_DB:-$DB_NAME}"
DB_USER="${POSTGRES_USR:-$DB_USER}"
DB_PASSWORD="${POSTGRES_PWD:-$DB_PASSWORD}"
DB_HOST="${POSTGRES_HOST:-$DB_HOST}"
DB_PORT="${POSTGRES_PORT:-$DB_PORT}"

# Vérifier les variables requises
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    log "❌ ERREUR: Variables de base de données manquantes dans .env"
    log "Variables requises: POSTGRES_DB, POSTGRES_USR, POSTGRES_PWD, POSTGRES_HOST, POSTGRES_PORT"
    exit 1
fi

log "🚀 Démarrage de la restauration"
log "📦 Base de données: $DB_NAME"
log "🖥️  Serveur: $DB_HOST:$DB_PORT"
log "📁 Fichier de sauvegarde: $(basename "$BACKUP_FILE")"

# Confirmation
read -p "⚠️  ATTENTION: Cette opération va ÉCRASER la base de données $DB_NAME. Continuer? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    log "❌ Restauration annulée par l'utilisateur"
    exit 1
fi

# Créer un backup de sécurité avant restauration
SAFETY_BACKUP="${PROJECT_ROOT}/backups/database/safety_backup_$(date '+%Y-%m-%d_%H-%M-%S').sql.gz"
mkdir -p "$(dirname "$SAFETY_BACKUP")"
log "💾 Création d'une sauvegarde de sécurité avant restauration..."

PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    -f "${SAFETY_BACKUP%.gz}" 2>&1 | tee -a "$LOG_FILE"

gzip -f "${SAFETY_BACKUP%.gz}"
log "✅ Sauvegarde de sécurité créée: $(basename "$SAFETY_BACKUP")"

# Décompresser le fichier
TEMP_SQL="/tmp/omega_restore_$(date '+%Y%m%d_%H%M%S').sql"
log "🗜️  Décompression du fichier..."
if gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"; then
    log "✅ Fichier décompressé"
else
    log "❌ ERREUR: Échec de la décompression"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Restaurer la base de données
log "🔄 Restauration de la base de données..."
log "⚠️  Suppression des tables existantes..."

# Terminer toutes les connexions actives
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "postgres" \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>&1 | tee -a "$LOG_FILE"

# Recréer la base de données
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "postgres" \
    -c "DROP DATABASE IF EXISTS $DB_NAME;" \
    2>&1 | tee -a "$LOG_FILE"

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "postgres" \
    -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
    2>&1 | tee -a "$LOG_FILE"

# Restaurer depuis le dump
log "📥 Importation des données..."
if PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$TEMP_SQL" \
    2>&1 | tee -a "$LOG_FILE"; then

    log "✅ Base de données restaurée avec succès"
else
    log "❌ ERREUR: Échec de la restauration"
    log "ℹ️  Vous pouvez restaurer la sauvegarde de sécurité: $SAFETY_BACKUP"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Nettoyage
rm -f "$TEMP_SQL"
log "🧹 Fichiers temporaires nettoyés"

log "✅ Restauration terminée avec succès"
log "ℹ️  Sauvegarde de sécurité conservée: $SAFETY_BACKUP"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

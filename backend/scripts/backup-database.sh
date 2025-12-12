#!/bin/bash

###############################################################################
# Script de sauvegarde quotidienne de la base de données PostgreSQL
# Application OMEGA - DDT Eure-et-Loir
#
# Conformément au cahier des charges (section Gestion des risques - Perte de données):
# "Système de sauvegarde automatisé quotidien avec stockage sur un serveur distinct"
#
# Usage: ./backup-database.sh
# Fréquence recommandée: Tous les jours à 3h du matin (via cron)
###############################################################################

set -e  # Arrêter en cas d'erreur

# Ajouter PostgreSQL au PATH si pg_dump n'est pas trouvé (utile pour cron)
if ! command -v pg_dump >/dev/null 2>&1; then
  export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
fi

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups/database"
LOG_FILE="${PROJECT_ROOT}/logs/backup.log"
RETENTION_DAYS=30  # Conserver les sauvegardes pendant 30 jours

# Créer les répertoires nécessaires
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Charger les variables d'environnement depuis .env
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

# Nom du fichier de sauvegarde avec timestamp
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_FILE="${BACKUP_DIR}/omega_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

log "🚀 Démarrage de la sauvegarde quotidienne"
log "📦 Base de données: $DB_NAME"
log "🖥️  Serveur: $DB_HOST:$DB_PORT"
log "📁 Fichier de sauvegarde: $(basename "$BACKUP_FILE_GZ")"

# Effectuer la sauvegarde avec pg_dump
log "💾 Création du dump PostgreSQL..."

if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose \
    -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then

    log "✅ Dump créé avec succès: $(basename "$BACKUP_FILE")"

    # Compresser la sauvegarde
    log "🗜️  Compression du fichier..."
    if gzip -f "$BACKUP_FILE"; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
        log "✅ Sauvegarde compressée: $(basename "$BACKUP_FILE_GZ") ($BACKUP_SIZE)"
    else
        log "⚠️  Échec de la compression, conservation du fichier non compressé"
    fi
else
    log "❌ ERREUR: Échec de la création du dump"
    exit 1
fi

# Nettoyage des anciennes sauvegardes
log "🧹 Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "omega_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
log "✅ ${DELETED_COUNT} ancienne(s) sauvegarde(s) supprimée(s)"

# Statistiques
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "omega_backup_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "📊 Total des sauvegardes: ${TOTAL_BACKUPS} fichiers (${TOTAL_SIZE})"

# Vérification de l'intégrité (test de décompression)
log "🔍 Vérification de l'intégrité..."
if gzip -t "$BACKUP_FILE_GZ" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ Intégrité vérifiée avec succès"
else
    log "⚠️  Avertissement: Problème d'intégrité détecté"
fi

log "✅ Sauvegarde quotidienne terminée avec succès"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Retourner le chemin du fichier de sauvegarde
echo "$BACKUP_FILE_GZ"

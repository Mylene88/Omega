# Configuration de la sauvegarde automatique quotidienne

## Vue d'ensemble

Conformément au cahier des charges (section **Gestion des risques - Perte de données**) :
> "Système de sauvegarde automatisé quotidien avec stockage sur un serveur distinct"

Ce document explique comment configurer la sauvegarde automatique quotidienne de la base de données PostgreSQL pour l'application OMEGA.

## Prérequis

- PostgreSQL installé avec l'utilitaire `pg_dump`
- Accès au fichier `.env` du projet avec les credentials de la base de données
- Droits d'exécution sur les scripts de sauvegarde

## Scripts de sauvegarde

### 1. Script de sauvegarde (`backup-database.sh`)

**Emplacement** : `backend/scripts/backup-database.sh`

**Fonctionnalités** :
- Crée un dump complet de la base de données PostgreSQL
- Compresse automatiquement avec gzip
- Nettoie les sauvegardes de plus de 30 jours
- Log toutes les opérations dans `logs/backup.log`
- Vérifie l'intégrité de la sauvegarde créée

**Répertoire de stockage** : `backups/database/`

**Format des fichiers** : `omega_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

### 2. Script de restauration (`restore-database.sh`)

**Emplacement** : `backend/scripts/restore-database.sh`

**Usage** :
```bash
./backend/scripts/restore-database.sh <fichier_backup.sql.gz>
```

**Fonctionnalités** :
- Crée une sauvegarde de sécurité avant restauration
- Restaure une sauvegarde spécifique
- Demande confirmation avant d'écraser la base

## Configuration du Cron

### Méthode 1 : Cron système (Recommandé pour production)

#### Étape 1 : Ouvrir le crontab
```bash
crontab -e
```

#### Étape 2 : Ajouter la tâche quotidienne

**Exécution tous les jours à 3h du matin** (comme spécifié dans le cahier des charges pour le nettoyage des snapshots) :

```cron
# Sauvegarde quotidienne de la base de données OMEGA
0 3 * * * cd /chemin/vers/Omega-fix && /bin/bash backend/scripts/backup-database.sh >> logs/backup-cron.log 2>&1
```

**Important** : Remplacer `/chemin/vers/Omega-fix` par le chemin absolu du projet.

#### Étape 3 : Vérifier la configuration
```bash
crontab -l
```

### Méthode 2 : Systemd Timer (Alternative moderne)

#### Créer le service

Fichier `/etc/systemd/system/omega-backup.service` :
```ini
[Unit]
Description=Sauvegarde quotidienne base de données OMEGA
After=postgresql.service

[Service]
Type=oneshot
User=votre_utilisateur
WorkingDirectory=/chemin/vers/Omega-fix
ExecStart=/bin/bash /chemin/vers/Omega-fix/backend/scripts/backup-database.sh
StandardOutput=append:/chemin/vers/Omega-fix/logs/backup-systemd.log
StandardError=append:/chemin/vers/Omega-fix/logs/backup-systemd.log
```

#### Créer le timer

Fichier `/etc/systemd/system/omega-backup.timer` :
```ini
[Unit]
Description=Timer pour sauvegarde quotidienne OMEGA
Requires=omega-backup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### Activer et démarrer
```bash
sudo systemctl daemon-reload
sudo systemctl enable omega-backup.timer
sudo systemctl start omega-backup.timer
```

#### Vérifier le statut
```bash
sudo systemctl status omega-backup.timer
sudo systemctl list-timers omega-backup.timer
```

## Test manuel de la sauvegarde

### Test du script de sauvegarde
```bash
cd /chemin/vers/Omega-fix
./backend/scripts/backup-database.sh
```

### Vérifier les logs
```bash
tail -f logs/backup.log
```

### Vérifier les fichiers créés
```bash
ls -lh backups/database/
```

## Stockage sur un serveur distinct

Conformément au cahier des charges, les sauvegardes doivent être stockées sur un **serveur distinct**.

### Option 1 : Montage NFS/CIFS

Modifier la variable `BACKUP_DIR` dans le script :
```bash
BACKUP_DIR="/mnt/backup-server/omega/database"
```

### Option 2 : Synchronisation rsync

Ajouter au script ou créer un script séparé :
```bash
# Après la sauvegarde, synchroniser vers le serveur distant
rsync -avz --delete \
    "${BACKUP_DIR}/" \
    backup-user@backup-server:/backup/omega/database/
```

### Option 3 : Cron supplémentaire pour la copie

```cron
# Copier les sauvegardes vers le serveur distant (30 min après la sauvegarde)
30 3 * * * rsync -avz /chemin/vers/Omega-fix/backups/database/ backup-server:/backup/omega/
```

## Surveillance et alertes

### Vérifier les sauvegardes récentes

Script de vérification (`check-backups.sh`) :
```bash
#!/bin/bash
BACKUP_DIR="/chemin/vers/Omega-fix/backups/database"
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "omega_backup_*.sql.gz" -type f -mtime -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "⚠️  ALERTE: Aucune sauvegarde trouvée dans les dernières 24h"
    # Envoyer une alerte email (optionnel)
    exit 1
else
    echo "✅ Dernière sauvegarde: $(basename "$LATEST_BACKUP")"
    exit 0
fi
```

### Ajouter au cron pour vérification quotidienne
```cron
# Vérification à 9h du matin
0 9 * * * /chemin/vers/check-backups.sh
```

## Interface admin

Les sauvegardes peuvent également être gérées via l'interface d'administration :

- **GET /api/admin/backup** : Lister toutes les sauvegardes
- **POST /api/admin/backup** : Déclencher une sauvegarde manuelle
- **DELETE /api/admin/backup?filename=xxx** : Supprimer une sauvegarde

## Bonnes pratiques

1. **Tester régulièrement les restaurations** : Au moins une fois par mois
2. **Surveiller l'espace disque** : Les sauvegardes peuvent prendre beaucoup d'espace
3. **Conserver plusieurs copies** : Stockage local + serveur distant + archivage mensuel
4. **Documenter la procédure** : Mettre à jour ce document si des changements sont apportés
5. **Sécuriser les accès** : Limiter les permissions sur le répertoire de sauvegarde

## Dépannage

### La sauvegarde échoue

1. Vérifier les logs : `cat logs/backup.log`
2. Vérifier les credentials dans `.env`
3. Tester la connexion PostgreSQL manuellement :
   ```bash
   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
   ```

### Espace disque insuffisant

```bash
# Vérifier l'espace disque
df -h backups/database/

# Nettoyer manuellement les anciennes sauvegardes
find backups/database/ -name "omega_backup_*.sql.gz" -mtime +30 -delete
```

### Le cron ne s'exécute pas

```bash
# Vérifier le service cron
sudo systemctl status cron

# Vérifier les logs du cron
sudo tail -f /var/log/syslog | grep CRON
```

## Référence

- **Cahier des charges** : Section "Gestion des risques - Perte de données"
- **Fréquence** : Quotidienne (tous les jours à 3h du matin)
- **Rétention** : 30 jours en local
- **Stockage** : Serveur distinct (à configurer selon l'infrastructure)

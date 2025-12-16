# Système de Surveillance de Santé - Omega

Ce système permet de surveiller l'état de l'application Omega en vérifiant périodiquement l'endpoint `/api/health`.

## Fonctionnalités

- ✅ Vérification automatique toutes les minutes (configurable)
- 📊 Statistiques de disponibilité
- 📝 Logs quotidiens avec horodatage
- 🚨 Système d'alerte en cas d'échecs consécutifs
- ⚙️ Configuration via variables d'environnement

## Architecture

### 1. Endpoint Health Check (`/api/health`)

L'endpoint vérifie :
- La connexion à la base de données PostgreSQL
- L'état général de l'application
- Le temps de réponse

**Exemple de réponse (succès)** :
```json
{
  "status": "healthy",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "15ms"
    },
    "application": {
      "status": "healthy"
    }
  },
  "responseTime": "20ms"
}
```

**Exemple de réponse (échec)** :
```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Connection refused"
    },
    "application": {
      "status": "healthy"
    }
  },
  "responseTime": "5002ms"
}
```

### 2. Script de Surveillance (`health-check.js`)

Le script :
- Appelle l'endpoint `/api/health` toutes les minutes
- Enregistre les résultats dans des fichiers de log quotidiens
- Détecte les échecs consécutifs
- Génère des alertes si le seuil est atteint
- Affiche des statistiques de disponibilité

## Configuration

### Variables d'environnement

Créez un fichier `.env` dans le répertoire `monitoring` :

```bash
# URL de l'endpoint health check
HEALTH_CHECK_URL=http://localhost:3000/api/health

# Intervalle de vérification en millisecondes (60000 = 1 minute)
HEALTH_CHECK_INTERVAL=60000

# Nombre d'échecs consécutifs avant déclenchement d'alerte
HEALTH_ALERT_THRESHOLD=3
```

## Utilisation

### Démarrage manuel

```bash
cd backend/monitoring
node health-check.js
```

### Démarrage avec npm (depuis le dossier backend)

```bash
npm run monitoring
```

### Démarrage en arrière-plan (Linux/macOS)

```bash
cd backend/monitoring
nohup node health-check.js > /dev/null 2>&1 &
```

Pour arrêter :
```bash
pkill -f health-check.js
```

### Démarrage avec PM2 (recommandé pour la production)

Installation de PM2 :
```bash
npm install -g pm2
```

Démarrage :
```bash
cd backend/monitoring
pm2 start health-check.js --name omega-health-monitor
```

Commandes utiles :
```bash
pm2 status                  # Voir le statut
pm2 logs omega-health-monitor  # Voir les logs
pm2 stop omega-health-monitor  # Arrêter
pm2 restart omega-health-monitor  # Redémarrer
pm2 startup                 # Configurer le démarrage automatique
```

## Logs

Les logs sont stockés dans le répertoire `monitoring/logs/` avec un fichier par jour :
- Format : `health-YYYY-MM-DD.log`
- Exemple : `health-2025-12-12.log`

### Structure des logs

```
[2025-12-12T10:30:00.000Z] [INFO] 🚀 Démarrage de la surveillance...
[2025-12-12T10:30:01.234Z] [INFO] ✓ Health check OK - Status: healthy - Response time: 18ms
[2025-12-12T10:31:01.456Z] [INFO] ✓ Health check OK - Status: healthy - Response time: 22ms
[2025-12-12T10:32:01.678Z] [ERROR] ✗ Health check FAILED - Connection refused - Response time: 5001ms
[2025-12-12T10:33:01.890Z] [STATS] 📊 Statistiques: 10 vérifications | 9 succès (90.00%) | 1 échecs
```

## Alertes

Lorsque le nombre d'échecs consécutifs atteint le seuil configuré (par défaut 3), une alerte est déclenchée et enregistrée dans les logs :

```
[2025-12-12T10:35:00.000Z] [ALERT] ALERTE: 3 échecs consécutifs détectés sur http://localhost:3000/api/health
```

### Extension du système d'alertes

Vous pouvez étendre le système pour envoyer des notifications :

Dans `health-check.js`, modifiez la fonction `triggerAlert()` :

```javascript
function triggerAlert() {
  const alertMessage = `ALERTE: ${consecutiveFailures} échecs consécutifs`;
  log(alertMessage, 'ALERT');

  // Exemple : Envoi d'email
  // sendEmail(alertMessage);

  // Exemple : Notification Slack
  // sendSlackNotification(alertMessage);

  // Exemple : Webhook
  // callWebhook(alertMessage);
}
```

## Intégration avec systemd (Linux)

Pour une installation en tant que service système :

Créez `/etc/systemd/system/omega-health-monitor.service` :

```ini
[Unit]
Description=Omega Health Monitor
After=network.target

[Service]
Type=simple
User=omega
WorkingDirectory=/path/to/Omega-fix/backend/monitoring
ExecStart=/usr/bin/node health-check.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/omega-health-monitor.log
StandardError=append:/var/log/omega-health-monitor-error.log

[Install]
WantedBy=multi-user.target
```

Commandes :
```bash
sudo systemctl daemon-reload
sudo systemctl enable omega-health-monitor
sudo systemctl start omega-health-monitor
sudo systemctl status omega-health-monitor
```

## Métriques et Statistiques

Le script affiche automatiquement des statistiques :
- Toutes les 10 vérifications
- Toutes les heures
- À l'arrêt du script

Statistiques disponibles :
- Nombre total de vérifications
- Nombre de succès / échecs
- Taux de disponibilité (%)
- Nombre d'échecs consécutifs actuels

## Dépannage

### L'endpoint ne répond pas

1. Vérifiez que l'application backend est démarrée :
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Vérifiez les logs de l'application backend

3. Vérifiez la configuration de la base de données

### Les logs ne sont pas créés

1. Vérifiez les permissions du répertoire `monitoring/logs/`
2. Vérifiez que le script a les droits d'écriture

### Trop d'alertes

Augmentez `HEALTH_ALERT_THRESHOLD` dans le fichier `.env`

## Bonnes pratiques

1. **Rotation des logs** : Configurez une rotation pour éviter que les logs ne prennent trop d'espace
2. **Monitoring externe** : Utilisez également un service externe (UptimeRobot, Pingdom) pour une redondance
3. **Alertes** : Configurez plusieurs canaux d'alerte (email + SMS + Slack)
4. **Intervalle** : 1 minute est généralement suffisant, ne descendez pas en dessous de 30 secondes
5. **Supervision** : Supervisez également le script de monitoring lui-même (avec PM2 ou systemd)

## Maintenance

### Nettoyage des anciens logs

```bash
# Supprimer les logs de plus de 30 jours
find monitoring/logs/ -name "health-*.log" -mtime +30 -delete
```

### Rotation automatique avec logrotate (Linux)

Créez `/etc/logrotate.d/omega-health-monitor` :

```
/path/to/Omega-fix/backend/monitoring/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
}
```

## Support

Pour toute question ou problème, consultez la documentation principale du projet Omega.

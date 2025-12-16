# Démarrage Rapide - Surveillance de Santé Omega

## Étape 1 : Vérifier que l'application fonctionne

Assurez-vous que le backend est démarré :

```bash
cd backend
npm run dev
```

## Étape 2 : Tester l'endpoint health

Dans un autre terminal :

```bash
curl http://localhost:3000/api/health
```

Vous devriez voir une réponse JSON avec le statut de santé.

## Étape 3 : Démarrer la surveillance

### Option A : Démarrage simple (développement)

```bash
cd backend
npm run monitoring
```

### Option B : Démarrage avec configuration personnalisée

```bash
cd backend/monitoring
cp .env.example .env
# Modifiez .env selon vos besoins
node health-check.js
```

### Option C : Démarrage en arrière-plan (production)

Avec PM2 (recommandé) :

```bash
npm install -g pm2
cd backend/monitoring
pm2 start health-check.js --name omega-health-monitor
pm2 save
pm2 startup  # Pour démarrage automatique au boot
```

## Arrêter la surveillance

### Si démarré en mode simple
Appuyez sur `Ctrl+C`

### Si démarré avec PM2
```bash
pm2 stop omega-health-monitor
```

## Voir les logs

Les logs sont dans `backend/monitoring/logs/health-YYYY-MM-DD.log`

```bash
# Voir les logs en temps réel
tail -f backend/monitoring/logs/health-$(date +%Y-%m-%d).log
```

Ou avec PM2 :
```bash
pm2 logs omega-health-monitor
```

## Configuration

Modifiez `backend/monitoring/.env` :

- `HEALTH_CHECK_URL` : URL de l'endpoint (par défaut : http://localhost:3000/api/health)
- `HEALTH_CHECK_INTERVAL` : Intervalle en ms (par défaut : 60000 = 1 minute)
- `HEALTH_ALERT_THRESHOLD` : Nombre d'échecs avant alerte (par défaut : 3)

## Vérifier que ça fonctionne

Après le démarrage, vous devriez voir dans les logs :

```
[2025-12-12T...] [INFO] 🚀 Démarrage de la surveillance de santé...
[2025-12-12T...] [INFO] ✓ Health check OK - Status: healthy - Response time: 18ms
```

C'est tout ! Le système vérifie maintenant automatiquement la santé de votre application toutes les minutes.

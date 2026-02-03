#!/usr/bin/env node

/**
 * Script de surveillance de santé de l'application
 * Appelle l'endpoint /api/health toutes les minutes
 * et enregistre les résultats dans un fichier de log
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  healthCheckUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health',
  checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000, // 1 minute par défaut
  logDir: path.join(__dirname, 'logs'),
  logFile: path.join(__dirname, 'logs', `health-${new Date().toISOString().split('T')[0]}.log`),
  alertThreshold: parseInt(process.env.HEALTH_ALERT_THRESHOLD) || 3, // Nombre d'échecs consécutifs avant alerte
};

// État de la surveillance
let consecutiveFailures = 0;
let totalChecks = 0;
let successfulChecks = 0;
let failedChecks = 0;

/**
 * Crée le répertoire de logs s'il n'existe pas
 */
function ensureLogDirectory() {
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true });
    console.log(`✓ Répertoire de logs créé: ${CONFIG.logDir}`);
  }
}

/**
 * Écrit un message dans le fichier de log
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  // Affiche dans la console
  console.log(logMessage.trim());

  // Écrit dans le fichier
  try {
    fs.appendFileSync(CONFIG.logFile, logMessage);
  } catch (error) {
    console.error(`Erreur lors de l'écriture du log: ${error.message}`);
  }
}

/**
 * Effectue un health check
 */
async function performHealthCheck() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(CONFIG.healthCheckUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET',
      timeout: 10000, // 10 secondes de timeout
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        try {
          const healthData = JSON.parse(data);

          resolve({
            success: res.statusCode === 200,
            statusCode: res.statusCode,
            responseTime,
            data: healthData,
          });
        } catch (error) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            responseTime,
            error: 'Invalid JSON response',
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        success: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime,
      });
    });

    req.end();
  });
}

/**
 * Traite le résultat du health check
 */
function handleHealthCheckResult(result) {
  totalChecks++;

  if (result.success) {
    successfulChecks++;
    consecutiveFailures = 0;

    log(
      `✓ Health check OK - Status: ${result.data?.status} - Response time: ${result.responseTime}ms`,
      'INFO'
    );
  } else {
    failedChecks++;
    consecutiveFailures++;

    log(
      `✗ Health check FAILED - ${result.error || `Status: ${result.statusCode}`} - Response time: ${result.responseTime}ms`,
      'ERROR'
    );

    // Déclenche une alerte si le seuil est atteint
    if (consecutiveFailures >= CONFIG.alertThreshold) {
      triggerAlert();
    }
  }

  // Affiche les statistiques toutes les 10 vérifications
  if (totalChecks % 10 === 0) {
    logStatistics();
  }
}

/**
 * Déclenche une alerte
 */
function triggerAlert() {
  const alertMessage = `ALERTE: ${consecutiveFailures} échecs consécutifs détectés sur ${CONFIG.healthCheckUrl}`;
  log(alertMessage, 'ALERT');

  // Ici vous pouvez ajouter d'autres mécanismes d'alerte :
  // - Envoi d'email
  // - Notification Slack
  // - SMS
  // - Webhook
}

/**
 * Affiche les statistiques
 */
function logStatistics() {
  const successRate = totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(2) : 0;

  log(
    `📊 Statistiques: ${totalChecks} vérifications | ` +
      `${successfulChecks} succès (${successRate}%) | ` +
      `${failedChecks} échecs | ` +
      `Échecs consécutifs: ${consecutiveFailures}`,
    'STATS'
  );
}

/**
 * Démarre la surveillance
 */
function startMonitoring() {
  ensureLogDirectory();

  log(
    `🚀 Démarrage de la surveillance de santé - URL: ${CONFIG.healthCheckUrl} - Intervalle: ${CONFIG.checkInterval / 1000}s`,
    'INFO'
  );

  // Première vérification immédiate
  performHealthCheck()
    .then(handleHealthCheckResult)
    .catch(handleHealthCheckResult);

  // Puis vérifications périodiques
  setInterval(async () => {
    try {
      const result = await performHealthCheck();
      handleHealthCheckResult(result);
    } catch (error) {
      handleHealthCheckResult(error);
    }
  }, CONFIG.checkInterval);

  // Affiche les statistiques toutes les heures
  setInterval(() => {
    logStatistics();
  }, 60 * 60 * 1000);
}

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
  log('🛑 Arrêt de la surveillance...', 'INFO');
  logStatistics();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Arrêt de la surveillance...', 'INFO');
  logStatistics();
  process.exit(0);
});

// Démarrage
if (require.main === module) {
  startMonitoring();
}

module.exports = { performHealthCheck, startMonitoring };
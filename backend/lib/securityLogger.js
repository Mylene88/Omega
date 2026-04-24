// backend/lib/securityLogger.js

/**
 * Système de journalisation des événements de sécurité
 * Conforme aux exigences ANSSI (règle 12 - traçabilité)
 * et RGS niveau Standard
 */

import db from '../models/index.js';
import { getClientIp } from '../utils/ip.js';

// Types d'événements de sécurité
export const SecurityEventType = {
  // Authentification
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  FIRST_LOGIN: 'FIRST_LOGIN',

  // Autorisation
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACTION: 'FORBIDDEN_ACTION',
  PRIVILEGE_ESCALATION_ATTEMPT: 'PRIVILEGE_ESCALATION_ATTEMPT',

  // Gestion des données
  DATA_ACCESSED: 'DATA_ACCESSED',
  DATA_MODIFIED: 'DATA_MODIFIED',
  DATA_DELETED: 'DATA_DELETED',
  SENSITIVE_DATA_EXPORT: 'SENSITIVE_DATA_EXPORT',

  // Anomalies et attaques
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  INVALID_INPUT: 'INVALID_INPUT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',

  // Administration
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED',
  USER_MODIFIED: 'USER_MODIFIED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED'
};

// Niveaux de sévérité
export const SeverityLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Détermine le niveau de sévérité selon le type d'événement
 */
function getSeverity(eventType) {
  const criticalEvents = [
    SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT,
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecurityEventType.XSS_ATTEMPT,
    SecurityEventType.DATA_DELETED
  ];

  const errorEvents = [
    SecurityEventType.UNAUTHORIZED_ACCESS,
    SecurityEventType.FORBIDDEN_ACTION,
    SecurityEventType.LOGIN_BLOCKED,
    SecurityEventType.RATE_LIMIT_EXCEEDED
  ];

  const warningEvents = [
    SecurityEventType.LOGIN_FAILED,
    SecurityEventType.INVALID_INPUT,
    SecurityEventType.SUSPICIOUS_ACTIVITY
  ];

  if (criticalEvents.includes(eventType)) return SeverityLevel.CRITICAL;
  if (errorEvents.includes(eventType)) return SeverityLevel.ERROR;
  if (warningEvents.includes(eventType)) return SeverityLevel.WARNING;
  return SeverityLevel.INFO;
}

/**
 * Enregistre un événement de sécurité
 * @param {Object} event - Détails de l'événement
 * @returns {Promise<void>}
 */
export async function logSecurityEvent(event) {
  const {
    eventType,
    userId = null,
    username = null,
    ipAddress = 'unknown',
    userAgent = null,
    resource = null,
    action = null,
    status = null,
    details = {},
    request = null // Objet Request Next.js optionnel
  } = event;

  try {
    // Extraire informations de la requête si fournie
    let extractedIp = ipAddress;
    let extractedUserAgent = userAgent;

    if (request) {
      const headers = request.headers || {};
      extractedIp = getClientIp(request);
      extractedUserAgent = headers['user-agent'] || 'unknown';
    }

    const severity = getSeverity(eventType);

    // Préparer les données pour la base
    const logData = {
      event_type: eventType,
      severity,
      user_id: userId,
      username: username || 'anonymous',
      ip_address: extractedIp,
      user_agent: extractedUserAgent,
      resource,
      action,
      status: status || (eventType.includes('FAILED') || eventType.includes('ATTEMPT') ? 'FAILURE' : 'SUCCESS'),
      details: typeof details === 'string' ? details : JSON.stringify(details),
      timestamp: new Date()
    };

    // Enregistrer en base de données (si la table existe)
    // Note: La table doit être créée via migration
    try {
      const { SecurityLog } = db;
      if (SecurityLog) {
        await SecurityLog.create(logData);
      }
    } catch (dbError) {
      // Si la table n'existe pas encore, logger en console
      console.warn('⚠️  Table security_log non trouvée, log en console uniquement');
    }

    // Logger en console selon la sévérité
    const logMessage = formatLogMessage(eventType, {
      ...logData,
      userId,
      username: username || 'anonymous'
    });

    switch (severity) {
      case SeverityLevel.CRITICAL:
        console.error(`🚨 CRITIQUE: ${logMessage}`);
        // TODO: Envoyer alerte email au RSSI
        await sendSecurityAlert(logData);
        break;
      case SeverityLevel.ERROR:
        console.error(`❌ ERREUR: ${logMessage}`);
        break;
      case SeverityLevel.WARNING:
        console.warn(`⚠️  ATTENTION: ${logMessage}`);
        break;
      default:
        console.log(`ℹ️  INFO: ${logMessage}`);
    }

  } catch (error) {
    // Ne jamais faire échouer l'opération principale à cause d'un problème de log
    console.error('❌ Erreur lors de l\'enregistrement du log de sécurité:', error.message);
  }
}

/**
 * Formate un message de log lisible
 */
function formatLogMessage(eventType, data) {
  const parts = [
    eventType,
    data.username ? `User: ${data.username}` : null,
    data.ip_address !== 'unknown' ? `IP: ${data.ip_address}` : null,
    data.resource ? `Resource: ${data.resource}` : null,
    data.action ? `Action: ${data.action}` : null,
    data.details && typeof data.details === 'object' && Object.keys(data.details).length > 0
      ? `Details: ${JSON.stringify(data.details)}`
      : null
  ].filter(Boolean);

  return parts.join(' | ');
}

/**
 * Envoie une alerte de sécurité pour les événements critiques
 * @param {Object} logData
 */
async function sendSecurityAlert(logData) {
  // TODO: Implémenter l'envoi d'email au RSSI
  // Pour l'instant, juste un log console
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         🚨 ALERTE DE SÉCURITÉ CRITIQUE 🚨           ║
╠═══════════════════════════════════════════════════════╣
║ Type: ${logData.event_type.padEnd(48)}║
║ Utilisateur: ${(logData.username || 'N/A').padEnd(42)}║
║ IP: ${(logData.ip_address || 'N/A').padEnd(50)}║
║ Timestamp: ${new Date(logData.timestamp).toISOString().padEnd(44)}║
╚═══════════════════════════════════════════════════════╝
  `);

  // Exemple d'intégration future avec nodemailer:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: 'omega-security@ddt.gouv.fr',
    to: process.env.RSSI_EMAIL,
    subject: `[OMEGA] Alerte de sécurité: ${logData.event_type}`,
    text: formatLogMessage(logData.event_type, logData)
  });
  */
}

/**
 * Récupère les logs de sécurité avec filtres
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
export async function getSecurityLogs(filters = {}) {
  const {
    eventType = null,
    userId = null,
    severity = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  } = filters;

  try {
    const { SecurityLog } = db;
    if (!SecurityLog) {
      throw new Error('Table security_log non disponible');
    }

    const where = {};

    if (eventType) where.event_type = eventType;
    if (userId) where.user_id = userId;
    if (severity) where.severity = severity;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.$gte = new Date(startDate);
      if (endDate) where.timestamp.$lte = new Date(endDate);
    }

    const logs = await SecurityLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    return logs;
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    return [];
  }
}

/**
 * Obtient les statistiques de sécurité
 * @param {Object} period - { startDate, endDate }
 * @returns {Promise<Object>}
 */
export async function getSecurityStats(period = {}) {
  const { startDate, endDate } = period;

  try {
    const { SecurityLog } = db;
    if (!SecurityLog) {
      return { error: 'Table security_log non disponible' };
    }

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.$gte = new Date(startDate);
      if (endDate) where.timestamp.$lte = new Date(endDate);
    }

    const [
      totalEvents,
      criticalEvents,
      failedLogins,
      suspiciousActivities
    ] = await Promise.all([
      SecurityLog.count({ where }),
      SecurityLog.count({ where: { ...where, severity: SeverityLevel.CRITICAL } }),
      SecurityLog.count({ where: { ...where, event_type: SecurityEventType.LOGIN_FAILED } }),
      SecurityLog.count({
        where: {
          ...where,
          event_type: [
            SecurityEventType.SQL_INJECTION_ATTEMPT,
            SecurityEventType.XSS_ATTEMPT,
            SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT
          ]
        }
      })
    ]);

    return {
      totalEvents,
      criticalEvents,
      failedLogins,
      suspiciousActivities,
      period: {
        start: startDate || 'inception',
        end: endDate || 'now'
      }
    };
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    return { error: error.message };
  }
}

/**
 * Helpers pour logger des événements courants
 */
export const SecurityLogger = {
  logLogin: (username, ipAddress, success, details = {}) =>
    logSecurityEvent({
      eventType: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      username,
      ipAddress,
      details
    }),

  logLogout: (userId, username, ipAddress) =>
    logSecurityEvent({
      eventType: SecurityEventType.LOGOUT,
      userId,
      username,
      ipAddress
    }),

  logUnauthorizedAccess: (userId, username, ipAddress, resource) =>
    logSecurityEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      userId,
      username,
      ipAddress,
      resource
    }),

  logDataModification: (userId, username, resource, action, details = {}) =>
    logSecurityEvent({
      eventType: SecurityEventType.DATA_MODIFIED,
      userId,
      username,
      resource,
      action,
      details
    }),

  logSuspiciousActivity: (username, ipAddress, details) =>
    logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      username,
      ipAddress,
      details
    })
};

export default {
  logSecurityEvent,
  getSecurityLogs,
  getSecurityStats,
  SecurityEventType,
  SeverityLevel,
  SecurityLogger
};

// backend/lib/reportHelper.js
/**
 * Helper pour générer des rapports d'audit et d'activité
 */

const db = require('../models');
const { Op } = require('sequelize');

/**
 * Génère un rapport d'activité complet
 */
async function generateActivityReport({ dateFrom, dateTo } = {}) {
  const where = {};

  if (dateFrom || dateTo) {
    where.created_at = {};
    if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
    if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
  }

  // Récupérer toutes les données
  const [auditLogs, snapshots, accessLogs, projets, users] = await Promise.all([
    db.AuditLog.findAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id_user', 'username', 'prenom', 'nom']
      }],
      order: [['created_at', 'DESC']],
      limit: 1000
    }),

    db.ProjetSnapshot.findAll({
      where,
      include: [
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet']
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 500
    }),

    db.AdminAccessLog.findAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id_user', 'username', 'prenom', 'nom']
      }],
      order: [['created_at', 'DESC']],
      limit: 1000
    }),

    db.Projet.count({ where: dateFrom || dateTo ? { created_at: where.created_at } : {} }),
    db.User.count()
  ]);

  // Calculer des statistiques
  const stats = {
    totalActions: auditLogs.length,
    totalSnapshots: snapshots.length,
    totalAccess: accessLogs.length,
    totalProjets: projets,
    totalUsers: users,

    actionsByType: auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {}),

    actionsByTable: auditLogs.reduce((acc, log) => {
      acc[log.table_name] = (acc[log.table_name] || 0) + 1;
      return acc;
    }, {}),

    snapshotsByType: snapshots.reduce((acc, snap) => {
      acc[snap.snapshot_type] = (acc[snap.snapshot_type] || 0) + 1;
      return acc;
    }, {}),

    accessByAction: accessLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {}),

    failedAccess: accessLogs.filter(log => !log.success).length,
    successfulAccess: accessLogs.filter(log => log.success).length,
  };

  return {
    period: {
      from: dateFrom || 'Début',
      to: dateTo || 'Maintenant'
    },
    stats,
    auditLogs: auditLogs.map(log => ({
      id: log.id_audit,
      table: log.table_name,
      recordId: log.record_id,
      action: log.action,
      user: log.user ? `${log.user.prenom} ${log.user.nom} (${log.user.username})` : 'Système',
      date: log.created_at,
      changedFields: log.changed_fields?.join(', ') || 'N/A'
    })),
    snapshots: snapshots.map(snap => ({
      id: log.id_snapshot,
      projet: snap.projet?.nom_projet || snap.id_projet,
      type: snap.snapshot_type,
      creator: snap.creator ? `${snap.creator.prenom} ${snap.creator.nom}` : 'Système',
      date: snap.created_at,
      description: snap.description
    })),
    accessLogs: accessLogs.map(log => ({
      id: log.id_access,
      user: log.user ? `${log.user.prenom} ${log.user.nom} (${log.user.username})` : 'Inconnu',
      action: log.action,
      resource: log.resource,
      success: log.success ? 'Oui' : 'Non',
      ip: log.ip_address,
      date: log.created_at,
      error: log.error_message || 'N/A'
    }))
  };
}

/**
 * Génère un rapport de sécurité
 */
async function generateSecurityReport({ days = 30 } = {}) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const accessLogs = await db.AdminAccessLog.findAll({
    where: {
      created_at: {
        [Op.gte]: dateFrom
      }
    },
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id_user', 'username', 'prenom', 'nom']
    }],
    order: [['created_at', 'DESC']]
  });

  // Analyser les tentatives d'accès échouées
  const failedAttempts = accessLogs.filter(log => !log.success);
  const suspiciousIPs = {};
  const suspiciousUsers = {};

  failedAttempts.forEach(log => {
    // Compteur par IP
    if (log.ip_address) {
      suspiciousIPs[log.ip_address] = (suspiciousIPs[log.ip_address] || 0) + 1;
    }

    // Compteur par utilisateur
    if (log.user_id) {
      const userKey = `${log.user_id}:${log.user?.username || 'inconnu'}`;
      suspiciousUsers[userKey] = (suspiciousUsers[userKey] || 0) + 1;
    }
  });

  // Identifier les IPs/users avec plus de 5 échecs
  const suspiciousIPList = Object.entries(suspiciousIPs)
    .filter(([ip, count]) => count >= 5)
    .map(([ip, count]) => ({ ip, failedAttempts: count }))
    .sort((a, b) => b.failedAttempts - a.failedAttempts);

  const suspiciousUserList = Object.entries(suspiciousUsers)
    .filter(([user, count]) => count >= 5)
    .map(([user, count]) => {
      const [id, username] = user.split(':');
      return { userId: id, username, failedAttempts: count };
    })
    .sort((a, b) => b.failedAttempts - a.failedAttempts);

  return {
    period: `${days} derniers jours`,
    summary: {
      totalAccess: accessLogs.length,
      successfulAccess: accessLogs.filter(log => log.success).length,
      failedAccess: failedAttempts.length,
      uniqueUsers: new Set(accessLogs.map(log => log.user_id)).size,
      uniqueIPs: new Set(accessLogs.map(log => log.ip_address)).size
    },
    alerts: {
      suspiciousIPs: suspiciousIPList,
      suspiciousUsers: suspiciousUserList
    },
    recentFailures: failedAttempts.slice(0, 20).map(log => ({
      date: log.created_at,
      user: log.user ? `${log.user.username}` : 'Inconnu',
      action: log.action,
      ip: log.ip_address,
      error: log.error_message
    }))
  };
}

module.exports = {
  generateActivityReport,
  generateSecurityReport
};

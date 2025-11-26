// backend/lib/cleanupHelper.js
/**
 * Helper pour le nettoyage automatique des données anciennes
 * Implémente une politique de rétention des données
 */

const db = require('../models');
const { Op } = require('sequelize');

/**
 * Politique de rétention par défaut (en jours)
 */
const RETENTION_POLICY = {
  // Snapshots
  snapshots: {
    AUTO: 90,              // Snapshots automatiques: 90 jours
    MANUAL: 365,           // Snapshots manuels: 1 an
    BEFORE_DELETE: 180,    // Snapshots avant suppression: 6 mois
  },
  // Audit logs
  auditLog: 180,           // Logs d'audit: 6 mois
  // Admin access logs
  adminAccessLog: 90,      // Logs d'accès admin: 90 jours
};

/**
 * Nettoie les snapshots selon la politique de rétention
 */
async function cleanupSnapshots(policy = RETENTION_POLICY.snapshots) {
  const results = {
    AUTO: 0,
    MANUAL: 0,
    BEFORE_DELETE: 0
  };

  try {
    for (const [type, retentionDays] of Object.entries(policy)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deleted = await db.ProjetSnapshot.destroy({
        where: {
          snapshot_type: type,
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      results[type] = deleted;
      console.log(`🗑️  Supprimé ${deleted} snapshots ${type} datant de plus de ${retentionDays} jours`);
    }

    return {
      success: true,
      deletedByType: results,
      totalDeleted: Object.values(results).reduce((a, b) => a + b, 0)
    };

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des snapshots:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Nettoie les logs d'audit selon la politique de rétention
 */
async function cleanupAuditLogs(retentionDays = RETENTION_POLICY.auditLog) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await db.AuditLog.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🗑️  Supprimé ${deleted} logs d'audit datant de plus de ${retentionDays} jours`);

    return {
      success: true,
      deleted,
      retentionDays
    };

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des logs d\'audit:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Nettoie les logs d'accès admin selon la politique de rétention
 */
async function cleanupAdminAccessLogs(retentionDays = RETENTION_POLICY.adminAccessLog) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await db.AdminAccessLog.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🗑️  Supprimé ${deleted} logs d'accès admin datant de plus de ${retentionDays} jours`);

    return {
      success: true,
      deleted,
      retentionDays
    };

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des logs d\'accès admin:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Nettoyage complet de toutes les données anciennes
 */
async function performFullCleanup(customPolicy = null) {
  const policy = customPolicy || RETENTION_POLICY;

  console.log('🧹 Démarrage du nettoyage automatique...');
  console.log(`📋 Politique de rétention:`, policy);

  const results = {
    startTime: new Date(),
    snapshots: await cleanupSnapshots(policy.snapshots),
    auditLogs: await cleanupAuditLogs(policy.auditLog),
    adminAccessLogs: await cleanupAdminAccessLogs(policy.adminAccessLog),
    endTime: null,
    duration: null
  };

  results.endTime = new Date();
  results.duration = results.endTime - results.startTime;

  const totalDeleted =
    (results.snapshots.totalDeleted || 0) +
    (results.auditLogs.deleted || 0) +
    (results.adminAccessLogs.deleted || 0);

  console.log(`✅ Nettoyage terminé en ${results.duration}ms`);
  console.log(`📊 Total supprimé: ${totalDeleted} enregistrements`);

  return results;
}

/**
 * Obtient des statistiques sur les données qui seront nettoyées
 */
async function getCleanupPreview(policy = RETENTION_POLICY) {
  try {
    const preview = {
      snapshots: { AUTO: 0, MANUAL: 0, BEFORE_DELETE: 0 },
      auditLogs: 0,
      adminAccessLogs: 0
    };

    // Preview snapshots
    for (const [type, retentionDays] of Object.entries(policy.snapshots)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      preview.snapshots[type] = await db.ProjetSnapshot.count({
        where: {
          snapshot_type: type,
          created_at: { [Op.lt]: cutoffDate }
        }
      });
    }

    // Preview audit logs
    const auditCutoffDate = new Date();
    auditCutoffDate.setDate(auditCutoffDate.getDate() - policy.auditLog);
    preview.auditLogs = await db.AuditLog.count({
      where: { created_at: { [Op.lt]: auditCutoffDate } }
    });

    // Preview admin access logs
    const accessCutoffDate = new Date();
    accessCutoffDate.setDate(accessCutoffDate.getDate() - policy.adminAccessLog);
    preview.adminAccessLogs = await db.AdminAccessLog.count({
      where: { created_at: { [Op.lt]: accessCutoffDate } }
    });

    preview.total =
      Object.values(preview.snapshots).reduce((a, b) => a + b, 0) +
      preview.auditLogs +
      preview.adminAccessLogs;

    return preview;

  } catch (error) {
    console.error('❌ Erreur lors de la génération du preview:', error);
    return null;
  }
}

/**
 * Optimise les tables de la base de données (VACUUM sur PostgreSQL)
 */
async function optimizeTables() {
  try {
    console.log('⚡ Optimisation des tables...');

    await db.sequelize.query('VACUUM ANALYZE principale.projet_snapshot;');
    await db.sequelize.query('VACUUM ANALYZE principale.audit_log;');
    await db.sequelize.query('VACUUM ANALYZE principale.admin_access_log;');

    console.log('✅ Optimisation terminée');

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de l\'optimisation:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  RETENTION_POLICY,
  cleanupSnapshots,
  cleanupAuditLogs,
  cleanupAdminAccessLogs,
  performFullCleanup,
  getCleanupPreview,
  optimizeTables
};

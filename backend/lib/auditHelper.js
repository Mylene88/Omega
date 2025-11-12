// backend/lib/auditHelper.js

/**
 * Helper pour enregistrer les modifications dans la table audit_log
 */

const db = require('../models');

/**
 * Enregistre une action dans l'audit log
 * @param {Object} params
 * @param {string} params.tableName - Nom de la table modifiée
 * @param {string} params.recordId - ID de l'enregistrement modifié
 * @param {string} params.action - Type d'action: CREATE, UPDATE, DELETE, RESTORE
 * @param {Object} params.oldValues - Valeurs avant modification (pour UPDATE et DELETE)
 * @param {Object} params.newValues - Valeurs après modification (pour CREATE et UPDATE)
 * @param {number} params.userId - ID de l'utilisateur qui effectue l'action
 * @param {string} params.userIp - Adresse IP de l'utilisateur
 * @param {string} params.userAgent - User agent du navigateur
 * @param {Object} params.transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object>} L'entrée d'audit créée
 */
async function logAudit({
  tableName,
  recordId,
  action,
  oldValues = null,
  newValues = null,
  userId = null,
  userIp = null,
  userAgent = null,
  transaction = null
}) {
  try {
    // Calculer les champs qui ont changé
    let changedFields = [];
    if (action === 'UPDATE' && oldValues && newValues) {
      changedFields = Object.keys(newValues).filter(
        key => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
      );
    }

    const auditData = {
      table_name: tableName,
      record_id: String(recordId),
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields.length > 0 ? changedFields : null,
      user_id: userId,
      user_ip: userIp,
      user_agent: userAgent,
      created_at: new Date()
    };

    const options = transaction ? { transaction } : {};
    const auditEntry = await db.AuditLog.create(auditData, options);

    console.log(`📝 Audit log créé: ${action} sur ${tableName}#${recordId} par user#${userId || 'system'}`);
    return auditEntry;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'audit log:', error);
    // Ne pas faire échouer la transaction principale si l'audit échoue
    return null;
  }
}

/**
 * Crée un snapshot complet d'un projet
 * @param {Object} params
 * @param {string} params.idProjet - ID du projet
 * @param {Object} params.projetData - Données complètes du projet
 * @param {string} params.snapshotType - Type de snapshot: AUTO, MANUAL, BEFORE_DELETE
 * @param {string} params.description - Description du snapshot
 * @param {number} params.userId - ID de l'utilisateur
 * @param {Object} params.transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object>} Le snapshot créé
 */
async function createSnapshot({
  idProjet,
  projetData,
  snapshotType = 'AUTO',
  description = null,
  userId = null,
  transaction = null
}) {
  try {
    // Obtenir le prochain numéro de version
    let versionNumber = 1;
    if (userId) {
      try {
        const result = await db.sequelize.query(
          'SELECT principale.get_next_version_number($1, $2) as version',
          {
            replacements: [idProjet, userId],
            type: db.sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        versionNumber = result[0]?.version || 1;
      } catch (error) {
        console.log('⚠️  Impossible de récupérer le numéro de version, utilisation de 1:', error.message);
        versionNumber = 1;
      }
    }

    // Marquer les anciens snapshots comme non courants
    if (userId) {
      try {
        await db.ProjetSnapshot.update(
          { is_current: false },
          {
            where: {
              id_projet: idProjet,
              user_id: userId,
              is_current: true
            },
            transaction
          }
        );
      } catch (error) {
        console.log('⚠️  Impossible de mettre à jour les anciens snapshots:', error.message);
      }
    }

    const snapshotData = {
      id_projet: idProjet,
      snapshot_data: projetData,
      snapshot_type: snapshotType,
      description,
      created_by: userId,
      created_at: new Date(),
      user_id: userId,
      version_number: versionNumber,
      snapshot_date: new Date(),
      is_current: true
    };

    const options = transaction ? { transaction } : {};
    const snapshot = await db.ProjetSnapshot.create(snapshotData, options);

    console.log(`📸 Snapshot créé: ${snapshotType} pour projet#${idProjet} par user#${userId || 'system'} (version ${versionNumber})`);
    return snapshot;
  } catch (error) {
    console.error('❌ Erreur lors de la création du snapshot:', error.message);
    // Ne pas faire échouer la transaction principale si le snapshot échoue
    return null;
  }
}

/**
 * Récupère l'historique d'audit pour un enregistrement
 * @param {string} tableName - Nom de la table
 * @param {string} recordId - ID de l'enregistrement
 * @param {number} limit - Nombre max d'entrées (défaut: 100)
 * @returns {Promise<Array>} Liste des entrées d'audit
 */
async function getAuditHistory(tableName, recordId, limit = 100) {
  try {
    const history = await db.AuditLog.findAll({
      where: {
        table_name: tableName,
        record_id: String(recordId)
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return history;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error);
    return [];
  }
}

/**
 * Récupère les snapshots d'un projet
 * @param {string} idProjet - ID du projet
 * @param {number} limit - Nombre max de snapshots (défaut: 50)
 * @returns {Promise<Array>} Liste des snapshots
 */
async function getProjectSnapshots(idProjet, limit = 50) {
  try {
    const snapshots = await db.ProjetSnapshot.findAll({
      where: {
        id_projet: idProjet
      },
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return snapshots;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des snapshots:', error);
    return [];
  }
}

/**
 * Extrait l'IP et le user agent d'une requête Next.js
 * @param {Object} request - Objet request Next.js
 * @returns {Object} { userIp, userAgent }
 */
function extractRequestInfo(request) {
  const userIp = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { userIp, userAgent };
}

/**
 * Récupère toutes les activités récentes pour le dashboard admin
 * @param {number} limit - Nombre max d'entrées (défaut: 100)
 * @param {Object} filters - Filtres optionnels { userId, tableName, action, dateFrom, dateTo }
 * @returns {Promise<Array>} Liste des entrées d'audit
 */
async function getRecentActivity(limit = 100, filters = {}) {
  try {
    const where = {};

    if (filters.userId) {
      where.user_id = filters.userId;
    }
    if (filters.tableName) {
      where.table_name = filters.tableName;
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) {
        where.created_at[db.sequelize.Sequelize.Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.created_at[db.sequelize.Sequelize.Op.lte] = new Date(filters.dateTo);
      }
    }

    const activities = await db.AuditLog.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return activities;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des activités récentes:', error);
    return [];
  }
}

/**
 * Obtient des statistiques sur les activités
 * @param {Object} filters - Filtres optionnels { dateFrom, dateTo }
 * @returns {Promise<Object>} Statistiques
 */
async function getActivityStats(filters = {}) {
  try {
    const where = {};

    if (filters.dateFrom || filters.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) {
        where.created_at[db.sequelize.Sequelize.Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.created_at[db.sequelize.Sequelize.Op.lte] = new Date(filters.dateTo);
      }
    }

    // Compter les actions par type
    const actionCounts = await db.AuditLog.findAll({
      attributes: [
        'action',
        [db.sequelize.fn('COUNT', db.sequelize.col('id_audit')), 'count']
      ],
      where,
      group: ['action'],
      raw: true
    });

    // Compter les actions par table
    const tableCounts = await db.AuditLog.findAll({
      attributes: [
        'table_name',
        [db.sequelize.fn('COUNT', db.sequelize.col('id_audit')), 'count']
      ],
      where,
      group: ['table_name'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id_audit')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Utilisateurs les plus actifs
    const activeUsers = await db.AuditLog.findAll({
      attributes: [
        'user_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('id_audit')), 'count']
      ],
      where: {
        ...where,
        user_id: { [db.sequelize.Sequelize.Op.ne]: null }
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['username', 'prenom', 'nom']
        }
      ],
      group: ['user_id', 'user.id_user', 'user.username', 'user.prenom', 'user.nom'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id_audit')), 'DESC']],
      limit: 10
    });

    return {
      actionCounts,
      tableCounts,
      activeUsers
    };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    return {
      actionCounts: [],
      tableCounts: [],
      activeUsers: []
    };
  }
}

module.exports = {
  logAudit,
  createSnapshot,
  getAuditHistory,
  getProjectSnapshots,
  extractRequestInfo,
  getRecentActivity,
  getActivityStats
};

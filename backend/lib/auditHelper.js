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
 * Crée un snapshot complet d'un projet avec sections
 * @param {Object} params
 * @param {string} params.idProjet - ID du projet
 * @param {Object} params.projetData - Données complètes du projet
 * @param {string} params.description - Description du snapshot
 * @param {number} params.userId - ID de l'utilisateur (requis)
 * @param {Object} params.transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object>} Le snapshot créé
 */
async function createSnapshot({
  idProjet,
  projetData,
  description = null,
  userId,
  transaction = null
}) {
  try {
    console.log('\n=== 📸 CRÉATION DE SNAPSHOT ===');
    console.log(`Projet ID: ${idProjet}`);
    console.log(`User ID: ${userId}`);
    console.log(`Description: ${description || 'Aucune'}`);

    if (!userId) {
      throw new Error('userId est requis pour créer un snapshot');
    }

    // Vérifier les données du projet
    console.log('📦 Données du projet reçues:');
    console.log(`  - nom_projet: ${projetData.nom_projet}`);
    console.log(`  - porteurs: ${projetData.porteurs?.length || 0} entrée(s)`);
    console.log(`  - suivis: ${projetData.suivis?.length || 0} entrée(s)`);
    console.log(`  - projet_in_thematiques: ${projetData.projet_in_thematiques?.length || 0} entrée(s)`);
    console.log(`  - documents: ${projetData.documents?.length || 0} entrée(s)`);
    console.log(`  - geometry: ${projetData.geometry ? 'Présente' : 'Absente'}`);

    // Obtenir le prochain numéro de version
    console.log('🔢 Calcul du numéro de version...');
    const versionNumber = await db.sequelize.query(
      'SELECT principale.get_next_version_number(:idProjet, :userId) as version',
      {
        replacements: { idProjet, userId },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const nextVersion = versionNumber[0].version;
    console.log(`  ✅ Prochaine version: ${nextVersion}`);

    // Marquer toutes les versions précédentes comme non-courantes
    await db.ProjetSnapshot.update(
      { is_current: false },
      {
        where: { id_projet: idProjet, user_id: userId },
        transaction
      }
    );

    // ✅ Si on réutilise un numéro de version (rotation), supprimer l'ancien snapshot
    // Cela arrive quand on dépasse 10 versions et qu'on revient à 1
    console.log('🔍 Vérification de rotation de version...');
    const existingSnapshot = await db.ProjetSnapshot.findOne({
      where: {
        id_projet: idProjet,
        user_id: userId,
        version_number: nextVersion
      },
      transaction
    });

    if (existingSnapshot) {
      console.log(`🔄 Rotation de version détectée - Suppression du snapshot v${nextVersion} existant`);
      // Supprimer d'abord les sections associées
      if (db.ProjetSnapshotSection) {
        await db.ProjetSnapshotSection.destroy({
          where: { id_snapshot: existingSnapshot.id_snapshot },
          transaction
        });
        console.log('  ✅ Sections de l\'ancien snapshot supprimées');
      }
      // Puis supprimer le snapshot
      await existingSnapshot.destroy({ transaction });
      console.log('  ✅ Ancien snapshot supprimé');
    } else {
      console.log('  ℹ️  Pas de rotation nécessaire');
    }

    // Créer le snapshot
    const snapshotData = {
      id_projet: idProjet,
      user_id: userId,
      version_number: nextVersion,
      snapshot_date: new Date(),
      description,
      is_current: true,
      created_at: new Date()
    };

    const options = transaction ? { transaction } : {};
    console.log('\n💾 Création du snapshot en base de données...');
    const snapshot = await db.ProjetSnapshot.create(snapshotData, options);
    console.log(`  ✅ Snapshot créé avec ID: ${snapshot.id_snapshot}`);

    // Créer les sections (si projetData fourni)
    if (projetData && db.ProjetSnapshotSection) {
      try {
        console.log('\n📋 Création des sections du snapshot...');
        const sections = [
          { section_name: 'projet_info', section_data: {
            nom_projet: projetData.nom_projet,
            description: projetData.description,
            statut_projet_id: projetData.statut_projet_id,
            date_ident_projet: projetData.date_ident_projet,
            projet_signale: projetData.projet_signale,
            charte_accueil: projetData.charte_accueil,
            service_id: projetData.service_id,
            referent_ddt: projetData.referent_ddt
          }},
          { section_name: 'porteurs', section_data: projetData.porteurs || [] },
          { section_name: 'suivis', section_data: projetData.suivis || [] },
          { section_name: 'thematiques', section_data: projetData.projet_in_thematiques || [] },
          { section_name: 'documents', section_data: projetData.documents || [] },
          { section_name: 'geometrie', section_data: projetData.geometry || {} }
        ];

        for (const section of sections) {
          const sectionDataLength = Array.isArray(section.section_data)
            ? section.section_data.length
            : (section.section_data ? 1 : 0);

          console.log(`  📝 Section "${section.section_name}": ${sectionDataLength} élément(s)`);

          await db.ProjetSnapshotSection.create({
            id_snapshot: snapshot.id_snapshot,
            ...section,
            created_at: new Date()
          }, options);
        }
        console.log('  ✅ Toutes les sections créées avec succès');
      } catch (error) {
        console.log('⚠️  Impossible de créer les sections du snapshot:', error.message);
      }
    }

    console.log(`\n✅ Snapshot v${nextVersion} créé avec succès pour projet#${idProjet} par user#${userId}`);
    console.log('=== FIN CRÉATION SNAPSHOT ===\n');
    return snapshot;
  } catch (error) {
    console.error('❌ Erreur lors de la création du snapshot:', error.message);
    throw error;
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
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.ProjetSnapshotSection,
          as: 'sections',
          required: false
        }
      ],
      order: [['snapshot_date', 'DESC']],
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

/**
 * Crée une version pour une section spécifique d'un projet
 * @param {Object} params
 * @param {string} params.idProjet - ID du projet
 * @param {number} params.userId - ID de l'utilisateur
 * @param {string} params.sectionName - Nom de la section (projet_info, porteurs, suivis, thematiques, documents, geometrie)
 * @param {Object|Array} params.sectionData - Données de la section
 * @param {string} params.description - Description optionnelle
 * @param {Object} params.transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object>} La version de section créée
 */
async function createSectionVersion({
  idProjet,
  userId,
  sectionName,
  sectionData,
  description = null,
  transaction = null
}) {
  try {
    console.log(`📋 [SECTION VERSION] Création version pour ${sectionName} du projet ${idProjet} par user ${userId}`);

    if (!userId) {
      throw new Error('userId est requis pour créer une version de section');
    }

    const validSections = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
    if (!validSections.includes(sectionName)) {
      throw new Error(`Section invalide: ${sectionName}. Valeurs autorisées: ${validSections.join(', ')}`);
    }

    // Obtenir le prochain numéro de version pour cette section et cet utilisateur
    const versionNumber = await db.sequelize.query(
      'SELECT principale.get_next_section_version_number(:idProjet, :userId, :sectionName) as version',
      {
        replacements: { idProjet, userId, sectionName },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const nextVersion = versionNumber[0].version;
    console.log(`  ✅ Prochaine version pour ${sectionName}: ${nextVersion}`);

    // Marquer toutes les versions précédentes de cette section comme non-courantes
    await db.SectionVersion.update(
      { is_current: false },
      {
        where: {
          id_projet: idProjet,
          user_id: userId,
          section_name: sectionName
        },
        transaction
      }
    );

    // Si rotation (version 1-10), supprimer l'ancienne version
    const existingVersion = await db.SectionVersion.findOne({
      where: {
        id_projet: idProjet,
        user_id: userId,
        section_name: sectionName,
        version_number: nextVersion
      },
      transaction
    });

    if (existingVersion) {
      console.log(`🔄 [SECTION VERSION] Rotation détectée - Suppression version ${nextVersion} existante`);
      await existingVersion.destroy({ transaction });
    }

    // Créer la nouvelle version
    const versionData = {
      id_projet: idProjet,
      user_id: userId,
      section_name: sectionName,
      version_number: nextVersion,
      section_data: sectionData,
      snapshot_date: new Date(),
      is_current: true,
      description: description || `Version ${nextVersion} de ${sectionName}`,
      created_at: new Date()
    };

    const options = transaction ? { transaction } : {};
    const version = await db.SectionVersion.create(versionData, options);

    console.log(`✅ [SECTION VERSION] Version créée: ${sectionName} v${nextVersion} pour projet ${idProjet}`);
    return version;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la version de section:', error.message);
    // Ne pas bloquer si la création de version échoue
    return null;
  }
}

module.exports = {
  logAudit,
  createSnapshot,
  createSectionVersion,
  getAuditHistory,
  getProjectSnapshots,
  extractRequestInfo,
  getRecentActivity,
  getActivityStats
};

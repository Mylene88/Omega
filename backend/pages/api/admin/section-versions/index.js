// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/section-versions/route.js
/**
 * API admin pour gérer les versions de sections
 */

import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';
import { Op } from 'sequelize';

/**
 * GET /api/admin/section-versions
 * Récupérer toutes les versions de sections avec statistiques
 *
 * Query params:
 * - idProjet: filtrer par projet (optionnel)
 * - userId: filtrer par utilisateur (optionnel)
 * - sectionName: filtrer par section (optionnel)
 * - limit: nombre max de résultats (défaut: 50)
 */


/**
 * DELETE /api/admin/section-versions
 * Déclencher le nettoyage automatique des versions
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier les droits admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    // Query params available in req.query
    const idProjet = req.query.idProjet;
    const userId = req.query.userId;
    const sectionName = req.query.sectionName;
    const limit = parseInt(req.query.limit || '50');

    // Construire les filtres
    const where = {};
    if (idProjet) where.id_projet = idProjet;
    if (userId) where.user_id = parseInt(userId);
    if (sectionName) where.section_name = sectionName;

    // Récupérer les versions
    const versions = await db.SectionVersion.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet']
        }
      ],
      order: [['snapshot_date', 'DESC']],
      limit
    });

    // Récupérer les statistiques globales
    const stats = {
      total: await db.SectionVersion.count({ where }),
      par_section: await db.SectionVersion.findAll({
        attributes: [
          'section_name',
          [db.sequelize.fn('COUNT', db.sequelize.col('id_version')), 'count']
        ],
        where,
        group: ['section_name'],
        raw: true
      }),
      par_utilisateur: await db.SectionVersion.findAll({
        attributes: [
          'user_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('id_version')), 'count']
        ],
        where,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['username', 'prenom', 'nom']
          }
        ],
        group: ['user_id', 'user.id_user', 'user.username', 'user.prenom', 'user.nom'],
        limit: 10,
        order: [[db.sequelize.fn('COUNT', db.sequelize.col('id_version')), 'DESC']],
        raw: false
      })
    };

    // Formater les versions
    const formattedVersions = versions.map(v => ({
      id_version: v.id_version,
      id_projet: v.id_projet,
      projet_nom: v.projet?.nom_projet || 'Projet inconnu',
      section_name: v.section_name,
      version_number: v.version_number,
      snapshot_date: v.snapshot_date,
      is_current: v.is_current,
      description: v.description,
      metadata: v.metadata,
      section_data: v.section_data,
      created_by: v.user ? {
        id: v.user.id_user,
        username: v.user.username,
        nom_complet: `${v.user.prenom || ''} ${v.user.nom || ''}`.trim() || v.user.username
      } : null
    }));

    // Formater les stats par utilisateur
    const formattedUserStats = stats.par_utilisateur.map(s => ({
      user_id: s.user_id,
      username: s.user?.username,
      nom_complet: s.user ? `${s.user.prenom || ''} ${s.user.nom || ''}`.trim() : 'Inconnu',
      count: parseInt(s.dataValues.count)
    }));

    return res.json({
      success: true,
      data: formattedVersions,
      stats: {
        total: stats.total,
        par_section: stats.par_section,
        par_utilisateur: formattedUserStats
      },
      filters: {
        idProjet,
        userId,
        sectionName
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/section-versions:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des versions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'DELETE') {

  try {
    // Vérifier les droits admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    console.log('🧹 Déclenchement du nettoyage des versions de sections par admin...');

    const retentionDays = 15;
    const maxVersionsPerGroup = 10;
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - retentionDays);

    // 1. Supprimer les versions de plus de 15 jours
    const deletedOldVersions = await db.SectionVersion.destroy({
      where: {
        [Op.or]: [
          {
            snapshot_date: {
              [Op.lt]: fifteenDaysAgo
            }
          },
          {
            snapshot_date: {
              [Op.is]: null
            },
            created_at: {
              [Op.lt]: fifteenDaysAgo
            }
          }
        ]
      }
    });

    // 2. Garder max 10 versions par couple (utilisateur, section)
    const groupsOverLimitBefore = await db.sequelize.query(
      `
        SELECT
          user_id,
          section_name,
          COUNT(*)::int AS count
        FROM principale.section_version
        GROUP BY user_id, section_name
        HAVING COUNT(*) > :maxVersions
        ORDER BY count DESC, user_id, section_name
      `,
      {
        replacements: { maxVersions: maxVersionsPerGroup },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const idsToDeleteRows = await db.sequelize.query(
      `
        WITH ranked_versions AS (
          SELECT
            id_version,
            ROW_NUMBER() OVER (
              PARTITION BY user_id, section_name
              ORDER BY snapshot_date DESC NULLS LAST, id_version DESC
            ) AS rn
          FROM principale.section_version
        )
        SELECT id_version
        FROM ranked_versions
        WHERE rn > :maxVersions
      `,
      {
        replacements: { maxVersions: maxVersionsPerGroup },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const idsToDelete = idsToDeleteRows
      .map((row) => parseInt(row.id_version, 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    let totalExcessVersions = 0;
    if (idsToDelete.length > 0) {
      totalExcessVersions = await db.SectionVersion.destroy({
        where: {
          id_version: {
            [Op.in]: idsToDelete
          }
        }
      });
    }

    const groupsOverLimitAfter = await db.sequelize.query(
      `
        SELECT
          user_id,
          section_name,
          COUNT(*)::int AS count
        FROM principale.section_version
        GROUP BY user_id, section_name
        HAVING COUNT(*) > :maxVersions
      `,
      {
        replacements: { maxVersions: maxVersionsPerGroup },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    const remainingCount = await db.SectionVersion.count();

    console.log(`✅ Nettoyage terminé: ${deletedOldVersions} anciennes + ${totalExcessVersions} en excès = ${deletedOldVersions + totalExcessVersions} versions supprimées`);

    return res.json({
      success: true,
      message: 'Nettoyage effectué avec succès',
      data: {
        deleted_old_versions: deletedOldVersions,
        deleted_excess_versions: totalExcessVersions,
        total_deleted: deletedOldVersions + totalExcessVersions,
        remaining_versions: remainingCount,
        policy: {
          retention_days: retentionDays,
          max_versions_per_user_section: maxVersionsPerGroup
        },
        diagnostics: {
          groups_over_limit_before: groupsOverLimitBefore.length,
          groups_over_limit_after: groupsOverLimitAfter.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur DELETE /api/admin/section-versions:', error);
    return res.json({
      success: false,
      message: 'Erreur lors du nettoyage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

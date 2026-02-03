// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/stats/route.js

import { getActivityStats } from '../../../../lib/auditHelper';
import { requireAdminWithLogging } from '../../../../lib/adminMiddleware';
import db from '../../../../models';

/**
 * GET /api/admin/stats
 * Récupère les statistiques d'activité du système
 *
 * Query params:
 * - dateFrom: date de début (format ISO)
 * - dateTo: date de fin (format ISO)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier l'accès admin avec logging automatique
    const authResult = await requireAdminWithLogging(req, 'VIEW_STATS', 'statistics');
    if (authResult.error) {
      return res.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    // Extraire les paramètres de requête
    // Query params available in req.query
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    // Récupérer les statistiques d'activité
    const activityStats = await getActivityStats(filters);

    // Récupérer des statistiques supplémentaires
    const [totalProjets, totalUsers, totalSnapshots, totalAuditEntries] = await Promise.all([
      db.Projet.count(),
      db.User.count(),
      db.ProjetSnapshot.count(),
      db.AuditLog.count()
    ]);

    // Statistiques des projets
    const projetsByStatus = await db.Projet.findAll({
      attributes: [
        'statut_projet_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('id_projet')), 'count']
      ],
      include: [
        {
          model: db.StatutProjetEnum,
          as: 'statut_projet_enum',
          attributes: ['libelle']
        }
      ],
      group: ['statut_projet_id', 'statut_projet_enum.id_statut', 'statut_projet_enum.libelle']
    });

    // Projets récemment créés (derniers 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentProjets = await db.Projet.count({
      where: {
        created_at: {
          [db.sequelize.Sequelize.Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Formater les données
    const stats = {
      overview: {
        totalProjets,
        totalUsers,
        totalSnapshots,
        totalAuditEntries,
        recentProjets
      },
      activity: {
        actionCounts: activityStats.actionCounts.map(ac => ({
          action: ac.action,
          count: parseInt(ac.count)
        })),
        tableCounts: activityStats.tableCounts.map(tc => ({
          tableName: tc.table_name,
          count: parseInt(tc.count)
        })),
        activeUsers: activityStats.activeUsers.map(au => ({
          userId: au.user_id,
          username: au.user?.username,
          nomComplet: `${au.user?.prenom || ''} ${au.user?.nom || ''}`.trim(),
          activityCount: parseInt(au.getDataValue('count'))
        }))
      },
      projets: {
        byStatus: projetsByStatus.map(p => ({
          status: p.statut_projet_enum?.libelle || 'Inconnu',
          count: parseInt(p.getDataValue('count'))
        }))
      }
    };

    return res.json({
      success: true,
      data: stats,
      filters: {
        dateFrom,
        dateTo
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/stats:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

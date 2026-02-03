// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/admin/access-logs/route.js
/**
 * API pour consulter les logs d'accès admin
 */

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { requireAdminWithLogging } from '@/backend/lib/adminMiddleware';
import { Op } from 'sequelize';

export async function GET(request) {
  // Vérification admin avec logging
  const authResult = await requireAdminWithLogging(request, 'VIEW_ACCESS_LOGS', 'admin_access_log');

  if (authResult.error) {
    return NextResponse.json(
      { success: false, message: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    // Paramètres de filtrage
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const success = searchParams.get('success');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Construction des filtres
    const where = {};

    if (userId) {
      where.user_id = parseInt(userId, 10);
    }

    if (action) {
      where.action = { [Op.iLike]: `%${action}%` };
    }

    if (success !== null && success !== undefined && success !== '') {
      where.success = success === 'true';
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at[Op.lte] = new Date(dateTo);
      }
    }

    // Récupération des logs
    const { rows: logs, count } = await db.AdminAccessLog.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id_user', 'username', 'prenom', 'nom'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Formatage des résultats
    const formattedLogs = logs.map(log => ({
      id: log.id_access,
      user: log.user ? {
        id: log.user.id_user,
        username: log.user.username,
        fullName: `${log.user.prenom || ''} ${log.user.nom || ''}`.trim()
      } : null,
      action: log.action,
      resource: log.resource,
      resourceId: log.resource_id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      success: log.success,
      errorMessage: log.error_message,
      durationMs: log.duration_ms,
      createdAt: log.created_at
    }));

    // Statistiques
    const stats = await db.AdminAccessLog.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id_access')), 'total'],
        [db.sequelize.fn('COUNT', db.sequelize.literal('CASE WHEN success = true THEN 1 END')), 'successful'],
        [db.sequelize.fn('COUNT', db.sequelize.literal('CASE WHEN success = false THEN 1 END')), 'failed'],
        [db.sequelize.fn('AVG', db.sequelize.col('duration_ms')), 'avgDurationMs']
      ],
      where,
      raw: true
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total: count,
          limit,
          offset,
          pages: Math.ceil(count / limit)
        },
        stats: {
          total: parseInt(stats[0].total, 10),
          successful: parseInt(stats[0].successful, 10),
          failed: parseInt(stats[0].failed, 10),
          avgDurationMs: parseFloat(stats[0].avgDurationMs || 0).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/access-logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des logs d\'accès',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

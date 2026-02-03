// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/audit/route.js

import { getRecentActivity, getActivityStats, getAuditHistory } from '../../../../lib/auditHelper';
import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';

/**
 * GET /api/admin/audit
 * Récupère l'historique d'audit avec filtres
 *
 * Query params:
 * - limit: nombre max d'entrées (défaut: 100)
 * - userId: filtrer par utilisateur
 * - tableName: filtrer par table
 * - action: filtrer par type d'action (CREATE, UPDATE, DELETE, RESTORE)
 * - recordId: filtrer par ID d'enregistrement (requiert tableName)
 * - dateFrom: date de début (format ISO)
 * - dateTo: date de fin (format ISO)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }
    const userId = adminCheck.userId;

    // Extraire les paramètres de requête
    // Query params available in req.query
    const limit = parseInt(req.query.limit || '100');
    const tableName = req.query.tableName;
    const recordId = req.query.recordId;
    const action = req.query.action;
    const filterUserId = req.query.userId;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    let activities;

    // Si tableName et recordId sont fournis, récupérer l'historique spécifique
    if (tableName && recordId) {
      activities = await getAuditHistory(tableName, recordId, limit);
    } else {
      // Sinon, récupérer les activités récentes avec filtres
      const filters = {};
      if (filterUserId) filters.userId = parseInt(filterUserId);
      if (tableName) filters.tableName = tableName;
      if (action) filters.action = action;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      activities = await getRecentActivity(limit, filters);
    }

    // Formater les données pour le frontend
    const formattedActivities = activities.map(activity => ({
      id: activity.id_audit,
      tableName: activity.table_name,
      recordId: activity.record_id,
      action: activity.action,
      oldValues: activity.old_values,
      newValues: activity.new_values,
      changedFields: activity.changed_fields,
      user: activity.user ? {
        id: activity.user.id_user,
        username: activity.user.username,
        nomComplet: `${activity.user.prenom || ''} ${activity.user.nom || ''}`.trim()
      } : null,
      userIp: activity.user_ip,
      userAgent: activity.user_agent,
      createdAt: activity.created_at ? new Date(activity.created_at).toISOString() : null
    }));

    return res.json({
      success: true,
      data: formattedActivities,
      count: formattedActivities.length,
      filters: {
        limit,
        tableName,
        recordId,
        action,
        userId: filterUserId,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/audit:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique d\'audit',
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

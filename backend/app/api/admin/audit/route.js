// backend/app/api/admin/audit/route.js

import { NextResponse } from 'next/server';
import { getRecentActivity, getActivityStats, getAuditHistory } from '@/backend/lib/auditHelper';
import db from '@/backend/models';

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
function checkAdminAccess(request) {
  // TODO: Implémenter une vraie vérification admin avec JWT
  // Pour l'instant, on va vérifier un header spécial
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null };
  }

  // Extraire l'ID utilisateur du token (à implémenter avec JWT)
  // Pour l'instant, on retourne true si le header est présent
  return { isAdmin: true, userId: null };
}

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
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const { isAdmin, userId } = checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Accès non autorisé. Authentification admin requise.'
      }, { status: 403 });
    }

    // Extraire les paramètres de requête
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const action = searchParams.get('action');
    const filterUserId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

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
      createdAt: activity.created_at
    }));

    return NextResponse.json({
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
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique d\'audit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

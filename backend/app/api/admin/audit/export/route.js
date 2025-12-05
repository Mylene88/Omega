// backend/app/api/admin/audit/export/route.js

import { NextResponse } from 'next/server';
import { getRecentActivity, getAuditHistory } from '@/backend/lib/auditHelper';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';

/**
 * GET /api/admin/audit/export
 * Exporte l'historique d'audit au format CSV
 *
 * Query params: mêmes que /api/admin/audit
 * - format: csv (défaut) ou json
 * - limit: nombre max d'entrées (défaut: 1000)
 * - userId: filtrer par utilisateur
 * - tableName: filtrer par table
 * - action: filtrer par type d'action
 * - recordId: filtrer par ID d'enregistrement
 * - dateFrom: date de début (format ISO)
 * - dateTo: date de fin (format ISO)
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
    }

    // Extraire les paramètres
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const action = searchParams.get('action');
    const filterUserId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log(`📥 [AUDIT EXPORT] Format: ${format}, Limit: ${limit}`);

    let activities;

    // Récupérer les données d'audit
    if (tableName && recordId) {
      activities = await getAuditHistory(tableName, recordId, limit);
    } else {
      const filters = {};
      if (filterUserId) filters.userId = parseInt(filterUserId);
      if (tableName) filters.tableName = tableName;
      if (action) filters.action = action;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      activities = await getRecentActivity(limit, filters);
    }

    if (format === 'json') {
      // Export JSON
      const jsonData = activities.map(activity => ({
        id: activity.id_audit,
        table: activity.table_name,
        record_id: activity.record_id,
        action: activity.action,
        old_values: activity.old_values,
        new_values: activity.new_values,
        changed_fields: activity.changed_fields,
        user_id: activity.user_id,
        username: activity.user?.username || 'N/A',
        user_name: activity.user ? `${activity.user.prenom || ''} ${activity.user.nom || ''}`.trim() : 'N/A',
        user_ip: activity.user_ip,
        user_agent: activity.user_agent,
        created_at: activity.created_at
      }));

      return NextResponse.json({
        success: true,
        data: jsonData,
        count: jsonData.length,
        exported_at: new Date().toISOString()
      });
    }

    // Export CSV
    const rows = [];

    // En-tête
    rows.push([
      'ID',
      'Date/Heure',
      'Utilisateur',
      'Nom Complet',
      'Table',
      'ID Enregistrement',
      'Action',
      'Champs Modifiés',
      'Anciennes Valeurs',
      'Nouvelles Valeurs',
      'IP Utilisateur',
      'User Agent'
    ]);

    // Données
    activities.forEach(activity => {
      const date = activity.created_at
        ? new Date(activity.created_at).toLocaleString('fr-FR')
        : 'N/A';
      const username = activity.user?.username || 'N/A';
      const nomComplet = activity.user
        ? `${activity.user.prenom || ''} ${activity.user.nom || ''}`.trim()
        : 'N/A';
      const changedFields = activity.changed_fields
        ? activity.changed_fields.join(', ')
        : 'N/A';
      const oldValues = activity.old_values
        ? JSON.stringify(activity.old_values)
        : 'N/A';
      const newValues = activity.new_values
        ? JSON.stringify(activity.new_values)
        : 'N/A';

      rows.push([
        activity.id_audit,
        date,
        username,
        nomComplet,
        activity.table_name,
        activity.record_id,
        activity.action,
        changedFields,
        oldValues,
        newValues,
        activity.user_ip || 'N/A',
        activity.user_agent || 'N/A'
      ]);
    });

    // Convertir en CSV
    const csvContent = rows
      .map(row => row.map(cell => {
        const cellStr = String(cell || '');
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    // Ajouter BOM UTF-8 pour Excel
    const bom = '\uFEFF';
    const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit_logs_${timestamp}.csv`;

    console.log(`✅ [AUDIT EXPORT] Export réussi: ${activities.length} entrées`);

    return new NextResponse(csvBuffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ [AUDIT EXPORT]:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de l\'export des journaux d\'audit',
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

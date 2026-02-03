// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/admin/reports/route.js
/**
 * API pour générer et exporter des rapports
 */

import { NextResponse } from 'next/server';
import { requireAdminWithLogging } from '@/backend/lib/adminMiddleware';
import { generateActivityReport, generateSecurityReport } from '@/backend/lib/reportHelper';

/**
 * GET /api/admin/reports
 * Génère un rapport basé sur le type demandé
 *
 * Query params:
 * - type: 'activity' | 'security'
 * - dateFrom: date de début (ISO)
 * - dateTo: date de fin (ISO)
 * - days: nombre de jours (pour security)
 * - format: 'json' | 'csv' (défaut: json)
 */
export async function GET(request) {
  // Vérification admin avec logging
  const authResult = await requireAdminWithLogging(request, 'GENERATE_REPORT', 'reports');

  if (authResult.error) {
    return NextResponse.json(
      { success: false, message: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'activity';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const format = searchParams.get('format') || 'json';

    let report;

    if (type === 'activity') {
      report = await generateActivityReport({ dateFrom, dateTo });
    } else if (type === 'security') {
      report = await generateSecurityReport({ days });
    } else {
      return NextResponse.json({
        success: false,
        message: `Type de rapport inconnu: ${type}`
      }, { status: 400 });
    }

    // Format CSV
    if (format === 'csv') {
      const csv = convertReportToCSV(report, type);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport_${type}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Format JSON (défaut)
    return NextResponse.json({
      success: true,
      data: report,
      generatedAt: new Date().toISOString(),
      generatedBy: authResult.user.username
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/reports:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la génération du rapport',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * Convertit un rapport en CSV
 */
function convertReportToCSV(report, type) {
  let rows = [];

  if (type === 'activity') {
    // En-tête
    rows.push(['Type', 'Donnée'].join(','));
    rows.push(['Période début', report.period.from].join(','));
    rows.push(['Période fin', report.period.to].join(','));
    rows.push(['']);

    // Statistiques
    rows.push(['Statistiques'].join(','));
    rows.push(['Total actions', report.stats.totalActions].join(','));
    rows.push(['Total snapshots', report.stats.totalSnapshots].join(','));
    rows.push(['Total accès', report.stats.totalAccess].join(','));
    rows.push(['']);

    // Audit logs
    rows.push(['Historique d\'audit'].join(','));
    rows.push(['ID', 'Table', 'Record ID', 'Action', 'Utilisateur', 'Date', 'Champs modifiés'].join(','));
    report.auditLogs.forEach(log => {
      rows.push([
        log.id,
        log.table,
        log.recordId,
        log.action,
        `"${log.user}"`,
        log.date,
        `"${log.changedFields}"`
      ].join(','));
    });

  } else if (type === 'security') {
    // En-tête
    rows.push(['Rapport de sécurité'].join(','));
    rows.push(['Période', report.period].join(','));
    rows.push(['']);

    // Résumé
    rows.push(['Résumé'].join(','));
    rows.push(['Total accès', report.summary.totalAccess].join(','));
    rows.push(['Accès réussis', report.summary.successfulAccess].join(','));
    rows.push(['Accès échoués', report.summary.failedAccess].join(','));
    rows.push(['Utilisateurs uniques', report.summary.uniqueUsers].join(','));
    rows.push(['IPs uniques', report.summary.uniqueIPs].join(','));
    rows.push(['']);

    // IPs suspectes
    if (report.alerts.suspiciousIPs.length > 0) {
      rows.push(['IPs suspectes (>= 5 échecs)'].join(','));
      rows.push(['IP', 'Tentatives échouées'].join(','));
      report.alerts.suspiciousIPs.forEach(item => {
        rows.push([item.ip, item.failedAttempts].join(','));
      });
      rows.push(['']);
    }

    // Utilisateurs suspects
    if (report.alerts.suspiciousUsers.length > 0) {
      rows.push(['Utilisateurs suspects (>= 5 échecs)'].join(','));
      rows.push(['User ID', 'Username', 'Tentatives échouées'].join(','));
      report.alerts.suspiciousUsers.forEach(item => {
        rows.push([item.userId, item.username, item.failedAttempts].join(','));
      });
      rows.push(['']);
    }

    // Échecs récents
    rows.push(['Échecs récents'].join(','));
    rows.push(['Date', 'Utilisateur', 'Action', 'IP', 'Erreur'].join(','));
    report.recentFailures.forEach(fail => {
      rows.push([
        fail.date,
        fail.user,
        fail.action,
        fail.ip,
        `"${fail.error}"`
      ].join(','));
    });
  }

  return rows.join('\n');
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

// Force dynamic rendering (no static generation at build time)

// backend/app/api/admin/access-logs/export/route.js

import { requireAdmin } from '../../../../../lib/adminAuthHelper';
import db from '../../../../../models';

/**
 * GET /api/admin/access-logs/export
 * Exporte les journaux d'accès admin au format CSV
 *
 * Query params:
 * - format: csv (défaut) ou json
 * - limit: nombre max d'entrées (défaut: 1000)
 * - action: filtrer par action
 * - success: filtrer par succès (true/false)
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

    // Extraire les paramètres
    // Query params available in req.query
    const format = req.query.format || 'csv';
    const limit = parseInt(req.query.limit || '1000');
    const action = req.query.action;
    const success = req.query.success;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    console.log(`📥 [ACCESS LOGS EXPORT] Format: ${format}, Limit: ${limit}`);

    // Construire la requête
    const where = {};

    if (action) {
      where.action = action;
    }

    if (success !== null && success !== '') {
      where.success = success === 'true';
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at[db.sequelize.Sequelize.Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at[db.sequelize.Sequelize.Op.lte] = new Date(dateTo);
      }
    }

    // Récupérer les logs
    const logs = await db.AdminAccessLog.findAll({
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

    if (format === 'json') {
      // Export JSON
      const jsonData = logs.map(log => ({
        id: log.id_log,
        action: log.action,
        endpoint: log.endpoint,
        method: log.method,
        status_code: log.status_code,
        success: log.success,
        user_id: log.user_id,
        username: log.user?.username || 'N/A',
        user_name: log.user ? `${log.user.prenom || ''} ${log.user.nom || ''}`.trim() : 'N/A',
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        duration_ms: log.duration_ms,
        error_message: log.error_message,
        created_at: log.created_at
      }));

      return res.json({
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
      'Action',
      'Endpoint',
      'Méthode',
      'Status Code',
      'Succès',
      'Utilisateur',
      'Nom Complet',
      'IP',
      'User Agent',
      'Durée (ms)',
      'Message d\'erreur'
    ]);

    // Données
    logs.forEach(log => {
      const date = log.created_at
        ? new Date(log.created_at).toLocaleString('fr-FR')
        : 'N/A';
      const username = log.user?.username || 'N/A';
      const nomComplet = log.user
        ? `${log.user.prenom || ''} ${log.user.nom || ''}`.trim()
        : 'N/A';

      rows.push([
        log.id_log,
        date,
        log.action || 'N/A',
        log.endpoint || 'N/A',
        log.method || 'N/A',
        log.status_code || 'N/A',
        log.success ? 'Oui' : 'Non',
        username,
        nomComplet,
        log.ip_address || 'N/A',
        log.user_agent || 'N/A',
        log.duration_ms || 'N/A',
        log.error_message || ''
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
    const filename = `admin_access_logs_${timestamp}.csv`;

    console.log(`✅ [ACCESS LOGS EXPORT] Export réussi: ${logs.length} entrées`);

    return new NextResponse(csvBuffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ [ACCESS LOGS EXPORT]:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de l\'export des journaux d\'accès admin',
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

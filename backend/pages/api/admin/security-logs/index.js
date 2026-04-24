// backend/pages/api/admin/security-logs/index.js

import db from '../../../../models';
import { checkAdminAccess } from '../../../../lib/adminAuthHelper';

const { SecurityLog, User } = db;

/**
 * GET /api/admin/security-logs
 * Récupère l'historique des connexions et tentatives (admin only)
 * Query params:
 * - limit: nombre de résultats (défaut: 100)
 * - offset: pagination
 * - event_type: filtrer par type d'événement
 * - username: filtrer par username
 */

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Vérifier l'accès admin
      const adminCheck = await checkAdminAccess(req);
      if (!adminCheck.isAdmin) {
        return res.json({
          success: false,
          message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
        }, { status: 403 });
      }

      // Paramètres de requête
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const eventTypeFilter = req.query.event_type;
      const usernameFilter = req.query.username;

      // Construction du filtre
      const whereClause = {};
      if (eventTypeFilter) {
        whereClause.event_type = eventTypeFilter;
      }
      if (usernameFilter) {
        whereClause.username = usernameFilter;
      }

      // Récupérer les logs de sécurité
      const { count, rows: logs } = await SecurityLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id_user', 'username', 'prenom', 'nom'],
            required: false
          }
        ],
        order: [['timestamp', 'DESC']],
        limit,
        offset
      });

      // Formater les données
      const formattedLogs = logs.map(log => ({
        id: log.id,
        event_type: log.event_type,
        severity: log.severity,
        user_id: log.user_id,
        username: log.username,
        user_full_name: log.user ? `${log.user.prenom || ''} ${log.user.nom || ''}`.trim() || log.username : log.username,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        resource: log.resource,
        action: log.action,
        status: log.status,
        details: log.details,
        timestamp: log.timestamp
      }));

      return res.json({
        success: true,
        data: {
          logs: formattedLogs,
          total: count,
          limit,
          offset
        }
      });

    } catch (error) {
      console.error('Erreur GET /api/admin/security-logs:', error);
      return res.json({
        success: false,
        message: 'Erreur lors de la récupération des logs de sécurité',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
  } else if (req.method === 'OPTIONS') {
    return res.status(200).end();
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

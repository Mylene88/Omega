// backend/lib/adminMiddleware.js
/**
 * Middleware amélioré pour l'authentification et la journalisation admin
 */

const jwt = require('jsonwebtoken');
const db = require('../models');
const { getClientIp } = require('../utils/ip');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_a_changer';

/**
 * Extrait les informations de la requête (IP, User Agent) - Pages Router
 */
function extractRequestInfo(req) {
  const headers = req.headers || {};
  const ip = getClientIp(req);
  const userAgent = headers['user-agent'] || 'unknown';

  return { ip, userAgent };
}

/**
 * Journalise un accès admin
 */
async function logAdminAccess({
  userId,
  action,
  resource = null,
  resourceId = null,
  ip = null,
  userAgent = null,
  success = true,
  errorMessage = null,
  durationMs = null
}) {
  try {
    await db.AdminAccessLog.create({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      ip_address: ip,
      user_agent: userAgent,
      success,
      error_message: errorMessage,
      duration_ms: durationMs,
      created_at: new Date()
    });
    console.log(`🔒 Admin access logged: ${action} by user#${userId} - ${success ? '✅' : '❌'}`);
  } catch (error) {
    console.error('❌ Erreur lors du logging d\'accès admin:', error.message);
  }
}

/**
 * Vérifie si l'utilisateur est admin et journalise l'accès
 */
async function requireAdminWithLogging(req, action, resource = null, resourceId = null) {
  const startTime = Date.now();
  const { ip, userAgent } = extractRequestInfo(req);

  try {
    const headers = req.headers || {};
    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    const token = authHeader.replace('Bearer ', '') || null;

    if (!token) {
      await logAdminAccess({
        userId: null,
        action,
        resource,
        resourceId,
        ip,
        userAgent,
        success: false,
        errorMessage: 'Token manquant',
        durationMs: Date.now() - startTime
      });

      return {
        error: {
          status: 401,
          message: 'Token d\'authentification manquant'
        }
      };
    }

    // Vérifier le token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      await logAdminAccess({
        userId: null,
        action,
        resource,
        resourceId,
        ip,
        userAgent,
        success: false,
        errorMessage: `Token invalide: ${err.message}`,
        durationMs: Date.now() - startTime
      });

      return {
        error: {
          status: 401,
          message: 'Token invalide ou expiré'
        }
      };
    }

    // Récupérer l'utilisateur avec son rôle
    const user = await db.User.findByPk(decoded.userId, {
      include: [{
        model: db.RoleEnum,
        as: 'role_enum',
        attributes: ['id_role', 'libelle']
      }]
    });

    if (!user) {
      await logAdminAccess({
        userId: decoded.userId,
        action,
        resource,
        resourceId,
        ip,
        userAgent,
        success: false,
        errorMessage: 'Utilisateur non trouvé',
        durationMs: Date.now() - startTime
      });

      return {
        error: {
          status: 404,
          message: 'Utilisateur non trouvé'
        }
      };
    }

    // Vérifier le rôle admin
    const userRole = user.role_enum?.libelle?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrateur';

    if (!isAdmin) {
      await logAdminAccess({
        userId: user.id_user,
        action,
        resource,
        resourceId,
        ip,
        userAgent,
        success: false,
        errorMessage: `Accès refusé: rôle ${userRole || 'inconnu'}`,
        durationMs: Date.now() - startTime
      });

      return {
        error: {
          status: 403,
          message: 'Accès refusé. Droits administrateur requis.'
        }
      };
    }

    // Journaliser l'accès réussi
    await logAdminAccess({
      userId: user.id_user,
      action,
      resource,
      resourceId,
      ip,
      userAgent,
      success: true,
      durationMs: Date.now() - startTime
    });

    return {
      user: {
        id: user.id_user,
        username: user.username,
        role: userRole,
        fullName: `${user.prenom || ''} ${user.nom || ''}`.trim()
      }
    };

  } catch (error) {
    console.error('❌ Erreur dans requireAdminWithLogging:', error);

    await logAdminAccess({
      userId: null,
      action,
      resource,
      resourceId,
      ip,
      userAgent,
      success: false,
      errorMessage: error.message,
      durationMs: Date.now() - startTime
    });

    return {
      error: {
        status: 500,
        message: 'Erreur serveur lors de la vérification des droits'
      }
    };
  }
}

/**
 * Journalise une connexion admin
 */
async function logAdminLogin(userId, ip, userAgent, success, errorMessage = null) {
  await logAdminAccess({
    userId,
    action: 'ADMIN_LOGIN',
    resource: 'auth',
    resourceId: null,
    ip,
    userAgent,
    success,
    errorMessage
  });
}

/**
 * Journalise une déconnexion admin
 */
async function logAdminLogout(userId, ip, userAgent) {
  await logAdminAccess({
    userId,
    action: 'ADMIN_LOGOUT',
    resource: 'auth',
    resourceId: null,
    ip,
    userAgent,
    success: true
  });
}

module.exports = {
  requireAdminWithLogging,
  logAdminAccess,
  logAdminLogin,
  logAdminLogout,
  extractRequestInfo
};

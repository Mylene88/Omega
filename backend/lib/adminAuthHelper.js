// backend/lib/adminAuthHelper.js

import jwt from 'jsonwebtoken';
import db from '../models';

const { User, RoleEnum } = db;

/**
 * Vérifie si l'utilisateur est admin à partir du token JWT
 * @param {Request} request - Requête Next.js
 * @returns {Promise<{isAdmin: boolean, userId: number|null, error: string|null}>}
 */
export async function checkAdminAccess(request) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Token d\'authentification manquant'
      };
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini dans .env');
      return {
        isAdmin: false,
        userId: null,
        error: 'Erreur de configuration serveur'
      };
    }

    // Vérifier et décoder le token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Token invalide ou expiré'
      };
    }

    const userId = decoded.userId;

    if (!userId) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Token invalide'
      };
    }

    // Récupérer l'utilisateur avec son rôle
    const user = await User.findByPk(userId, {
      include: [
        {
          model: RoleEnum,
          as: 'role_enum',
          attributes: ['id_role', 'libelle']
        }
      ]
    });

    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Utilisateur non trouvé'
      };
    }

    // Vérifier si l'utilisateur est admin
    const roleLibelle = user.role_enum?.libelle?.toLowerCase();
    const isAdmin = roleLibelle === 'admin' || roleLibelle === 'administrateur';

    if (!isAdmin) {
      return {
        isAdmin: false,
        userId: user.id_user,
        error: 'Accès refusé. Droits administrateur requis.'
      };
    }

    return {
      isAdmin: true,
      userId: user.id_user,
      error: null
    };

  } catch (error) {
    console.error('❌ Erreur lors de la vérification admin:', error);
    return {
      isAdmin: false,
      userId: null,
      error: 'Erreur lors de la vérification des droits'
    };
  }
}

/**
 * Middleware pour protéger les routes admin
 * Retourne une réponse 403 si l'utilisateur n'est pas admin
 */
export async function requireAdmin(request) {
  const { isAdmin, userId, error } = await checkAdminAccess(request);

  if (!isAdmin) {
    return {
      allowed: false,
      response: {
        success: false,
        message: error || 'Accès refusé'
      },
      status: 403,
      userId: null
    };
  }

  return {
    allowed: true,
    userId
  };
}
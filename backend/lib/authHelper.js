// backend/lib/authHelper.js

import jwt from 'jsonwebtoken';
import db from '../models';

const { User } = db;

/**
 * Vérifie l'authentification de l'utilisateur à partir du token JWT
 * @param {Object} req - Requête Next.js Pages Router
 * @returns {Promise<{authenticated: boolean, userId: number|null, error: string|null}>}
 */
export async function checkAuth(req) {
  try {
    const headers = req.headers || {};
    const authHeader = headers['authorization'] || headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        userId: null,
        error: 'Token d\'authentification manquant'
      };
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini dans .env.developpement.developpement');
      return {
        authenticated: false,
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
        authenticated: false,
        userId: null,
        error: 'Token invalide ou expiré'
      };
    }

    const userId = decoded.userId;

    if (!userId) {
      return {
        authenticated: false,
        userId: null,
        error: 'Token invalide'
      };
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);

    if (!user) {
      return {
        authenticated: false,
        userId: null,
        error: 'Utilisateur non trouvé'
      };
    }

    return {
      authenticated: true,
      userId: user.id_user,
      error: null
    };

  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'authentification:', error);
    return {
      authenticated: false,
      userId: null,
      error: 'Erreur lors de la vérification d\'authentification'
    };
  }
}

/**
 * Middleware pour protéger les routes authentifiées
 * Retourne une réponse 401 si l'utilisateur n'est pas authentifié
 */
export async function requireAuth(request) {
  const { authenticated, userId, error } = await checkAuth(request);

  if (!authenticated) {
    return {
      allowed: false,
      response: {
        success: false,
        message: error || 'Non authentifié'
      },
      status: 401,
      userId: null
    };
  }

  return {
    allowed: true,
    userId
  };
}

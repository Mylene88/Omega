// frontend/src/utils/userHelper.js

/**
 * Récupère l'ID de l'utilisateur connecté depuis localStorage
 * @returns {number|null} L'ID de l'utilisateur ou null si non connecté
 */
export function getCurrentUserId() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return user?.id_user || user?.id || null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'userId:', error);
    return null;
  }
}

/**
 * Récupère l'utilisateur complet depuis localStorage
 * @returns {Object|null} L'objet utilisateur ou null si non connecté
 */
export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
}

/**
 * Crée les headers HTTP avec l'userId pour les requêtes API
 * Utile pour le système de versioning
 * @param {Object} additionalHeaders - Headers supplémentaires optionnels
 * @returns {Object} Headers HTTP avec x-user-id
 */
export function getApiHeaders(additionalHeaders = {}) {
  const userId = getCurrentUserId();

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  if (userId) {
    headers['x-user-id'] = userId.toString();
  }

  return headers;
}

/**
 * Ajoute l'userId au body d'une requête
 * @param {Object} data - Données à envoyer
 * @returns {Object} Données avec userId ajouté
 */
export function addUserIdToBody(data) {
  const userId = getCurrentUserId();

  if (userId) {
    return {
      ...data,
      userId
    };
  }

  return data;
}

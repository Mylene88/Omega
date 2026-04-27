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
 * Crée les headers HTTP sécurisés pour les requêtes API
 * Utilise le JWT stocké en localStorage
 * @param {Object} additionalHeaders - Headers supplémentaires optionnels
 * @returns {Object} Headers HTTP
 */
export function getApiHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Conservé pour compatibilité: ne modifie plus le body côté client.
 * @param {Object} data - Données à envoyer
 * @returns {Object} Données inchangées
 */
export function addUserIdToBody(data) {
  return data;
}

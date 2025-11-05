// backend/utils/response.js

/**
 * Crée une réponse de succès standardisée
 * @param {any} data - Données à retourner
 * @param {string} message - Message de succès (optionnel)
 * @param {number} status - Code de statut HTTP (défaut: 200)
 * @returns {Object} Objet de réponse formaté
 */
function successResponse(data, message = null, status = 200) {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  // Retourner juste l'objet, pas NextResponse
  // NextResponse sera appelé dans la route API
  return { body: response, status };
}

/**
 * Crée une réponse d'erreur standardisée
 * @param {string} error - Message d'erreur
 * @param {number} status - Code de statut HTTP (défaut: 500)
 * @param {string} details - Détails de l'erreur (optionnel)
 * @returns {Object} Objet de réponse d'erreur formaté
 */
function errorResponse(error, status = 500, details = null) {
  const response = {
    success: false,
    error
  };
  
  if (details) {
    response.details = details;
  }
  
  return { body: response, status };
}

/**
 * Crée une réponse de validation échouée
 * @param {string[]} errors - Liste des erreurs de validation
 * @returns {Object} Objet de réponse d'erreur de validation
 */
function validationErrorResponse(errors) {
  return {
    body: {
      success: false,
      error: 'Erreurs de validation',
      validation_errors: errors
    },
    status: 400
  };
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse
};

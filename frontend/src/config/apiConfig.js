// frontend/src/config/apiConfig.js
/**
 * Configuration centralisée de l'API pour l'application OMEGA
 *
 * Ce fichier centralise toutes les URLs d'API pour faciliter le passage en production.
 *
 * DÉVELOPPEMENT : utilise localhost:3000
 * PRODUCTION : utilise la variable d'environnement REACT_APP_API_URL
 *
 * Usage:
 * import { API_BASE_URL, buildApiUrl } from '../config/apiConfig';
 * const response = await fetch(buildApiUrl('/api/projets'));
 */

// URL de base de l'API backend
// En développement : http://localhost:3000
// En production : défini dans .env.production (REACT_APP_API_URL)
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Construit une URL complète pour un endpoint API
 * @param {string} endpoint - L'endpoint de l'API (ex: '/api/projets', 'api/users/1')
 * @returns {string} L'URL complète
 *
 * @example
 * buildApiUrl('/api/projets') // => 'http://localhost:3000/api/projets'
 * buildApiUrl('api/users/1')  // => 'http://localhost:3000/api/users/1'
 */
export const buildApiUrl = (endpoint) => {
  // Nettoyer l'endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Fonction helper pour faire des appels API avec gestion d'erreur
 * @param {string} endpoint - L'endpoint de l'API
 * @param {RequestInit} options - Options fetch (method, headers, body, etc.)
 * @returns {Promise<any>} La réponse JSON
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);

  // Ajouter le token JWT si disponible
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(error.message || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Erreur API ${endpoint}:`, error);
    throw error;
  }
};

// Endpoints fréquemment utilisés (pour référence et autocomplétion)
export const API_ENDPOINTS = {
  // Authentification
  AUTH_LOGIN: '/api/auth/login',
  AUTH_CHANGE_PASSWORD: '/api/auth/change-password',

  // Projets
  PROJETS: '/api/projets',
  PROJET_BY_ID: (id) => `/api/projets/${id}`,
  PROJET_GENERATE_ID: '/api/projets/generate-id',
  PROJET_EXPORT: (id, format) => `/api/projets/${id}/export?format=${format}`,

  // Géométries
  PROJET_GEOMETRY: '/api/projet-geometry',
  PROJET_GEOMETRY_BY_ID: (id) => `/api/projet-geometry/${id}`,
  GEOMETRY_TEMP: '/api/geometry-temp',
  GEO_ENTITIES: '/api/geo-entities',

  // Thématiques
  THEMATIQUES: '/api/thematiques',
  THEMATIQUES_MODELES: '/api/thematiques/modeles',

  // Services et statuts
  SERVICE: '/api/service',
  STATUT: '/api/statut',

  // Demandes de suppression
  DELETION_REQUESTS: '/api/deletion-requests',

  // Admin
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_AUDIT: '/api/admin/audit',
  ADMIN_AUDIT_EXPORT: '/api/admin/audit/export',
  ADMIN_ACCESS_LOGS: '/api/admin/access-logs',
  ADMIN_ACCESS_LOGS_EXPORT: '/api/admin/access-logs/export',
  ADMIN_BACKUP: '/api/admin/backup',
  ADMIN_SNAPSHOTS: '/api/admin/snapshots',
  ADMIN_USERS: '/api/admin/users'
};

// Log de configuration (développement uniquement)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    API_BASE_URL,
    environment: process.env.NODE_ENV,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  });
}

// Export par défaut
export default {
  API_BASE_URL,
  buildApiUrl,
  apiCall,
  API_ENDPOINTS
};

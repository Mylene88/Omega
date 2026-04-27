// frontend/src/hooks/useApiWithUserId.js

import { useCallback } from 'react';
import { getCurrentUserId, getApiHeaders } from '../utils/userHelper';

/**
 * Hook personnalisé pour faire des appels API authentifiés.
 * Conservé pour compatibilité, sans injection d'userId côté client.
 */
export function useApiWithUserId() {
  /**
   * Effectue une requête fetch avec les headers API standardisés
   * @param {string} url - URL de l'API
   * @param {Object} options - Options fetch
   * @returns {Promise<Response>}
   */
  const fetchWithUserId = useCallback(async (url, options = {}) => {
    // Préparer les headers
    const headers = {
      ...getApiHeaders(),
      ...(options.headers || {})
    };

    // Effectuer la requête
    return fetch(url, {
      ...options,
      headers,
      body: options.body
    });
  }, []);

  /**
   * POST authentifié
   */
  const post = useCallback(async (url, data) => {
    return fetchWithUserId(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }, [fetchWithUserId]);

  /**
   * PUT authentifié
   */
  const put = useCallback(async (url, data) => {
    return fetchWithUserId(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }, [fetchWithUserId]);

  /**
   * PATCH authentifié
   */
  const patch = useCallback(async (url, data) => {
    return fetchWithUserId(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }, [fetchWithUserId]);

  /**
   * DELETE authentifié
   */
  const del = useCallback(async (url, data = {}) => {
    return fetchWithUserId(url, {
      method: 'DELETE',
      body: JSON.stringify(data)
    });
  }, [fetchWithUserId]);

  return {
    fetchWithUserId,
    post,
    put,
    patch,
    delete: del,
    userId: getCurrentUserId()
  };
}

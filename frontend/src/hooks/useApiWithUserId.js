// frontend/src/hooks/useApiWithUserId.js

import { useCallback } from 'react';
import { getCurrentUserId, getApiHeaders } from '../utils/userHelper';

/**
 * Hook personnalisé pour faire des appels API avec l'userId automatiquement ajouté
 * Utile pour le système de versioning des sections
 */
export function useApiWithUserId() {
  /**
   * Effectue une requête fetch avec l'userId dans les headers
   * @param {string} url - URL de l'API
   * @param {Object} options - Options fetch
   * @returns {Promise<Response>}
   */
  const fetchWithUserId = useCallback(async (url, options = {}) => {
    const userId = getCurrentUserId();

    // Préparer les headers
    const headers = {
      ...getApiHeaders(),
      ...(options.headers || {})
    };

    // Préparer le body avec userId
    let body = options.body;
    if (body && typeof body === 'string') {
      try {
        const bodyData = JSON.parse(body);
        if (userId && !bodyData.userId) {
          bodyData.userId = userId;
        }
        body = JSON.stringify(bodyData);
      } catch (e) {
        // Si le body n'est pas du JSON, on le laisse tel quel
      }
    }

    // Effectuer la requête
    return fetch(url, {
      ...options,
      headers,
      body
    });
  }, []);

  /**
   * POST avec userId
   */
  const post = useCallback(async (url, data) => {
    const userId = getCurrentUserId();
    const bodyData = userId ? { ...data, userId } : data;

    return fetchWithUserId(url, {
      method: 'POST',
      body: JSON.stringify(bodyData)
    });
  }, [fetchWithUserId]);

  /**
   * PUT avec userId
   */
  const put = useCallback(async (url, data) => {
    const userId = getCurrentUserId();
    const bodyData = userId ? { ...data, userId } : data;

    return fetchWithUserId(url, {
      method: 'PUT',
      body: JSON.stringify(bodyData)
    });
  }, [fetchWithUserId]);

  /**
   * PATCH avec userId
   */
  const patch = useCallback(async (url, data) => {
    const userId = getCurrentUserId();
    const bodyData = userId ? { ...data, userId } : data;

    return fetchWithUserId(url, {
      method: 'PATCH',
      body: JSON.stringify(bodyData)
    });
  }, [fetchWithUserId]);

  /**
   * DELETE avec userId
   */
  const del = useCallback(async (url, data = {}) => {
    const userId = getCurrentUserId();
    const bodyData = userId ? { ...data, userId } : data;

    return fetchWithUserId(url, {
      method: 'DELETE',
      body: JSON.stringify(bodyData)
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

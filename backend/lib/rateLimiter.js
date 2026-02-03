// backend/lib/rateLimiter.js

/**
 * Système de rate limiting pour protéger contre les attaques par force brute
 * Conforme aux recommandations ANSSI (règle 20 - authentification forte)
 */

class RateLimiter {
  constructor() {
    // Stockage en mémoire des tentatives
    // En production, utiliser Redis pour persistence entre redémarrages
    this.attempts = new Map();
    this.blockedIPs = new Map();

    // Configuration
    this.MAX_ATTEMPTS = 5;
    this.WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    this.BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes de blocage après dépassement

    // Nettoyage automatique toutes les heures
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Vérifie si une requête est autorisée
   * @param {string} identifier - Identifiant unique (username:ip ou juste ip)
   * @returns {Object} { allowed: boolean, retryAfter?: number, attemptsLeft?: number }
   */
  checkLimit(identifier) {
    const now = Date.now();

    // Vérifier si l'identifiant est bloqué
    if (this.blockedIPs.has(identifier)) {
      const blockedUntil = this.blockedIPs.get(identifier);
      if (now < blockedUntil) {
        return {
          allowed: false,
          retryAfter: Math.ceil((blockedUntil - now) / 1000), // en secondes
          reason: 'BLOCKED'
        };
      } else {
        // Débloquer après expiration
        this.blockedIPs.delete(identifier);
        this.attempts.delete(identifier);
      }
    }

    // Récupérer les tentatives existantes
    const attemptData = this.attempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
      lastAttempt: now
    };

    // Reset si la fenêtre temporelle est expirée
    if (now - attemptData.firstAttempt > this.WINDOW_MS) {
      attemptData.count = 0;
      attemptData.firstAttempt = now;
    }

    // Vérifier si limite atteinte
    if (attemptData.count >= this.MAX_ATTEMPTS) {
      // Bloquer l'identifiant
      const blockedUntil = now + this.BLOCK_DURATION_MS;
      this.blockedIPs.set(identifier, blockedUntil);

      console.warn(`🚨 RATE LIMIT: Identifiant bloqué - ${identifier} - ${this.MAX_ATTEMPTS} tentatives dépassées`);

      return {
        allowed: false,
        retryAfter: Math.ceil(this.BLOCK_DURATION_MS / 1000),
        reason: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    return {
      allowed: true,
      attemptsLeft: this.MAX_ATTEMPTS - attemptData.count
    };
  }

  /**
   * Enregistre une tentative (succès ou échec)
   * @param {string} identifier - Identifiant unique
   * @param {boolean} success - Si la tentative a réussi
   */
  recordAttempt(identifier, success = false) {
    const now = Date.now();

    // Si succès, reset les tentatives
    if (success) {
      this.attempts.delete(identifier);
      this.blockedIPs.delete(identifier);
      return;
    }

    // Enregistrer l'échec
    const attemptData = this.attempts.get(identifier) || {
      count: 0,
      firstAttempt: now,
      lastAttempt: now
    };

    attemptData.count++;
    attemptData.lastAttempt = now;

    this.attempts.set(identifier, attemptData);

    console.log(`⚠️  Tentative échouée pour ${identifier} - ${attemptData.count}/${this.MAX_ATTEMPTS}`);
  }

  /**
   * Reset manuel des tentatives pour un identifiant
   * @param {string} identifier
   */
  reset(identifier) {
    this.attempts.delete(identifier);
    this.blockedIPs.delete(identifier);
    console.log(`✅ Rate limit reset pour ${identifier}`);
  }

  /**
   * Nettoyage automatique des anciennes entrées
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Nettoyer les tentatives expirées
    for (const [identifier, data] of this.attempts.entries()) {
      if (now - data.lastAttempt > this.WINDOW_MS) {
        this.attempts.delete(identifier);
        cleaned++;
      }
    }

    // Nettoyer les blocages expirés
    for (const [identifier, blockedUntil] of this.blockedIPs.entries()) {
      if (now > blockedUntil) {
        this.blockedIPs.delete(identifier);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Rate limiter: ${cleaned} entrées nettoyées`);
    }
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      activeAttempts: this.attempts.size,
      blockedIdentifiers: this.blockedIPs.size,
      config: {
        maxAttempts: this.MAX_ATTEMPTS,
        windowMinutes: this.WINDOW_MS / 60000,
        blockDurationMinutes: this.BLOCK_DURATION_MS / 60000
      }
    };
  }
}

// Instance singleton
const rateLimiter = new RateLimiter();

/**
 * Fonction helper pour vérifier le rate limit sur les connexions
 * @param {string} username
 * @param {string} ipAddress
 */
export function checkLoginRateLimit(username, ipAddress) {
  // Combiner username et IP pour un rate limit plus précis
  const identifier = `${username}:${ipAddress}`;
  return rateLimiter.checkLimit(identifier);
}

/**
 * Enregistrer une tentative de connexion
 * @param {string} username
 * @param {string} ipAddress
 * @param {boolean} success
 */
export function recordLoginAttempt(username, ipAddress, success) {
  const identifier = `${username}:${ipAddress}`;
  rateLimiter.recordAttempt(identifier, success);
}

/**
 * Reset manuel du rate limit (pour admin)
 * @param {string} username
 * @param {string} ipAddress
 */
export function resetRateLimit(username, ipAddress) {
  const identifier = `${username}:${ipAddress}`;
  rateLimiter.reset(identifier);
}

/**
 * Obtenir les statistiques du rate limiter
 */
export function getRateLimiterStats() {
  return rateLimiter.getStats();
}

export default rateLimiter;

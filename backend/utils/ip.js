// backend/utils/ip.js

/**
 * Extrait l'adresse IP du client depuis la requête
 * Supporte :
 * - Proxy headers (x-forwarded-for, x-real-ip) pour production
 * - Socket local pour développement
 * 
 * @param {Object} req - Requête Next.js/Express
 * @returns {string} Adresse IP du client
 */
function getClientIp(req) {
  // Headers de proxy (production avec nginx, load balancer, etc.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for peut contenir plusieurs IPs séparées par des virgules
    // La première est l'IP du client original
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.trim();
  }

  // Connexion directe (développement local)
  if (req.socket?.remoteAddress) {
    // Convertir ::1 (IPv6 localhost) en 127.0.0.1 (IPv4)
    const ip = req.socket.remoteAddress;
    return ip === '::1' ? '127.0.0.1' : ip;
  }

  if (req.connection?.remoteAddress) {
    const ip = req.connection.remoteAddress;
    return ip === '::1' ? '127.0.0.1' : ip;
  }

  // Fallback
  return 'unknown';
}

module.exports = {
  getClientIp
};

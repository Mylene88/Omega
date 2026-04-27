// backend/middleware.js

import { NextResponse } from 'next/server';

/**
 * Middleware Next.js avec headers de sécurité renforcés
 * Conforme aux recommandations OWASP et ANSSI
 */

// Configuration CORS - À adapter selon l'environnement
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://10.28.8.236:3001'
];

const PRODUCTION_BLOCKED_API_PREFIXES = [
  '/api/run-migration',
  '/api/debug',
  '/api/test'
];

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  if (process.env.NODE_ENV === 'production' && PRODUCTION_BLOCKED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.json(
      {
        success: false,
        message: 'Endpoint désactivé en production'
      },
      { status: 404 }
    );
  }

  const origin = request.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: getSecurityHeaders(allowedOrigin),
    });
  }

  // Pour les autres requêtes, ajouter tous les headers de sécurité
  const response = NextResponse.next();

  // Appliquer tous les headers de sécurité
  const headers = getSecurityHeaders(allowedOrigin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Génère l'ensemble complet des headers de sécurité
 * @param {string} allowedOrigin - Origine autorisée pour CORS
 * @returns {Object} Headers de sécurité
 */
function getSecurityHeaders(allowedOrigin) {
  return {
    // === CORS (Cross-Origin Resource Sharing) ===
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24h

    // === Protection Clickjacking ===
    // Empêche l'intégration de la page dans une iframe
    'X-Frame-Options': 'DENY',

    // === Protection MIME Sniffing ===
    // Force le navigateur à respecter le Content-Type déclaré
    'X-Content-Type-Options': 'nosniff',

    // === Protection XSS (legacy) ===
    // Active le filtre XSS du navigateur (pour anciens navigateurs)
    'X-XSS-Protection': '1; mode=block',

    // === Referrer Policy ===
    // Contrôle les informations envoyées dans le header Referer
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // === Permissions Policy ===
    // Désactive les APIs du navigateur non utilisées
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()'
    ].join(', '),

    // === Content Security Policy (CSP) ===
    // Politique de sécurité du contenu stricte
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval nécessaire pour Next.js dev
      "style-src 'self' 'unsafe-inline'", // unsafe-inline nécessaire pour Material-UI
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' http://10.28.8.236:3000 http://localhost:3000",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),

    // === Strict Transport Security (si HTTPS activé) ===
    // Décommenter quand HTTPS sera en place:
    // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // === Cache Control pour données sensibles ===
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',

    // === Server Identity ===
    // Masque la version du serveur (sécurité par obscurité légère)
    'X-Powered-By': 'OMEGA-DDT'
  };
}

export const config = {
  matcher: '/api/:path*',
};

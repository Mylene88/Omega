// backend/middleware.js

import { NextResponse } from 'next/server';

export function middleware(request) {
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, x-user-id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Pour les autres requêtes, ajouter les headers CORS
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-user-id');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};

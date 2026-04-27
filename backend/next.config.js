// backend/next.config.js
const path = require('path');
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration compatible avec Next.js 13.1.6 et Node 16.2.0
  experimental: {
    serverComponentsExternalPackages: ['pg', 'sequelize', 'puppeteer', 'puppeteer-core'],
  },

  // ✅ Standalone output pour déploiement facilité
  output: 'standalone',

  // Configuration CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: frontendUrl },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

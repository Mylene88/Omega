// backend/next.config.js

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration compatible avec Next.js 13.1.6 et Node 16.2.0
  experimental: {
    // App directory activé pour Next 13.1.6
    appDir: true,
    // Packages à externaliser côté serveur
    serverComponentsExternalPackages: ['pg', 'sequelize', 'puppeteer', 'puppeteer-core'],
  },

  // Configuration CORS pour toutes les routes API
  async headers() {
    return [
      {
        // Appliquer CORS à toutes les routes /api/*
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

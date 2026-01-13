// Force dynamic rendering (no static generation at build time)

// backend/app/api/health/route.js
const { Pool } = require('pg');

/**
 * Health check endpoint
 * Vérifie l'état de l'application et la connexion à la base de données
 */



export default async function handler(req, res) {
  if (req.method === 'GET') {

  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' },
      application: { status: 'healthy' }
    }
  };

  // Vérification de la connexion à la base de données
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const client = await pool.connect();

    try {
      // Simple requête pour vérifier la connexion
      const result = await client.query('SELECT 1 as health_check');

      if (result.rows && result.rows.length > 0) {
        health.checks.database.status = 'healthy';
        health.checks.database.responseTime = `${Date.now() - startTime}ms`;
      } else {
        health.checks.database.status = 'degraded';
        health.checks.database.message = 'Query returned no results';
      }

    } catch (dbError) {
      health.checks.database.status = 'unhealthy';
      health.checks.database.error = dbError.message;
      health.status = 'unhealthy';
    } finally {
      client.release();
    }

  } catch (error) {
    health.checks.database.status = 'unhealthy';
    health.checks.database.error = error.message;
    health.status = 'unhealthy';
  } finally {
    await pool.end();
  }

  // Calcul du temps de réponse total
  health.responseTime = `${Date.now() - startTime}ms`;

  // Statut HTTP basé sur l'état de santé
  const httpStatus = health.status === 'healthy' ? 200 : 503;

  return res.status(httpStatus ).json(health);
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

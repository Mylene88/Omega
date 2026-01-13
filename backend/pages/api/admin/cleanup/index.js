// Force dynamic rendering (no static generation at build time)

// backend/app/api/admin/cleanup/route.js
/**
 * API pour le nettoyage des données anciennes
 */

import { requireAdminWithLogging } from '../../../../lib/adminMiddleware';
import {
  performFullCleanup,
  getCleanupPreview,
  optimizeTables,
  RETENTION_POLICY
} from '../../../../lib/cleanupHelper';

/**
 * GET /api/admin/cleanup
 * Prévisualise les données qui seraient nettoyées
 *
 * Query params:
 * - action: 'preview' | 'policy'
 */


/**
 * POST /api/admin/cleanup
 * Exécute le nettoyage des données
 *
 * Body:
 * - confirm: true (requis)
 * - optimize: boolean (optionnel, effectue VACUUM après nettoyage)
 * - customPolicy: object (optionnel, politique de rétention personnalisée)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  const authResult = await requireAdminWithLogging(req, 'VIEW_CLEANUP', 'cleanup');

  if (authResult.error) {
    return res.json(
      { success: false, message: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  try {
    // Query params available in req.query
    const action = req.query.action || 'preview';

    if (action === 'preview') {
      const preview = await getCleanupPreview();

      return res.json({
        success: true,
        data: {
          preview,
          policy: RETENTION_POLICY,
          warning: 'Ces enregistrements seront supprimés lors du prochain nettoyage'
        }
      });
    }

    if (action === 'policy') {
      return res.json({
        success: true,
        data: {
          policy: RETENTION_POLICY,
          description: {
            snapshots: 'Durée de conservation des snapshots par type (en jours)',
            auditLog: 'Durée de conservation des logs d\'audit (en jours)',
            adminAccessLog: 'Durée de conservation des logs d\'accès admin (en jours)'
          }
        }
      });
    }

    return res.json({
      success: false,
      message: `Action inconnue: ${action}`
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/cleanup:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la prévisualisation du nettoyage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  const authResult = await requireAdminWithLogging(req, 'EXECUTE_CLEANUP', 'cleanup');

  if (authResult.error) {
    return res.json(
      { success: false, message: authResult.error.message },
      { status: authResult.error.status }
    );
  }

  try {
    const body = req.body;

    // Vérification de confirmation
    if (!body.confirm) {
      return res.json({
        success: false,
        message: 'Veuillez confirmer le nettoyage en envoyant { confirm: true }'
      }, { status: 400 });
    }

    // Prévisualisation avant nettoyage
    const preview = await getCleanupPreview(body.customPolicy);

    console.log(`🧹 Administrateur ${authResult.user.username} (ID: ${authResult.user.id}) a lancé un nettoyage`);
    console.log(`📊 Prévision: ${preview?.total || 0} enregistrements seront supprimés`);

    // Exécution du nettoyage
    const results = await performFullCleanup(body.customPolicy);

    // Optimisation des tables si demandé
    let optimizationResult = null;
    if (body.optimize) {
      console.log('⚡ Optimisation des tables demandée...');
      optimizationResult = await optimizeTables();
    }

    return res.json({
      success: true,
      message: 'Nettoyage effectué avec succès',
      data: {
        results,
        optimization: optimizationResult,
        executedBy: authResult.user.username,
        executedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur POST /api/admin/cleanup:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de l\'exécution du nettoyage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

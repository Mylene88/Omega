// Force dynamic rendering (no static generation at build time)

// backend/app/api/section-versions/[id]/route.js
/**
 * API pour gérer une version spécifique d'une section
 */

import { requireAuth } from '../../../../lib/authHelper';
import db from '../../../../models';

/**
 * GET /api/section-versions/[id]
 * Récupérer une version spécifique avec ses données complètes
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Authentification
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      return res.status(authResult.status ).json(authResult.response);
    }

    const { id } = params;

    if (!id) {
      return res.json({
        success: false,
        message: 'ID de version requis'
      }, { status: 400 });
    }

    // Récupérer la version avec ses données complètes
    const version = await db.SectionVersion.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet', 'description']
        }
      ]
    });

    if (!version) {
      return res.json({
        success: false,
        message: 'Version non trouvée'
      }, { status: 404 });
    }

    // Formater la réponse avec les données complètes
    const formattedVersion = {
      id_version: version.id_version,
      version_number: version.version_number,
      section_name: version.section_name,
      section_data: version.section_data, // Données complètes de la section
      snapshot_date: version.snapshot_date,
      is_current: version.is_current,
      description: version.description,
      metadata: version.metadata,
      created_by: version.user ? {
        id: version.user.id_user,
        username: version.user.username,
        nom_complet: `${version.user.prenom || ''} ${version.user.nom || ''}`.trim() || version.user.username
      } : null,
      projet: {
        id: version.projet?.id_projet,
        nom: version.projet?.nom_projet,
        description: version.projet?.description
      }
    };

    return res.json({
      success: true,
      data: formattedVersion
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/section-versions/[id]:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération de la version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

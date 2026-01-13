// Force dynamic rendering (no static generation at build time)

// backend/app/api/admin/deleted-projects/route.js

import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';
import { Op } from 'sequelize';

const { Projet, User, StatutProjetEnum } = db;

/**
 * GET /api/admin/deleted-projects
 * Liste tous les projets supprimés (soft delete)
 */




export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    console.log('📋 [ADMIN] Récupération des projets supprimés');

    // Récupérer tous les projets supprimés
    const deletedProjects = await Projet.findAll({
      where: {
        deleted_at: {
          [Op.ne]: null
        }
      },
      include: [
        {
          model: StatutProjetEnum,
          as: 'statut_projet_enum',
          attributes: ['id_statut', 'libelle']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      paranoid: false, // Important : inclure les soft-deleted
      order: [['deleted_at', 'DESC']]
    });

    console.log(`✅ [ADMIN] ${deletedProjects.length} projets supprimés trouvés`);

    return res.json({
      success: true,
      data: deletedProjects,
      count: deletedProjects.length
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la récupération des projets supprimés:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des projets supprimés',
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

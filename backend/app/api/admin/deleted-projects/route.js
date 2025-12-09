// backend/app/api/admin/deleted-projects/route.js

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';
import db from '@/backend/models';
import { Op } from 'sequelize';

const { Projet, User, StatutProjet } = db;

/**
 * GET /api/admin/deleted-projects
 * Liste tous les projets supprimés (soft delete)
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
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
          model: StatutProjet,
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

    return NextResponse.json({
      success: true,
      data: deletedProjects,
      count: deletedProjects.length
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erreur lors de la récupération des projets supprimés:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des projets supprimés',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/admin/projets/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { checkAdminAccess } from '@/backend/lib/adminAuthHelper';

const { Projet, StatutProjetEnum, DdtServiceEnum } = db;

/**
 * GET /api/admin/projets
 * Récupère la liste simplifiée de tous les projets (admin only)
 * Pour les dropdowns et filtres
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const projets = await Projet.findAll({
      attributes: [
        'id_projet',
        'nom_projet',
        'description',
        'statut_projet_id',
        'service_id',
        'created_at'
      ],
      include: [
        {
          model: StatutProjetEnum,
          as: 'statut_projet_enum',
          attributes: ['id_statut', 'libelle'],
          required: false
        },
        {
          model: DdtServiceEnum,
          as: 'ddt_service_enum',
          attributes: ['id_service', 'libelle_service'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Formater pour les dropdowns
    const formattedProjets = projets.map(projet => ({
      id_projet: projet.id_projet,
      nom_projet: projet.nom_projet,
      description: projet.description,
      statut_libelle: projet.statut_projet_enum?.libelle || 'N/A',
      service_libelle: projet.ddt_service_enum?.libelle_service || 'N/A',
      display_label: `${projet.id_projet} - ${projet.nom_projet}`
    }));

    return NextResponse.json({
      success: true,
      data: formattedProjets,
      count: formattedProjets.length
    });

  } catch (error) {
    console.error('Erreur GET /api/admin/projets:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des projets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// backend/app/api/projets/[id]/restore/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';

const { Projet } = db;

/**
 * POST /api/projets/[id]/restore
 * Restaure un projet supprimé (soft delete)
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;

    console.log(`🔄 Tentative de restauration du projet: ${id}`);

    // Rechercher le projet dans les soft-deleted
    const projet = await Projet.findOne({
      where: { id_projet: id },
      paranoid: false  // Inclure les soft-deleted
    });

    if (!projet) {
      console.warn(`⚠️ Projet ${id} non trouvé (même dans les supprimés)`);
      return NextResponse.json(
        {
          success: false,
          error: 'Projet non trouvé'
        },
        { status: 404 }
      );
    }

    // Vérifier si le projet est vraiment supprimé
    if (!projet.deleted_at) {
      console.warn(`⚠️ Projet ${id} n'est pas supprimé`);
      return NextResponse.json(
        {
          success: false,
          error: 'Ce projet n\'est pas supprimé'
        },
        { status: 400 }
      );
    }

    // Restaurer le projet
    await projet.restore();

    // Remettre demande_suppression à false
    await projet.update({ demande_suppression: false });

    console.log(`✅ Projet ${id} restauré avec succès`);

    return NextResponse.json({
      success: true,
      message: `Projet "${projet.nom_projet}" restauré avec succès`,
      data: {
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        deleted_at: null,
        demande_suppression: false
      }
    });

  } catch (error) {
    console.error(`❌ Erreur lors de la restauration du projet ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la restauration du projet',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

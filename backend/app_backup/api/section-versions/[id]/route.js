// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/section-versions/[id]/route.js
/**
 * API pour gérer une version spécifique d'une section
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/lib/authHelper';
import db from '@/backend/models';

/**
 * GET /api/section-versions/[id]
 * Récupérer une version spécifique avec ses données complètes
 */
export async function GET(request, { params }) {
  try {
    // Authentification
    const authResult = await requireAuth(request);
    if (!authResult.allowed) {
      return NextResponse.json(authResult.response, { status: authResult.status });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({
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
      return NextResponse.json({
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

    return NextResponse.json({
      success: true,
      data: formattedVersion
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/section-versions/[id]:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération de la version',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

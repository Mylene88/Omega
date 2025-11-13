// backend/app/api/section-versions/route.js
/**
 * API pour gérer le versioning granulaire par section
 * - Sauvegarde automatique d'une section spécifique
 * - Max 10 versions par section par utilisateur
 * - Rétention 15 jours
 * - Restauration sélective
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/lib/authHelper';
import db from '@/backend/models';
import { Op } from 'sequelize';

/**
 * POST /api/section-versions
 * Sauvegarder une version d'une section spécifique
 *
 * Body:
 * - idProjet: ID du projet
 * - sectionName: nom de la section ('projet_info', 'porteurs', 'suivis', etc.)
 * - sectionData: données de la section (JSONB)
 * - description: description optionnelle
 */
export async function POST(request) {
  try {
    // Authentification
    const authResult = await requireAuth(request);
    if (!authResult.allowed) {
      return NextResponse.json(authResult.response, { status: authResult.status });
    }
    const userId = authResult.userId;

    const body = await request.json();
    const { idProjet, sectionName, sectionData, description } = body;

    // Validation
    if (!idProjet || !sectionName || !sectionData) {
      return NextResponse.json({
        success: false,
        message: 'idProjet, sectionName et sectionData sont requis'
      }, { status: 400 });
    }

    const validSections = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
    if (!validSections.includes(sectionName)) {
      return NextResponse.json({
        success: false,
        message: `Section invalide. Doit être parmi: ${validSections.join(', ')}`
      }, { status: 400 });
    }

    // Vérifier que le projet existe
    const projet = await db.Projet.findByPk(idProjet);
    if (!projet) {
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    // Calculer le prochain numéro de version (1-10 avec rotation circulaire)
    const maxVersion = await db.SectionVersion.findOne({
      where: {
        id_projet: idProjet,
        user_id: userId,
        section_name: sectionName
      },
      order: [['version_number', 'DESC']]
    });

    let nextVersion = 1;
    if (maxVersion) {
      nextVersion = maxVersion.version_number >= 10 ? 1 : maxVersion.version_number + 1;

      // Si on réutilise le numéro 1, supprimer l'ancienne version
      if (nextVersion === 1) {
        await db.SectionVersion.destroy({
          where: {
            id_projet: idProjet,
            user_id: userId,
            section_name: sectionName,
            version_number: 1
          }
        });
      }
    }

    // Démarquer toutes les versions précédentes comme non-courantes
    await db.SectionVersion.update(
      { is_current: false },
      {
        where: {
          id_projet: idProjet,
          user_id: userId,
          section_name: sectionName
        }
      }
    );

    // Créer la nouvelle version
    const version = await db.SectionVersion.create({
      id_projet: idProjet,
      user_id: userId,
      section_name: sectionName,
      version_number: nextVersion,
      section_data: sectionData,
      snapshot_date: new Date(),
      is_current: true,
      description: description || `Version ${nextVersion} de ${sectionName}`,
      metadata: {
        saved_at: new Date().toISOString(),
        data_size: JSON.stringify(sectionData).length
      }
    });

    console.log(`✅ Version ${nextVersion} sauvegardée pour ${sectionName} du projet ${idProjet} par user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Version ${nextVersion} de ${sectionName} sauvegardée`,
      data: {
        id_version: version.id_version,
        version_number: version.version_number,
        section_name: version.section_name,
        snapshot_date: version.snapshot_date,
        is_current: version.is_current
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur POST /api/section-versions:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la sauvegarde de la section',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * GET /api/section-versions
 * Récupérer les versions d'une section spécifique
 *
 * Query params:
 * - idProjet: ID du projet (requis)
 * - sectionName: nom de la section (requis)
 * - userId: ID utilisateur (optionnel, si non fourni = utilisateur connecté)
 * - limit: nombre max de versions (défaut: 10)
 */
export async function GET(request) {
  try {
    // Authentification
    const authResult = await requireAuth(request);
    if (!authResult.allowed) {
      return NextResponse.json(authResult.response, { status: authResult.status });
    }
    const currentUserId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const idProjet = searchParams.get('idProjet');
    const sectionName = searchParams.get('sectionName');
    const userId = searchParams.get('userId') || currentUserId;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validation
    if (!idProjet || !sectionName) {
      return NextResponse.json({
        success: false,
        message: 'idProjet et sectionName sont requis'
      }, { status: 400 });
    }

    // Récupérer les versions avec les données de l'utilisateur
    const versions = await db.SectionVersion.findAll({
      where: {
        id_projet: idProjet,
        section_name: sectionName,
        user_id: userId
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet']
        }
      ],
      order: [['version_number', 'DESC']],
      limit
    });

    // Formater la réponse
    const formattedVersions = versions.map(v => ({
      id_version: v.id_version,
      version_number: v.version_number,
      section_name: v.section_name,
      snapshot_date: v.snapshot_date,
      is_current: v.is_current,
      description: v.description,
      metadata: v.metadata,
      created_by: v.user ? {
        id: v.user.id_user,
        username: v.user.username,
        nom_complet: `${v.user.prenom || ''} ${v.user.nom || ''}`.trim() || v.user.username
      } : null,
      projet: {
        id: v.projet?.id_projet,
        nom: v.projet?.nom_projet
      }
    }));

    return NextResponse.json({
      success: true,
      data: formattedVersions,
      count: formattedVersions.length,
      filters: {
        idProjet,
        sectionName,
        userId
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/section-versions:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des versions',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

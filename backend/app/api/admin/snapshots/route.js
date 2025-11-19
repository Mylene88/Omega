// backend/app/api/admin/snapshots/route.js

import { NextResponse } from 'next/server';
import { getProjectSnapshots, createSnapshot } from '@/backend/lib/auditHelper';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';
import db from '@/backend/models';

/**
 * GET /api/admin/snapshots
 * Récupère les snapshots d'un projet ou de tous les projets
 *
 * Query params:
 * - idProjet: ID du projet (optionnel)
 * - limit: nombre max de snapshots (défaut: 50)
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
    }

    // Extraire les paramètres de requête
    const { searchParams } = new URL(request.url);
    const idProjet = searchParams.get('idProjet');
    const limit = parseInt(searchParams.get('limit') || '50');

    let snapshots;

    if (idProjet) {
      // Récupérer les snapshots d'un projet spécifique
      snapshots = await getProjectSnapshots(idProjet, limit);
    } else {
      // Récupérer tous les snapshots récents
      const where = {};

      snapshots = await db.ProjetSnapshot.findAll({
        where,
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
        order: [['created_at', 'DESC']],
        limit
      });
    }

    // Formater les données pour le frontend
    const formattedSnapshots = snapshots.map(snapshot => ({
      id: snapshot.id_snapshot,
      idProjet: snapshot.id_projet,
      projetNom: snapshot.projet?.nom_projet || 'Projet inconnu',
      versionNumber: snapshot.version_number,
      isCurrent: snapshot.is_current,
      snapshotDate: snapshot.snapshot_date ? new Date(snapshot.snapshot_date).toISOString() : null,
      description: snapshot.description,
      creator: snapshot.user ? {
        id: snapshot.user.id_user,
        username: snapshot.user.username,
        nomComplet: `${snapshot.user.prenom || ''} ${snapshot.user.nom || ''}`.trim()
      } : null,
      createdAt: snapshot.created_at ? new Date(snapshot.created_at).toISOString() : null
    }));

    return NextResponse.json({
      success: true,
      data: formattedSnapshots,
      count: formattedSnapshots.length,
      filters: {
        idProjet,
        limit
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/admin/snapshots:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des snapshots',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/snapshots
 * Crée un nouveau snapshot manuel d'un projet
 *
 * Body:
 * - idProjet: ID du projet (requis)
 * - description: description du snapshot (optionnel)
 */
export async function POST(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
    }
    const userId = adminCheck.userId;

    const body = await request.json();
    const { idProjet, description } = body;

    if (!idProjet) {
      return NextResponse.json({
        success: false,
        message: 'idProjet est requis'
      }, { status: 400 });
    }

    // Récupérer les données complètes du projet
    const projet = await db.Projet.findByPk(idProjet, {
      include: [
        { model: db.ProjetPorteur, as: 'porteurs' },
        { model: db.ProjetSuivi, as: 'suivis' },
        { model: db.Document, as: 'documents' },
        { model: db.ProjetGeometry, as: 'geometry' },
        { model: db.ProjetInThematique, as: 'projet_in_thematiques' }
      ]
    });

    if (!projet) {
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    // Créer le snapshot
    const snapshot = await createSnapshot({
      idProjet,
      projetData: projet.toJSON(),
      description: description || `Snapshot manuel créé le ${new Date().toLocaleString('fr-FR')}`,
      userId
    });

    return NextResponse.json({
      success: true,
      message: 'Snapshot créé avec succès',
      data: {
        id: snapshot.id_snapshot,
        idProjet: snapshot.id_projet,
        versionNumber: snapshot.version_number,
        isCurrent: snapshot.is_current,
        description: snapshot.description,
        createdAt: snapshot.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erreur POST /api/admin/snapshots:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la création du snapshot',
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

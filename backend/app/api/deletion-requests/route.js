// backend/app/api/deletion-requests/route.js
/**
 * API pour gérer les demandes de suppression de projets
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/backend/lib/authHelper';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';
import db from '@/backend/models';

/**
 * GET /api/deletion-requests
 * Récupère les demandes de suppression
 *
 * Query params:
 * - statut: filtrer par statut ('en attente', 'accepter', 'refuser')
 * - is_admin: true si appel depuis l'interface admin
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get('statut');
    const isAdmin = searchParams.get('is_admin') === 'true';

    // Vérifier l'authentification (admin ou utilisateur normal)
    let userId;
    if (isAdmin) {
      const adminCheck = await requireAdmin(request);
      if (!adminCheck.allowed) {
        return NextResponse.json(adminCheck.response, { status: adminCheck.status });
      }
      userId = adminCheck.userId;
    } else {
      const authResult = await requireAuth(request);
      if (!authResult.allowed) {
        return NextResponse.json(
          { success: false, message: 'Non authentifié' },
          { status: 401 }
        );
      }
      userId = authResult.userId;
    }

    // Construire le filtre
    const where = {};
    if (statut) {
      where.statut = statut;
    }

    // Si utilisateur normal, ne montrer que ses propres demandes
    if (!isAdmin) {
      where.requested_by = userId;
    }

    // Récupérer les demandes avec les données associées
    const requests = await db.ProjetDeletionRequest.findAll({
      where,
      include: [
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet', 'description']
        },
        {
          model: db.User,
          as: 'requestor',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.User,
          as: 'reviewer',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ ${requests.length} demande(s) de suppression trouvée(s)`);

    // Formater les données
    const formattedRequests = requests.map(req => ({
      id: req.id_deletion_request,
      id_projet: req.id_projet,
      projet_nom: req.projet?.nom_projet || req.projet_nom_cache || 'Projet supprimé',
      projet_description: req.projet?.description || null,
      raison: req.raison,
      statut: req.statut,
      requested_by: req.requestor ? {
        id: req.requestor.id_user,
        username: req.requestor.username,
        nom_complet: `${req.requestor.prenom || ''} ${req.requestor.nom || ''}`.trim() || req.requestor.username
      } : null,
      reviewed_by: req.reviewer ? {
        id: req.reviewer.id_user,
        username: req.reviewer.username,
        nom_complet: `${req.reviewer.prenom || ''} ${req.reviewer.nom || ''}`.trim() || req.reviewer.username
      } : null,
      review_comment: req.review_comment,
      reviewed_at: req.reviewed_at,
      created_at: req.created_at
    }));

    return NextResponse.json({
      success: true,
      data: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/deletion-requests:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des demandes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/deletion-requests
 * Crée une nouvelle demande de suppression
 *
 * Body:
 * - id_projet: ID du projet à supprimer
 * - raison: Raison de la demande
 * - requested_by: ID de l'utilisateur (optionnel, sera déduit du token)
 */
export async function POST(request) {
  const transaction = await db.sequelize.transaction();

  try {
    const body = await request.json();
    const { id_projet, raison, requested_by } = body;

    console.log('📝 Demande de suppression reçue:', { id_projet, raison, requested_by });

    // Validation
    if (!id_projet || !raison) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'id_projet et raison sont requis'
      }, { status: 400 });
    }

    // Récupérer l'ID utilisateur depuis le body ou le token
    let userId = requested_by;
    if (!userId) {
      const authResult = await requireAuth(request);
      if (authResult.allowed) {
        userId = authResult.userId;
      }
    }

    if (!userId) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Utilisateur non identifié'
      }, { status: 401 });
    }

    // Vérifier que le projet existe
    const projet = await db.Projet.findByPk(id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    console.log('📋 Projet trouvé:', {
      id: projet.id_projet,
      nom: projet.nom_projet,
      demande_suppression_actuel: projet.demande_suppression
    });

    // Vérifier qu'il n'y a pas déjà une demande en attente pour ce projet
    const existingRequest = await db.ProjetDeletionRequest.findOne({
      where: {
        id_projet,
        statut: 'en attente'
      },
      transaction
    });

    if (existingRequest) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Une demande de suppression est déjà en attente pour ce projet'
      }, { status: 409 });
    }

    // Créer la demande avec nom du projet en cache
    const deletionRequest = await db.ProjetDeletionRequest.create({
      id_projet,
      projet_nom_cache: projet.nom_projet, // Sauvegarder le nom pour l'historique
      requested_by: userId,
      raison,
      statut: 'en attente'
    }, { transaction });

    console.log('✅ Demande de suppression créée:', deletionRequest.id_deletion_request);

    // Mettre à jour le flag demande_suppression du projet
    const updateResult = await projet.update({
      demande_suppression: true,
      updated_by: userId,
      updated_at: new Date()
    }, { transaction });

    console.log('✅ Projet mis à jour:', {
      id: updateResult.id_projet,
      demande_suppression: updateResult.demande_suppression
    });

    // Commit de la transaction
    await transaction.commit();
    console.log('✅ Transaction committée avec succès');

    return NextResponse.json({
      success: true,
      message: 'Demande de suppression créée avec succès',
      data: {
        id: deletionRequest.id_deletion_request,
        id_projet: deletionRequest.id_projet,
        statut: deletionRequest.statut,
        projet_demande_suppression: true
      }
    }, { status: 201 });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur POST /api/deletion-requests:', error);
    console.error('❌ Stack:', error.stack);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la création de la demande',
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
// backend/app/api/deletion-requests/route.js
<<<<<<< HEAD

import { NextResponse } from 'next/server';
import db from '@/backend/models';

const { ProjetDeletionRequest, Projet, User } = db;

// GET - Récupérer les demandes de suppression
// Admin: toutes les demandes
// User: seulement ses propres demandes
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const isAdmin = searchParams.get('is_admin') === 'true';
    const statut = searchParams.get('statut'); // pending, approved, rejected

    const whereClause = {};

    if (statut) {
      whereClause.statut = statut;
    }

    // Si ce n'est pas un admin, ne montrer que ses propres demandes
    if (!isAdmin && userId) {
      whereClause.requested_by = userId;
    }

    const requests = await ProjetDeletionRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet', 'description']
        },
        {
          model: User,
          as: 'requestor',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id_user', 'username', 'prenom', 'nom'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = requests.map(req => ({
      id: req.id_deletion_request,
      id_projet: req.id_projet,
      projet_nom: req.projet?.nom_projet || 'Projet supprimé',
      projet_description: req.projet?.description,
      raison: req.raison,
      statut: req.statut,
      requested_by: {
        id: req.requestor?.id_user,
        username: req.requestor?.username,
        nom_complet: (req.requestor?.prenom && req.requestor?.nom) ?
                      `${req.requestor.prenom} ${req.requestor.nom}` :
                      req.requestor?.username
      },
      reviewed_by: req.reviewer ? {
        id: req.reviewer.id_user,
        username: req.reviewer.username,
        nom_complet: (req.reviewer.prenom && req.reviewer.nom) ?
                      `${req.reviewer.prenom} ${req.reviewer.nom}` :
                      req.reviewer.username
      } : null,
      review_comment: req.review_comment,
      reviewed_at: req.reviewed_at,
      created_at: req.created_at
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      total: formatted.length
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/deletion-requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle demande de suppression
export async function POST(request) {
  try {
    const body = await request.json();
    const { id_projet, requested_by, raison } = body;

    console.log('📝 Nouvelle demande de suppression:', { id_projet, requested_by });

    // Validations
    if (!id_projet || !requested_by || !raison) {
      return NextResponse.json(
        { error: 'Données manquantes (id_projet, requested_by, raison requis)' },
        { status: 400 }
      );
    }

    if (raison.trim().length < 10) {
      return NextResponse.json(
        { error: 'La raison doit contenir au moins 10 caractères' },
=======
import { NextResponse } from 'next/server';
import db from '@/backend/models';

const { Projet, User } = db;

// POST /api/deletion-requests - Créer une demande de suppression
export async function POST(request) {
  try {
    const body = await request.json();
    const { id_projet, requested_by } = body;

    console.log('📝 Demande de suppression reçue:', { id_projet, requested_by });

    // Validation
    if (!id_projet) {
      return NextResponse.json(
        { success: false, error: 'L\'ID du projet est requis' },
>>>>>>> ab3183a4a220e5dc6a1822409a8b896fefe7dbab
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projet = await Projet.findByPk(id_projet);
    if (!projet) {
      return NextResponse.json(
<<<<<<< HEAD
        { error: 'Projet non trouvé' },
=======
        { success: false, error: 'Projet non trouvé' },
>>>>>>> ab3183a4a220e5dc6a1822409a8b896fefe7dbab
        { status: 404 }
      );
    }

<<<<<<< HEAD
    // Vérifier qu'il n'y a pas déjà une demande en attente pour ce projet
    const existingRequest = await ProjetDeletionRequest.findOne({
      where: {
        id_projet,
        statut: 'en attente'
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Une demande de suppression est déjà en attente pour ce projet' },
        { status: 409 }
      );
    }

    // Créer la demande
    const deletionRequest = await ProjetDeletionRequest.create({
      id_projet,
      requested_by,
      raison: raison.trim(),
      statut: 'en attente'
    });

    console.log('✅ Demande créée:', deletionRequest.id_deletion_request);
=======
    // Vérifier si une demande n'existe pas déjà
    if (projet.demande_suppression) {
      return NextResponse.json({
        success: true,
        message: 'Une demande de suppression existe déjà pour ce projet',
        data: {
          id_projet: projet.id_projet,
          nom_projet: projet.nom_projet,
          demande_suppression: true
        }
      });
    }

    // Mettre à jour le projet avec demande_suppression = true
    await projet.update({
      demande_suppression: true,
      updated_by: requested_by || null,
      updated_at: new Date()
    });

    console.log('✅ Projet marqué en attente de suppression:', id_projet);
>>>>>>> ab3183a4a220e5dc6a1822409a8b896fefe7dbab

    return NextResponse.json({
      success: true,
      message: 'Demande de suppression créée avec succès',
      data: {
<<<<<<< HEAD
        id: deletionRequest.id_deletion_request,
        id_projet: deletionRequest.id_projet,
        statut: deletionRequest.statut,
        created_at: deletionRequest.created_at
=======
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        demande_suppression: true
>>>>>>> ab3183a4a220e5dc6a1822409a8b896fefe7dbab
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur POST /api/deletion-requests:', error);
<<<<<<< HEAD
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
}
=======
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de la demande de suppression',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// GET /api/deletion-requests - Obtenir tous les projets en attente de suppression
export async function GET() {
  try {
    const projets = await Projet.findAll({
      where: {
        demande_suppression: true
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id_user', 'username', 'nom', 'prenom']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id_user', 'username', 'nom', 'prenom']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    console.log(`✅ ${projets.length} projet(s) en attente de suppression trouvé(s)`);

    return NextResponse.json({
      success: true,
      count: projets.length,
      data: projets.map(p => ({
        id_projet: p.id_projet,
        nom_projet: p.nom_projet,
        description: p.description,
        demande_suppression: p.demande_suppression,
        updated_at: p.updated_at,
        updated_by: p.updater ? {
          id: p.updater.id_user,
          username: p.updater.username,
          nom_complet: `${p.updater.prenom || ''} ${p.updater.nom || ''}`.trim()
        } : null
      }))
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/deletion-requests:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des demandes de suppression',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// DELETE /api/deletion-requests - Annuler une demande de suppression
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_projet = searchParams.get('id_projet');

    if (!id_projet) {
      return NextResponse.json(
        { success: false, error: 'L\'ID du projet est requis' },
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projet = await Projet.findByPk(id_projet);
    if (!projet) {
      return NextResponse.json(
        { success: false, error: 'Projet non trouvé' },
        { status: 404 }
      );
    }

    // Retirer la demande de suppression
    await projet.update({
      demande_suppression: false,
      updated_at: new Date()
    });

    console.log('✅ Demande de suppression annulée pour:', id_projet);

    return NextResponse.json({
      success: true,
      message: 'Demande de suppression annulée avec succès',
      data: {
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        demande_suppression: false
      }
    });

  } catch (error) {
    console.error('❌ Erreur DELETE /api/deletion-requests:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'annulation de la demande de suppression',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
>>>>>>> ab3183a4a220e5dc6a1822409a8b896fefe7dbab

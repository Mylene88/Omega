// backend/app/api/deletion-requests/route.js

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
          attributes: ['id_user', 'username', 'nom_complet', 'prenom', 'nom']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id_user', 'username', 'nom_complet', 'prenom', 'nom'],
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
        nom_complet: req.requestor?.nom_complet ||
                    (req.requestor?.prenom && req.requestor?.nom ?
                      `${req.requestor.prenom} ${req.requestor.nom}` :
                      req.requestor?.username)
      },
      reviewed_by: req.reviewer ? {
        id: req.reviewer.id_user,
        username: req.reviewer.username,
        nom_complet: req.reviewer.nom_complet ||
                    (req.reviewer.prenom && req.reviewer.nom ?
                      `${req.reviewer.prenom} ${req.reviewer.nom}` :
                      req.reviewer.username)
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
        { status: 400 }
      );
    }

    // Vérifier que le projet existe
    const projet = await Projet.findByPk(id_projet);
    if (!projet) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Demande de suppression créée avec succès',
      data: {
        id: deletionRequest.id_deletion_request,
        id_projet: deletionRequest.id_projet,
        statut: deletionRequest.statut,
        created_at: deletionRequest.created_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur POST /api/deletion-requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
}

// backend/app/api/deletion-requests/route.js
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

    return NextResponse.json({
      success: true,
      message: 'Demande de suppression créée avec succès',
      data: {
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        demande_suppression: true
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur POST /api/deletion-requests:', error);
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

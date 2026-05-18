// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/deletion-requests/route.js
/**
 * API pour gérer les demandes de suppression de projets
 */

import { requireAuth } from '../../../lib/authHelper';
import { requireAdmin } from '../../../lib/adminAuthHelper';
import db from '../../../models';

/**
 * GET /api/deletion-requests
 * Récupère les demandes de suppression
 *
 * Query params:
 * - statut: filtrer par statut ('en attente', 'accepter', 'refuser')
 * - is_admin: true si appel depuis l'interface admin
 */


/**
 * POST /api/deletion-requests
 * Crée une nouvelle demande de suppression
 *
 * Body:
 * - id_projet: ID du projet à supprimer
 * - raison: Raison de la demande
 * - requested_by: ID de l'utilisateur (optionnel, sera déduit du token)
 */


/**
 * OPTIONS pour CORS
 */

export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Query params available in req.query
    const statut = req.query.statut;
    const isAdmin = req.query.is_admin === 'true';

    // Vérifier l'authentification (admin ou utilisateur normal)
    let userId;
    if (isAdmin) {
      const adminCheck = await requireAdmin(req);
      if (!adminCheck.allowed) {
        return res.status(adminCheck.status ).json(adminCheck.response);
      }
      userId = adminCheck.userId;
    } else {
      const authResult = await requireAuth(req);
      if (!authResult.allowed) {
        return res.json(
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
          attributes: ['id_user', 'username', 'prenom', 'nom', 'is_active']
        },
        {
          model: db.User,
          as: 'reviewer',
          attributes: ['id_user', 'username', 'prenom', 'nom', 'is_active']
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
        nom_complet: `${req.requestor.prenom || ''} ${req.requestor.nom || ''}`.trim() || req.requestor.username,
        is_active: req.requestor.is_active
      } : null,
      reviewed_by: req.reviewer ? {
        id: req.reviewer.id_user,
        username: req.reviewer.username,
        nom_complet: `${req.reviewer.prenom || ''} ${req.reviewer.nom || ''}`.trim() || req.reviewer.username,
        is_active: req.reviewer.is_active
      } : null,
      review_comment: req.review_comment,
      reviewed_at: req.reviewed_at,
      created_at: req.created_at
    }));

    return res.json({
      success: true,
      data: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/deletion-requests:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des demandes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  const transaction = await db.sequelize.transaction();

  try {
    const body = req.body;
    const { id_projet, raison } = body;

    console.log('📝 Demande de suppression reçue:', { id_projet, raison });

    // Validation
    if (!id_projet || !raison) {
      await transaction.rollback();
      return res.json({
        success: false,
        message: 'id_projet et raison sont requis'
      }, { status: 400 });
    }

    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      await transaction.rollback();
      return res.status(authResult.status).json(authResult.response);
    }
    const userId = authResult.userId;

    // Vérifier que le projet existe
    const projet = await db.Projet.findByPk(id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return res.json({
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
      return res.json({
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

    return res.json({
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
    return res.json({
      success: false,
      message: 'Erreur lors de la création de la demande',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {
  const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3001';

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

// Force dynamic rendering (no static generation at build time)

// backend/app/api/deletion-requests/[id]/route.js

import db from '../../../../models';

const { ProjetDeletionRequest, Projet, User } = db;

// PATCH - Approuver ou rejeter une demande (Admin seulement)


// DELETE - Annuler sa propre demande (User)


export default async function handler(req, res) {
  if (req.method === 'DELETE') {

  try {
    const { id } = params;
    // Query params available in req.query
    const userId = req.query.user_id;

    if (!userId) {
      return res.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    const deletionRequest = await ProjetDeletionRequest.findByPk(id);

    if (!deletionRequest) {
      return res.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que c'est bien l'auteur de la demande
    if (deletionRequest.requested_by !== parseInt(userId)) {
      return res.json(
        { error: 'Vous ne pouvez annuler que vos propres demandes' },
        { status: 403 }
      );
    }

    // On peut seulement annuler une demande en attente
    if (deletionRequest.statut !== 'en attente') {
      return res.json(
        { error: 'Vous ne pouvez annuler qu\'une demande en attente' },
        { status: 409 }
      );
    }

    await deletionRequest.destroy();

    return res.json({
      success: true,
      message: 'Demande annulée avec succès'
    });

  } catch (error) {
    console.error(`❌ Erreur DELETE /api/deletion-requests/${params.id}:`, error);
    return res.json(
      { error: 'Erreur lors de l\'annulation de la demande' },
      { status: 500 }
    );
  }
  }
  else if (req.method === 'PATCH') {

  const transaction = await db.sequelize.transaction();

  try {
    const { id } = params;
    const body = req.body;
    const { action, reviewed_by, review_comment } = body;

    console.log(`📝 Révision demande #${id}:`, { action, reviewed_by });

    // Validation
    if (!['approve', 'reject'].includes(action)) {
      await transaction.rollback();
      return res.json(
        { error: 'Action invalide (approve ou reject)' },
        { status: 400 }
      );
    }

    if (!reviewed_by) {
      await transaction.rollback();
      return res.json(
        { error: 'ID du reviewer requis' },
        { status: 400 }
      );
    }

    // Récupérer la demande
    const deletionRequest = await ProjetDeletionRequest.findByPk(id, {
      include: [
        {
          model: Projet,
          as: 'projet'
        }
      ],
      transaction
    });

    if (!deletionRequest) {
      await transaction.rollback();
      return res.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    if (deletionRequest.statut !== 'en attente') {
      await transaction.rollback();
      return res.json(
        { error: `Cette demande a déjà été ${deletionRequest.statut === 'accepter' ? 'approuvée' : 'refusée'}` },
        { status: 409 }
      );
    }

    const nouveauStatut = action === 'approve' ? 'accepter' : 'refuser';

    // Mettre à jour la demande
    await deletionRequest.update({
      statut: nouveauStatut,
      reviewed_by,
      review_comment: review_comment || null,
      reviewed_at: new Date()
    }, { transaction });

    // Si approuvé, supprimer le projet
    if (action === 'approve') {
      console.log(`🗑️ Suppression du projet #${deletionRequest.id_projet}`);

      await Projet.destroy({
        where: { id_projet: deletionRequest.id_projet },
        transaction
      });

      console.log(`✅ Projet #${deletionRequest.id_projet} supprimé`);
    } else {
      // Si rejeté, remettre demande_suppression à false
      console.log(`❌ Rejet de la demande - Remise à zéro de demande_suppression pour #${deletionRequest.id_projet}`);

      await Projet.update(
        { demande_suppression: false },
        {
          where: { id_projet: deletionRequest.id_projet },
          transaction
        }
      );

      console.log(`✅ Projet #${deletionRequest.id_projet} - demande_suppression remis à false`);
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: action === 'approve' ?
        'Demande approuvée et projet supprimé' :
        'Demande rejetée',
      data: {
        id: deletionRequest.id_deletion_request,
        statut: nouveauStatut,
        reviewed_at: deletionRequest.reviewed_at
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Erreur PATCH /api/deletion-requests/${params.id}:`, error);
    return res.json(
      { error: 'Erreur lors de la révision de la demande' },
      { status: 500 }
    );
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

// Force dynamic rendering (no static generation at build time)

import db from '../../../../models';
import { requireAuth } from '../../../../lib/authHelper';
import { requireAdmin } from '../../../../lib/adminAuthHelper';

const { ProjetArchiveRequest, Projet } = db;

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      const authResult = await requireAuth(req);
      if (!authResult.allowed) {
        return res.status(authResult.status).json(authResult.response);
      }
      const userId = authResult.userId;

      const archiveRequest = await ProjetArchiveRequest.findByPk(id);
      if (!archiveRequest) {
        return res.status(404).json({ error: 'Demande non trouvee' });
      }

      if (archiveRequest.requested_by !== parseInt(userId, 10)) {
        return res.status(403).json({ error: 'Vous ne pouvez annuler que vos propres demandes' });
      }

      if (archiveRequest.statut !== 'en attente') {
        return res.status(409).json({ error: 'Vous ne pouvez annuler qu\'une demande en attente' });
      }

      const transaction = await db.sequelize.transaction();
      try {
        if (archiveRequest.id_projet) {
          if (archiveRequest.request_type === 'archivage') {
            await Projet.update(
              { demande_archivage: false },
              { where: { id_projet: archiveRequest.id_projet }, transaction }
            );
          } else {
            await Projet.update(
              { demande_restauration: false },
              { where: { id_projet: archiveRequest.id_projet }, transaction }
            );
          }
        }

        await archiveRequest.destroy({ transaction });
        await transaction.commit();
      } catch (txError) {
        await transaction.rollback();
        throw txError;
      }

      return res.json({ success: true, message: 'Demande annulee avec succes' });
    } catch (error) {
      console.error(`❌ Erreur DELETE /api/archive-requests/${req.query.id}:`, error);
      return res.status(500).json({ error: 'Erreur lors de l\'annulation de la demande' });
    }
  }

  if (req.method === 'PATCH') {
    const transaction = await db.sequelize.transaction();

    try {
      const { id } = req.query;
      const { action, review_comment } = req.body || {};

      const adminCheck = await requireAdmin(req);
      if (!adminCheck.allowed) {
        await transaction.rollback();
        return res.status(adminCheck.status).json(adminCheck.response);
      }
      const reviewerUserId = adminCheck.userId;

      if (!['approve', 'reject'].includes(action)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Action invalide (approve ou reject)' });
      }

      if (action === 'reject' && (!review_comment || !String(review_comment).trim())) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Le motif de rejet est obligatoire pour une demande d\'archivage/restauration'
        });
      }

      const archiveRequest = await ProjetArchiveRequest.findByPk(id, {
        include: [{ model: Projet, as: 'projet' }],
        transaction
      });

      if (!archiveRequest) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Demande non trouvee' });
      }

      if (archiveRequest.statut !== 'en attente') {
        await transaction.rollback();
        return res.status(409).json({
          error: `Cette demande a deja ete ${archiveRequest.statut === 'accepter' ? 'approuvee' : 'rejetee'}`
        });
      }

      const nouveauStatut = action === 'approve' ? 'accepter' : 'refuser';
      const reviewCommentClean =
        typeof review_comment === 'string' && review_comment.trim() ? review_comment.trim() : null;

      await archiveRequest.update(
        {
          statut: nouveauStatut,
          reviewed_by: reviewerUserId,
          review_comment: reviewCommentClean,
          reviewed_at: new Date()
        },
        { transaction }
      );

      if (!archiveRequest.id_projet) {
        await transaction.commit();
        return res.json({
          success: true,
          message: action === 'approve' ? 'Demande approuvee' : 'Demande rejetee',
          data: {
            id: archiveRequest.id_archive_request,
            statut: nouveauStatut,
            reviewed_at: archiveRequest.reviewed_at
          }
        });
      }

      if (action === 'approve') {
        if (archiveRequest.request_type === 'archivage') {
          await Projet.update(
            {
              is_archived: true,
              archived_at: new Date(),
              archived_by: reviewerUserId,
              demande_archivage: false,
              demande_restauration: false,
              updated_by: reviewerUserId,
              updated_at: new Date()
            },
            {
              where: { id_projet: archiveRequest.id_projet },
              transaction
            }
          );
        } else {
          await Projet.update(
            {
              is_archived: false,
              archived_at: null,
              archived_by: null,
              demande_restauration: false,
              demande_archivage: false,
              updated_by: reviewerUserId,
              updated_at: new Date()
            },
            {
              where: { id_projet: archiveRequest.id_projet },
              transaction
            }
          );
        }
      } else if (archiveRequest.request_type === 'archivage') {
        await Projet.update(
          { demande_archivage: false },
          { where: { id_projet: archiveRequest.id_projet }, transaction }
        );
      } else {
        await Projet.update(
          { demande_restauration: false },
          { where: { id_projet: archiveRequest.id_projet }, transaction }
        );
      }

      await transaction.commit();

      const successMessage =
        action === 'approve'
          ? archiveRequest.request_type === 'archivage'
            ? 'Demande approuvee et projet archive'
            : 'Demande approuvee et projet restaure'
          : 'Demande rejetee';

      return res.json({
        success: true,
        message: successMessage,
        data: {
          id: archiveRequest.id_archive_request,
          statut: nouveauStatut,
          request_type: archiveRequest.request_type,
          reviewed_at: archiveRequest.reviewed_at
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ Erreur PATCH /api/archive-requests/${req.query.id}:`, error);
      return res.status(500).json({ error: 'Erreur lors de la revision de la demande' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

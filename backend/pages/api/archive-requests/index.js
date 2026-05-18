// Force dynamic rendering (no static generation at build time)

import { requireAuth } from '../../../lib/authHelper';
import { requireAdmin } from '../../../lib/adminAuthHelper';
import db from '../../../models';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const statut = req.query.statut;
      const requestType = req.query.request_type;
      const isAdmin = req.query.is_admin === 'true';

      let userId;
      if (isAdmin) {
        const adminCheck = await requireAdmin(req);
        if (!adminCheck.allowed) {
          return res.status(adminCheck.status).json(adminCheck.response);
        }
        userId = adminCheck.userId;
      } else {
        const authResult = await requireAuth(req);
        if (!authResult.allowed) {
          return res.status(authResult.status).json(authResult.response);
        }
        userId = authResult.userId;
      }

      const where = {};
      if (statut) where.statut = statut;
      if (requestType) where.request_type = requestType;
      if (!isAdmin) where.requested_by = userId;

      const requests = await db.ProjetArchiveRequest.findAll({
        where,
        include: [
          {
            model: db.Projet,
            as: 'projet',
            attributes: [
              'id_projet',
              'nom_projet',
              'description',
              'is_archived',
              'demande_archivage',
              'demande_restauration'
            ],
            include: [
              {
                model: db.StatutProjetEnum,
                as: 'statut_projet_enum',
                attributes: ['id_statut', 'libelle'],
                required: false
              },
              {
                model: db.DdtServiceEnum,
                as: 'ddt_service_enum',
                attributes: ['id_service', 'libelle_service'],
                required: false
              }
            ],
            required: false
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

      const formattedRequests = requests.map((item) => ({
        id: item.id_archive_request,
        id_projet: item.id_projet,
        projet_nom: item.projet?.nom_projet || item.projet_nom_cache || 'Projet indisponible',
        projet_description: item.projet?.description || null,
        projet_statut: item.projet?.statut_projet_enum?.libelle || null,
        projet_service_referent: item.projet?.ddt_service_enum?.libelle_service || null,
        projet_is_archived: item.projet?.is_archived ?? null,
        raison: item.raison,
        request_type: item.request_type,
        statut: item.statut,
        requested_by: item.requestor ? {
          id: item.requestor.id_user,
          username: item.requestor.username,
          nom_complet: `${item.requestor.prenom || ''} ${item.requestor.nom || ''}`.trim() || item.requestor.username,
          is_active: item.requestor.is_active
        } : null,
        reviewed_by: item.reviewer ? {
          id: item.reviewer.id_user,
          username: item.reviewer.username,
          nom_complet: `${item.reviewer.prenom || ''} ${item.reviewer.nom || ''}`.trim() || item.reviewer.username,
          is_active: item.reviewer.is_active
        } : null,
        review_comment: item.review_comment,
        reviewed_at: item.reviewed_at,
        created_at: item.created_at
      }));

      return res.json({
        success: true,
        data: formattedRequests,
        count: formattedRequests.length
      });
    } catch (error) {
      console.error('❌ Erreur GET /api/archive-requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des demandes d\'archivage',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  if (req.method === 'POST') {
    const transaction = await db.sequelize.transaction();

    try {
      const { id_projet, request_type, raison } = req.body || {};

      if (!id_projet) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'id_projet est requis'
        });
      }

      const authResult = await requireAuth(req);
      if (!authResult.allowed) {
        await transaction.rollback();
        return res.status(authResult.status).json(authResult.response);
      }
      const userId = authResult.userId;

      const projet = await db.Projet.findByPk(id_projet, { transaction });
      if (!projet) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }

      const resolvedType = request_type || (projet.is_archived ? 'restauration' : 'archivage');
      if (!['archivage', 'restauration'].includes(resolvedType)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'request_type doit etre "archivage" ou "restauration"'
        });
      }

      if (resolvedType === 'archivage' && projet.is_archived) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Ce projet est deja archive'
        });
      }

      if (resolvedType === 'restauration' && !projet.is_archived) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Ce projet n\'est pas archive'
        });
      }

      const existingRequest = await db.ProjetArchiveRequest.findOne({
        where: {
          id_projet,
          request_type: resolvedType,
          statut: 'en attente'
        },
        transaction
      });

      if (existingRequest) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message:
            resolvedType === 'archivage'
              ? 'Une demande d\'archivage est deja en attente pour ce projet'
              : 'Une demande de restauration est deja en attente pour ce projet'
        });
      }

      const archiveRequest = await db.ProjetArchiveRequest.create(
        {
          id_projet,
          projet_nom_cache: projet.nom_projet,
          requested_by: userId,
          request_type: resolvedType,
          raison: typeof raison === 'string' && raison.trim() ? raison.trim() : null,
          statut: 'en attente'
        },
        { transaction }
      );

      const updatePayload = {
        updated_by: userId,
        updated_at: new Date()
      };
      if (resolvedType === 'archivage') {
        updatePayload.demande_archivage = true;
      } else {
        updatePayload.demande_restauration = true;
      }

      await projet.update(updatePayload, { transaction });
      await transaction.commit();

      return res.status(201).json({
        success: true,
        message:
          resolvedType === 'archivage'
            ? 'Demande d\'archivage creee avec succes'
            : 'Demande de restauration creee avec succes',
        data: {
          id: archiveRequest.id_archive_request,
          id_projet: archiveRequest.id_projet,
          request_type: archiveRequest.request_type,
          statut: archiveRequest.statut
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur POST /api/archive-requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la creation de la demande',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  if (req.method === 'OPTIONS') {
    const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.status(200).json({
      success: true,
      message: 'OK',
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// Force dynamic rendering (no static generation at build time)

//backend/app_backup/api/document/[id]/route.js

import db from '../../../../models';
import { validateId } from '../../../../utils/validate';
import { successResponse, errorResponse, validationErrorResponse } from '../../../../utils/response';
import { withTransaction } from '../../../../utils/database';
import { saveCurrentSectionVersion, extractUserId } from '../../../../lib/sectionVersionHelper';

const { Document } = db;

// GET - récupérer un document par son ID


// PATCH - modifier un document


// DELETE - supprimer un document


// OPTIONS - support CORS


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    const { id } = params;

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return res.json(body, { status });
    }

    const document = await Document.findByPk(id);

    if (!document) {
      const { body, status } = errorResponse('Document non trouvé', 404);
      return res.json(body, { status });
    }

    const { body, status } = successResponse(document);
    return res.json(body, { status });
  } catch (error) {
    console.error('Erreur GET document:', error);
    const { body, status } = errorResponse(
      'Erreur lors de la récupération du document',
      500,
      error.message
    );
    return res.json(body, { status });
  }
  }
  else if (req.method === 'DELETE') {

  try {
    const { id } = params;
    const url = new URL(req.url);
    const userId = parseInt(url.req.query.userId, 10) || null;

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return res.json(body, { status });
    }

    const deletedDocument = await withTransaction(async (transaction) => {
      const document = await Document.findByPk(id, { transaction });
      if (!document) throw new Error('Document non trouvé');

      // 📸 Sauvegarder la version actuelle avant suppression
      if (userId && document.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: document.id_projet,
          userId,
          sectionName: 'documents',
          description: `Suppression du document #${id}`,
          transaction
        });
      }

      await document.destroy({ transaction });
      return document;
    });

    const { body, status } = successResponse(
      deletedDocument,
      'Document supprimé avec succès'
    );
    return res.json(body, { status });
  } catch (error) {
    console.error('Erreur DELETE document:', error);

    if (error.message === 'Document non trouvé') {
      const { body, status } = errorResponse(error.message, 404);
      return res.json(body, { status });
    }

    const { body, status } = errorResponse(
      'Erreur lors de la suppression du document',
      500,
      error.message
    );
    return res.json(body, { status });
  }
  }
  else if (req.method === 'PATCH') {

  try {
    const { id } = params;
    const updates = req.body;
    const userId = extractUserId(req, updates);

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return res.json(body, { status });
    }

    if (!updates.lien_local && !updates.lien_web) {
      const { body, status } = validationErrorResponse([
        'Un lien local ou web est requis'
      ]);
      return res.json(body, { status });
    }

    const updatedDocument = await withTransaction(async (transaction) => {
      const document = await Document.findByPk(id, { transaction });
      if (!document) throw new Error('Document non trouvé');

      // 📸 Sauvegarder la version actuelle avant modification
      if (userId && document.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: document.id_projet,
          userId,
          sectionName: 'documents',
          description: `Modification du document #${id}`,
          transaction
        });
      }

      await document.update({
        lien_local: updates.lien_local || document.lien_local,
        lien_web: updates.lien_web || document.lien_web
      }, { transaction });

      return document;
    });

    const { body, status } = successResponse(
      updatedDocument,
      'Document mis à jour avec succès'
    );
    return res.json(body, { status });
  } catch (error) {
    console.error('Erreur PATCH document:', error);

    if (error.message === 'Document non trouvé') {
      const { body, status } = errorResponse(error.message, 404);
      return res.json(body, { status });
    }

    const { body, status } = errorResponse(
      'Erreur lors de la mise à jour du document',
      500,
      error.message
    );
    return res.json(body, { status });
  }
  }
  else if (req.method === 'OPTIONS') {

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app/api/document/[id]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { validateId } from '@/backend/utils/validate';
import { successResponse, errorResponse, validationErrorResponse } from '@/backend/utils/response';
import { withTransaction } from '@/backend/utils/database';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { Document } = db;

// GET - récupérer un document par son ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return NextResponse.json(body, { status });
    }

    const document = await Document.findByPk(id);
    
    if (!document) {
      const { body, status } = errorResponse('Document non trouvé', 404);
      return NextResponse.json(body, { status });
    }

    const { body, status } = successResponse(document);
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error('Erreur GET document:', error);
    const { body, status } = errorResponse(
      'Erreur lors de la récupération du document', 
      500, 
      error.message
    );
    return NextResponse.json(body, { status });
  }
}

// PATCH - modifier un document
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const updates = await request.json();
    const userId = extractUserId(request, updates);

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return NextResponse.json(body, { status });
    }

    if (!updates.lien_local && !updates.lien_web) {
      const { body, status } = validationErrorResponse([
        'Un lien local ou web est requis'
      ]);
      return NextResponse.json(body, { status });
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
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error('Erreur PATCH document:', error);

    if (error.message === 'Document non trouvé') {
      const { body, status } = errorResponse(error.message, 404);
      return NextResponse.json(body, { status });
    }

    const { body, status } = errorResponse(
      'Erreur lors de la mise à jour du document',
      500,
      error.message
    );
    return NextResponse.json(body, { status });
  }
}

// DELETE - supprimer un document
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get('userId'), 10) || null;

    if (!validateId(id)) {
      const { body, status } = errorResponse('ID document invalide', 400);
      return NextResponse.json(body, { status });
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
    return NextResponse.json(body, { status });
  } catch (error) {
    console.error('Erreur DELETE document:', error);

    if (error.message === 'Document non trouvé') {
      const { body, status } = errorResponse(error.message, 404);
      return NextResponse.json(body, { status });
    }

    const { body, status } = errorResponse(
      'Erreur lors de la suppression du document',
      500,
      error.message
    );
    return NextResponse.json(body, { status });
  }
}

// OPTIONS - support CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

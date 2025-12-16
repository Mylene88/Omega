// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app/api/document/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { Document, Projet } = db;  

// GET → tous les documents
export async function GET() {
  try {
    const documents = await Document.findAll({
      include: [{ 
        model: Projet, 
        attributes: ['id_projet', 'nom_projet'] 
      }]
    });

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/document:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// POST → ajouter un document à un projet
export async function POST(request) {
  const transaction = await db.sequelize.transaction();

  try {
    const data = await request.json();
    const { id_projet, lien_local, lien_web } = data;
    const userId = extractUserId(request, data);

    // Validation
    if (!id_projet) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        error: 'ID projet requis'
      }, { status: 400 });
    }

    if (!lien_local && !lien_web) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        error: 'Un lien local ou web est requis'
      }, { status: 400 });
    }

    // Vérifie que le projet existe
    const projet = await Projet.findByPk(id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        error: 'Projet non trouvé'
      }, { status: 404 });
    }

    // 📸 Sauvegarder la version actuelle avant ajout
    if (userId && id_projet) {
      await saveCurrentSectionVersion({
        idProjet: id_projet,
        userId,
        sectionName: 'documents',
        description: 'Ajout d\'un nouveau document',
        transaction
      });
    }

    const doc = await Document.create({
      id_projet,
      lien_local,
      lien_web
    }, { transaction });

    await transaction.commit();

    return NextResponse.json({
      success: true,
      message: 'Document ajouté avec succès',
      data: {
        id_document: doc.id_document,
        id_projet: doc.id_projet,
        lien_local: doc.lien_local,
        lien_web: doc.lien_web
      }
    }, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur POST /api/document:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// Force dynamic rendering (no static generation at build time)

//backend/app/api/document/route.js

import db from '../../../models';
import { saveCurrentSectionVersion, extractUserId } from '../../../lib/sectionVersionHelper';

const { Document, Projet } = db;  

// GET → tous les documents


// POST → ajouter un document à un projet


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    const documents = await Document.findAll({
      include: [{ 
        model: Projet, 
        attributes: ['id_projet', 'nom_projet'] 
      }]
    });

    return res.json({
      success: true,
      data: documents,
      count: documents.length
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/document:', error);
    return res.json({ 
      success: false,
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  const transaction = await db.sequelize.transaction();

  try {
    const data = req.body;
    const { id_projet, lien_local, lien_web } = data;
    const userId = extractUserId(req, data);

    // Validation
    if (!id_projet) {
      await transaction.rollback();
      return res.json({
        success: false,
        error: 'ID projet requis'
      }, { status: 400 });
    }

    if (!lien_local && !lien_web) {
      await transaction.rollback();
      return res.json({
        success: false,
        error: 'Un lien local ou web est requis'
      }, { status: 400 });
    }

    // Vérifie que le projet existe
    const projet = await Projet.findByPk(id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return res.json({
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

    return res.json({
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
    return res.json({
      success: false,
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

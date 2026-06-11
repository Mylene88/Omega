import { requireAuth } from '../../../lib/authHelper';
import db from '../../../models';
import {
  SECTION_NAMES,
  isValidSectionName,
  getAllSectionsMetadata,
  getSectionMetadata,
  acquireSectionLock,
  assertSectionRevision,
  releaseSectionLock,
  saveSectionData
} from '../../../lib/projectSectionConcurrency';

export default async function handler(req, res) {
  const authResult = await requireAuth(req);
  if (!authResult.allowed) {
    return res.status(authResult.status).json(authResult.response);
  }

  const userId = authResult.userId;

  if (req.method === 'GET') {
    try {
      const idProjet = req.query.idProjet;
      const sectionName = req.query.sectionName;

      if (!idProjet) {
        return res.status(400).json({ success: false, message: 'idProjet est requis' });
      }

      const projet = await db.Projet.findByPk(idProjet);
      if (!projet) {
        return res.status(404).json({ success: false, message: 'Projet non trouvé' });
      }

      if (sectionName) {
        if (!isValidSectionName(sectionName)) {
          return res.status(400).json({ success: false, message: `Section invalide: ${sectionName}` });
        }
        const metadata = await getSectionMetadata(idProjet, sectionName);
        return res.status(200).json({ success: true, data: metadata });
      }

      const metadata = await getAllSectionsMetadata(idProjet);
      return res.status(200).json({ success: true, data: metadata, sections: SECTION_NAMES });
    } catch (error) {
      console.error('❌ Erreur GET /api/project-sections:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des métadonnées de section' });
    }
  }

  if (req.method === 'PUT') {
    const transaction = await db.sequelize.transaction();
    let lockAcquired = false;
    let lockContext = null;
    let committed = false;

    try {
      const { idProjet, sectionName, sectionData, expectedRevision } = req.body || {};

      if (!idProjet || !sectionName) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'idProjet et sectionName sont requis' });
      }

      if (!isValidSectionName(sectionName)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Section invalide: ${sectionName}` });
      }

      const projet = await db.Projet.findByPk(idProjet, { transaction });
      if (!projet) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Projet non trouvé' });
      }

      if (projet.demande_suppression) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Ce projet est en attente de suppression. Les modifications sont bloquées jusqu’à la validation ou au rejet de la demande.'
        });
      }

      try {
        lockContext = { idProjet, sectionName, userId };
        await acquireSectionLock(lockContext);
        lockAcquired = true;
      } catch (error) {
        await transaction.rollback();
        return res.status(423).json({
          success: false,
          message: 'Cette section est en cours d’enregistrement par un autre agent. Réessayez dans un instant.',
          code: error.code,
          lock: error.lock || null
        });
      }

      try {
        await assertSectionRevision({ idProjet, sectionName, expectedRevision, transaction });
      } catch (error) {
        await transaction.rollback();
        if (lockAcquired && lockContext) {
          await releaseSectionLock(lockContext).catch(() => undefined);
          lockAcquired = false;
        }
        return res.status(409).json({
          success: false,
          message: 'Cette section a été modifiée par un autre agent. Rechargez avant de sauvegarder.',
          code: error.code,
          currentRevision: error.currentRevision,
          updatedAt: error.updatedAt,
          updatedBy: error.updatedBy
        });
      }

      const currentData = await saveSectionData({
        idProjet,
        sectionName,
        data: sectionData,
        userId,
        transaction
      });

      await transaction.commit();
      committed = true;
      await releaseSectionLock(lockContext).catch(() => undefined);
      lockAcquired = false;

      const metadata = await getSectionMetadata(idProjet, sectionName);
      return res.status(200).json({
        success: true,
        message: `Section ${sectionName} enregistrée avec succès`,
        data: {
          sectionName,
          sectionData: currentData,
          metadata
        }
      });
    } catch (error) {
      if (!committed) {
        await transaction.rollback();
      }
      if (lockAcquired && lockContext) {
        await releaseSectionLock(lockContext).catch(() => undefined);
      }
      console.error('❌ Erreur PUT /api/project-sections:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l’enregistrement de la section',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ success: false, message: `Méthode ${req.method} non autorisée` });
}

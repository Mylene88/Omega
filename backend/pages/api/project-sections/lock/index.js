import { requireAuth } from '../../../../lib/authHelper';
import db from '../../../../models';
import {
  isValidSectionName,
  acquireSectionLock,
  releaseSectionLock,
  getSectionMetadata
} from '../../../../lib/projectSectionConcurrency';

export default async function handler(req, res) {
  const authResult = await requireAuth(req);
  if (!authResult.allowed) {
    return res.status(authResult.status).json(authResult.response);
  }

  const userId = authResult.userId;

  try {
    const body = req.body || {};
    const idProjet = body.idProjet || req.query.idProjet;
    const sectionName = body.sectionName || req.query.sectionName;
    const action = body.action || req.query.action || 'acquire';

    if (!idProjet || !sectionName) {
      return res.status(400).json({ success: false, message: 'idProjet et sectionName sont requis' });
    }

    if (!isValidSectionName(sectionName)) {
      return res.status(400).json({ success: false, message: `Section invalide: ${sectionName}` });
    }

    const projet = await db.Projet.findByPk(idProjet);
    if (!projet) {
      return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    }

    if (req.method === 'GET') {
      const metadata = await getSectionMetadata(idProjet, sectionName);
      return res.status(200).json({ success: true, data: metadata });
    }

    if (req.method === 'POST') {
      if (action === 'release') {
        const metadata = await releaseSectionLock({ idProjet, sectionName, userId });
        return res.status(200).json({ success: true, data: metadata, message: 'Verrou libéré' });
      }

      try {
        const metadata = await acquireSectionLock({ idProjet, sectionName, userId });
        return res.status(200).json({ success: true, data: metadata, message: 'Verrou acquis' });
      } catch (error) {
        if (error.code === 'LOCKED') {
          return res.status(423).json({
            success: false,
            message: 'Section déjà en cours de modification',
            code: error.code,
            lock: error.lock
          });
        }
        throw error;
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: `Méthode ${req.method} non autorisée` });
  } catch (error) {
    console.error('❌ Erreur /api/project-sections/lock:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la gestion du verrou de section',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

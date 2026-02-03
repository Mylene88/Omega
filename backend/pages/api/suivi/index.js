// Force dynamic rendering (no static generation at build time)

//backend/app_backup/api/suivi/route.js

import db from '../../../models';
import { saveCurrentSectionVersion, extractUserId } from '../../../lib/sectionVersionHelper';

const { ProjetSuivi, User, Projet } = db;

// GET /api/suivi


// POST /api/suivi


export default async function handler(req, res) {
  if (req.method === 'GET') {
  // ✅ Enlevé contextPromise
  try {
    const suivis = await ProjetSuivi.findAll({
      include: [
        { model: User, as: 'auteur', attributes: ['id_user', 'username'] },
        { model: Projet, attributes: ['id_projet', 'nom_projet'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const result = suivis.map(s => ({
      id_suivi: s.id_suivi,
      projet_id: s.id_projet,
      projet_nom: s.projet?.nom_projet,
      suivi: s.suivi,
      created_at: s.created_at,
      created_by: s.auteur?.username || null,
    }));

    return res.status(200 ).json(result);
  } catch (error) {
    console.error('Erreur GET /api/suivi:', error);
    return res.status(500 ).json({ error: 'Impossible de récupérer les suivis' });
  }
  }
  else if (req.method === 'POST') {

  const transaction = await db.sequelize.transaction();

  try {
    const data = req.body;
    const userId = extractUserId(req, data) || data.created_by;

    const projet = await Projet.findByPk(data.id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Projet non trouvé' });
    }

    const user = await User.findByPk(data.created_by, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Utilisateur non trouvé' });
    }

    // 📸 Sauvegarder la version actuelle avant ajout
    if (userId && data.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: data.id_projet,
        userId,
        sectionName: 'suivis',
        description: 'Ajout d\'un nouveau suivi',
        transaction
      });
    }

    const suivi = await ProjetSuivi.create({
      id_projet: data.id_projet,
      suivi: data.suivi,
      created_by: data.created_by,
    }, { transaction });

    await transaction.commit();

    return res.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: user.username,
    }, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur POST /api/suivi:', error);
    return res.status(500 ).json({ error: 'Impossible de créer le suivi' });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

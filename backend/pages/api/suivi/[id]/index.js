// Force dynamic rendering (no static generation at build time)

//backend/app/api/suivi/[id]/route.js

import db from '../../../../models';
import { saveCurrentSectionVersion, extractUserId } from '../../../../lib/sectionVersionHelper';

const { ProjetSuivi, User } = db;

// GET /api/suivi/[id]


// PUT /api/suivi/[id]


// DELETE /api/suivi/[id]


export default async function handler(req, res) {
  if (req.method === 'GET') {
  // ✅ Changé
  try {
    const { id } = params;  // ✅ Accès direct
    
    const suivi = await ProjetSuivi.findByPk(id, {
      include: [{ 
        model: User, 
        as: 'auteur',  // ✅ Vérifiez l'alias
        attributes: ['id_user', 'username'] 
      }],
    });

    if (!suivi) {
      return res.status(404 ).json({ error: 'Suivi non trouvé' });
    }

    return res.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: suivi.auteur?.username || null,
    }, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/suivi/${params?.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'PUT') {

  const transaction = await db.sequelize.transaction();

  try {
    const { id } = params;
    const data = req.body;
    const userId = extractUserId(req, data);

    const suivi = await ProjetSuivi.findByPk(id, { transaction });

    if (!suivi) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Suivi non trouvé' });
    }

    // 📸 Sauvegarder la version actuelle avant modification
    if (userId && suivi.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: suivi.id_projet,
        userId,
        sectionName: 'suivis',
        description: `Modification du suivi #${id}`,
        transaction
      });
    }

    await suivi.update({
      suivi: data.suivi ?? suivi.suivi,
    }, { transaction });

    const user = await User.findByPk(suivi.created_by, { transaction });

    await transaction.commit();

    return res.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: user?.username || null,
    }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur PUT /api/suivi/${params?.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'DELETE') {

  const transaction = await db.sequelize.transaction();

  try {
    const { id } = params;
    const url = new URL(req.url);
    const userId = parseInt(url.req.query.userId, 10) || null;

    const suivi = await ProjetSuivi.findByPk(id, { transaction });

    if (!suivi) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Suivi non trouvé' });
    }

    // 📸 Sauvegarder la version actuelle avant suppression
    if (userId && suivi.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: suivi.id_projet,
        userId,
        sectionName: 'suivis',
        description: `Suppression du suivi #${id}`,
        transaction
      });
    }

    await suivi.destroy({ transaction });

    await transaction.commit();

    return res.status(200 ).json({ message: 'Suivi supprimé' });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur DELETE /api/suivi/${params?.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

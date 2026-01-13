// Force dynamic rendering (no static generation at build time)

//backend/app/api/porteurs/[id]/route.js
import db from '../../../../models';
import { saveCurrentSectionVersion, extractUserId } from '../../../../lib/sectionVersionHelper';

const { ProjetPorteur, TypePorteurEnum, Projet } = db;  
// GET /api/porteur/[id]


// PUT /api/porteur/[id]


// DELETE /api/porteur/[id]


export default async function handler(req, res) {
  if (req.method === 'GET') {

  const { params } = await contextPromise; // Attend le contexte
  try {
    const porteur = await ProjetPorteur.findByPk(params.id, {
      include: [{ model: TypePorteurEnum, attributes: ['id_type_porteur', 'libelle'] }],
    });
    if (!porteur) {
      return res.status(404 ).json({ error: 'Porteur non trouvé' });
    }
    return res.status(200 ).json(porteur);
  } catch (error) {
    console.error(`Erreur GET /api/porteur/${params.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'PUT') {

  const { params } = await contextPromise; // Attend le contexte
  const transaction = await db.sequelize.transaction();

  try {
    const data = await _req.json();
    const userId = extractUserId(_req, data);

    const porteur = await ProjetPorteur.findByPk(params.id, { transaction });
    if (!porteur) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Porteur non trouvé' });
    }

    if (data.type_porteur_id) {
      const type = await TypePorteurEnum.findByPk(data.type_porteur_id, { transaction });
      if (!type) {
        await transaction.rollback();
        return res.status(400 ).json({ error: 'Type de porteur invalide' });
      }
    }

    // 📸 Sauvegarder la version actuelle avant modification
    if (userId && porteur.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: porteur.id_projet,
        userId,
        sectionName: 'porteurs',
        description: `Modification du porteur #${params.id}`,
        transaction
      });
    }

    await porteur.update(data, { transaction });
    await transaction.commit();

    return res.status(200 ).json(porteur);
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur PUT /api/porteur/${params.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'DELETE') {

  const { params } = await contextPromise; // Attend le contexte
  const transaction = await db.sequelize.transaction();

  try {
    const url = new URL(_req.url);
    const userId = parseInt(url.req.query.userId, 10) || null;

    const porteur = await ProjetPorteur.findByPk(params.id, { transaction });
    if (!porteur) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Porteur non trouvé' });
    }

    // 📸 Sauvegarder la version actuelle avant suppression
    if (userId && porteur.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: porteur.id_projet,
        userId,
        sectionName: 'porteurs',
        description: `Suppression du porteur #${params.id}`,
        transaction
      });
    }

    await porteur.destroy({ transaction });
    await transaction.commit();

    return res.status(200 ).json({ message: 'Porteur supprimé' });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur DELETE /api/porteur/${params.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

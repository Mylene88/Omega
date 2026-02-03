// Force dynamic rendering (no static generation at build time)

// app_backup/api/porteur/route.js

import db from '../../../models';
import { saveCurrentSectionVersion, extractUserId } from '../../../lib/sectionVersionHelper';

const { ProjetPorteur, TypePorteurEnum, Projet } = db;





export default async function handler(req, res) {
  if (req.method === 'GET') {
  // ✅ Enlevé contextPromise
  try {
    const porteurs = await ProjetPorteur.findAll({
      include: [{
        model: TypePorteurEnum,
        attributes: ['id_type_porteur', 'libelle']
      }],
    });

    return res.status(200 ).json(porteurs);
  } catch (error) {
    console.error('Erreur GET /api/porteur:', error);
    return res.status(500 ).json({
      error: 'Impossible de récupérer les porteurs'
    });
  }
  }
  else if (req.method === 'POST') {

  const transaction = await db.sequelize.transaction();

  try {
    const data = req.body;
    const userId = extractUserId(req, data);

    const projet = await Projet.findByPk(data.id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return res.status(404 ).json({ error: 'Projet non trouvé' });
    }

    const type = await TypePorteurEnum.findByPk(data.type_porteur_id, { transaction });
    if (!type) {
      await transaction.rollback();
      return res.status(400 ).json({ error: 'Type porteur invalide' });
    }

    // 📸 Sauvegarder la version actuelle avant ajout
    if (userId && data.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: data.id_projet,
        userId,
        sectionName: 'porteurs',
        description: 'Ajout d\'un nouveau porteur',
        transaction
      });
    }

    const porteur = await ProjetPorteur.create({
      id_projet: data.id_projet,
      type_porteur_id: data.type_porteur_id,
      nom_structure: data.nom_structure,
      autre_type_porteur: data.autre_type_porteur || null,
      referent_nom: data.referent_nom || null,
      referent_fonction: data.referent_fonction || null,
      referent_email: data.referent_email || null,
      referent_tel: data.referent_tel || null,
    }, { transaction });

    console.log('le porteur de ce projet est :', porteur);

    const porteurWithType = await ProjetPorteur.findByPk(porteur.id_porteur, {
      include: [{ model: TypePorteurEnum, attributes: ['libelle'] }],
      transaction
    });

    await transaction.commit();

    return res.status(201 ).json(porteurWithType);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur POST /api/projet-porteur:', error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

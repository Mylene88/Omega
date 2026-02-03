// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/projets/[id]/restore/index.js

import db from '../../../../../models';

const { Projet } = db;

/**
 * POST /api/projets/[id]/restore
 * Restaure un projet supprimé (soft delete)
 */

export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // ✅ OPTIONS - Preflight CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }


  if (req.method === 'POST') {

  try {
    const { id } = req.query;

    console.log(`🔄 Tentative de restauration du projet: ${id}`);

    // Rechercher le projet dans les soft-deleted
    const projet = await Projet.findOne({
      where: { id_projet: id },
      paranoid: false  // Inclure les soft-deleted
    });

    if (!projet) {
        console.warn(`⚠️ Projet ${id} non trouvé (même dans les supprimés)`);
          return res.status(404).json({
            success: false,
            error: 'Projet non trouvé'
          });
    }

    // Vérifier si le projet est vraiment supprimé
    if (!projet.deleted_at) {
        console.warn(`⚠️ Projet ${id} n'est pas supprimé`);
          return res.status(400).json({
            success: false,
            error: 'Ce projet n\'est pas supprimé'
          });
    }


    // Restaurer le projet
    await projet.restore();

    // Remettre demande_suppression à false
    await projet.update({ demande_suppression: false });

    console.log(`✅ Projet ${id} restauré avec succès`);

    return res.json({
      success: true,
      message: `Projet "${projet.nom_projet}" restauré avec succès`,
      data: {
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        deleted_at: null,
        demande_suppression: false
      }
    });

  } catch (error) {
      console.error(`❌ Erreur lors de la restauration du projet ${req.query.id}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la restauration du projet',
        details: error.message
      });
    }
  }

  // ✅ Méthode non autorisée
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  return res.status(405).json({
    success: false,
    error: `Method ${req.method} Not Allowed`
  });
}

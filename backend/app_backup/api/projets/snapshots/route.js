// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/projets/snapshots/route.js
/**
 * API pour gérer le versioning des projets
 * - Sauvegarde automatique des snapshots (max 10 par user)
 * - Sauvegarde par section (projet_info, porteurs, suivis, thematiques, documents, geometrie)
 * - Rétention 15 jours
 * - Restauration sélective par section
 */

const db = require('../../../../models');
const { ProjetSnapshot, ProjetSnapshotSection, Projet, User } = db;

/**
 * POST /api/projets/snapshots/create
 * Créer un snapshot avec toutes les sections
 */
exports.POST = async (req, res) => {
  const { id_projet, user_id, sections, description } = req.body;

  try {
    // Validation
    if (!id_projet || !user_id || !sections) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: id_projet, user_id, sections requis'
      });
    }

    // Vérifier que le projet existe
    const projet = await Projet.findOne({ where: { id: id_projet } });
    if (!projet) {
      return res.status(404).json({
        success: false,
        error: 'Projet introuvable'
      });
    }

    // Calculer le prochain numéro de version (1-10 avec rotation)
    const maxSnapshot = await ProjetSnapshot.findOne({
      where: { id_projet, user_id },
      order: [['version_number', 'DESC']]
    });

    let nextVersion = 1;
    if (maxSnapshot) {
      nextVersion = maxSnapshot.version_number >= 10 ? 1 : maxSnapshot.version_number + 1;

      // Si on réutilise le numéro 1, supprimer l'ancien snapshot avec ce numéro
      if (nextVersion === 1) {
        await ProjetSnapshot.destroy({
          where: { id_projet, user_id, version_number: 1 }
        });
      }
    }

    // Démarquer tous les snapshots précédents comme non-courants
    await ProjetSnapshot.update(
      { is_current: false },
      { where: { id_projet, user_id } }
    );

    // Créer le nouveau snapshot
    const snapshot = await ProjetSnapshot.create({
      id_projet,
      user_id,
      version_number: nextVersion,
      snapshot_date: new Date(),
      description: description || `Version ${nextVersion}`,
      is_current: true
    });

    // Sauvegarder chaque section
    const sectionNames = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
    const savedSections = [];

    for (const sectionName of sectionNames) {
      if (sections[sectionName]) {
        const section = await ProjetSnapshotSection.create({
          id_snapshot: snapshot.id_snapshot,
          section_name: sectionName,
          section_data: sections[sectionName]
        });
        savedSections.push(section);
      }
    }

    // Retourner le snapshot créé
    return res.status(201).json({
      success: true,
      message: `Snapshot version ${nextVersion} créé avec succès`,
      data: {
        snapshot: {
          id_snapshot: snapshot.id_snapshot,
          version_number: snapshot.version_number,
          snapshot_date: snapshot.snapshot_date,
          is_current: snapshot.is_current,
          sections_count: savedSections.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur création snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du snapshot',
      details: error.message
    });
  }
};

/**
 * GET /api/projets/snapshots/list?id_projet=XXX&user_id=YYY
 * Lister tous les snapshots d'un projet pour un utilisateur
 */
exports.GET = async (req, res) => {
  const { id_projet, user_id } = req.query;

  try {
    if (!id_projet || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: id_projet et user_id requis'
      });
    }

    // Récupérer tous les snapshots avec leurs sections
    const snapshots = await ProjetSnapshot.findAll({
      where: { id_projet, user_id },
      include: [
        {
          model: ProjetSnapshotSection,
          as: 'sections',
          attributes: ['id_section', 'section_name']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        }
      ],
      order: [['version_number', 'DESC']]
    });

    // Formater la réponse
    const formattedSnapshots = snapshots.map(snap => ({
      id_snapshot: snap.id_snapshot,
      version_number: snap.version_number,
      snapshot_date: snap.snapshot_date,
      description: snap.description,
      is_current: snap.is_current,
      created_by: snap.user ? {
        id: snap.user.id_user,
        username: snap.user.username,
        nom_complet: snap.user.prenom && snap.user.nom
          ? `${snap.user.prenom} ${snap.user.nom}`
          : snap.user.username
      } : null,
      sections: snap.sections.map(s => s.section_name),
      sections_count: snap.sections.length
    }));

    return res.status(200).json({
      success: true,
      data: {
        snapshots: formattedSnapshots,
        total: formattedSnapshots.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur listage snapshots:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du listage des snapshots',
      details: error.message
    });
  }
};

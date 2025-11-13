// backend/app/api/projets/snapshots/restore/route.js
/**
 * API pour restaurer des sections depuis un snapshot
 */

const db = require('../../../../../models');
const { ProjetSnapshot, ProjetSnapshotSection } = db.principale;

/**
 * POST /api/projets/snapshots/restore
 * Restaurer une ou plusieurs sections depuis un snapshot
 *
 * Body: {
 *   id_snapshot: number,
 *   sections: string[] // ex: ['projet_info', 'porteurs']
 * }
 */
exports.POST = async (req, res) => {
  const { id_snapshot, sections } = req.body;

  try {
    // Validation
    if (!id_snapshot || !sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres invalides. id_snapshot et sections (array) requis'
      });
    }

    // Vérifier que le snapshot existe
    const snapshot = await ProjetSnapshot.findOne({
      where: { id_snapshot }
    });

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot introuvable'
      });
    }

    // Récupérer les sections demandées
    const snapshotSections = await ProjetSnapshotSection.findAll({
      where: {
        id_snapshot,
        section_name: sections
      }
    });

    if (snapshotSections.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune section trouvée pour ce snapshot'
      });
    }

    // Formater les données à retourner
    const restoredData = {};
    snapshotSections.forEach(section => {
      restoredData[section.section_name] = section.section_data;
    });

    return res.status(200).json({
      success: true,
      message: `${snapshotSections.length} section(s) restaurée(s)`,
      data: {
        snapshot: {
          id_snapshot: snapshot.id_snapshot,
          version_number: snapshot.version_number,
          snapshot_date: snapshot.snapshot_date,
          description: snapshot.description
        },
        sections: restoredData
      }
    });

  } catch (error) {
    console.error('❌ Erreur restauration snapshot:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la restauration',
      details: error.message
    });
  }
};

/**
 * GET /api/projets/snapshots/restore/:id_snapshot/:section_name
 * Récupérer une section spécifique d'un snapshot
 */
exports.GET = async (req, res) => {
  const { id_snapshot, section_name } = req.params;

  try {
    // Validation
    const validSections = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
    if (!validSections.includes(section_name)) {
      return res.status(400).json({
        success: false,
        error: `Section invalide. Doit être parmi: ${validSections.join(', ')}`
      });
    }

    // Récupérer la section
    const section = await ProjetSnapshotSection.findOne({
      where: { id_snapshot, section_name },
      include: [{
        model: ProjetSnapshot,
        as: 'snapshot',
        attributes: ['id_snapshot', 'version_number', 'snapshot_date', 'description', 'id_projet']
      }]
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        error: 'Section introuvable dans ce snapshot'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        snapshot_info: {
          id_snapshot: section.snapshot.id_snapshot,
          version_number: section.snapshot.version_number,
          snapshot_date: section.snapshot.snapshot_date,
          description: section.snapshot.description,
          id_projet: section.snapshot.id_projet
        },
        section_name,
        section_data: section.section_data
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération section:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la section',
      details: error.message
    });
  }
};

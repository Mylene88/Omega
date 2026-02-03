// backend/pages/api/projets/snapshots/index.js
import db from '../../../../models';
const { ProjetSnapshot, ProjetSnapshotSection, Projet, User } = db;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { id_projet, user_id, sections, description } = req.body;

    try {
      if (!id_projet || !user_id || !sections) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants: id_projet, user_id, sections requis'
        });
      }

      const projet = await Projet.findOne({ where: { id: id_projet } });
      if (!projet) {
        return res.status(404).json({
          success: false,
          error: 'Projet introuvable'
        });
      }

      const maxSnapshot = await ProjetSnapshot.findOne({
        where: { id_projet, user_id },
        order: [['version_number', 'DESC']]
      });

      let nextVersion = 1;
      if (maxSnapshot) {
        nextVersion = maxSnapshot.version_number >= 10 ? 1 : maxSnapshot.version_number + 1;
        if (nextVersion === 1) {
          await ProjetSnapshot.destroy({
            where: { id_projet, user_id, version_number: 1 }
          });
        }
      }

      await ProjetSnapshot.update(
        { is_current: false },
        { where: { id_projet, user_id } }
      );

      const snapshot = await ProjetSnapshot.create({
        id_projet,
        user_id,
        version_number: nextVersion,
        snapshot_date: new Date(),
        description: description || `Version ${nextVersion}`,
        is_current: true
      });

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
  }
  else if (req.method === 'GET') {
    const { id_projet, user_id } = req.query;

    try {
      if (!id_projet || !user_id) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants: id_projet et user_id requis'
        });
      }

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
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

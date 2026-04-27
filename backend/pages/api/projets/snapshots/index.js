// backend/pages/api/projets/snapshots/index.js
import db from '../../../../models';
import { createSnapshot } from '../../../../lib/auditHelper';
import { requireAuth } from '../../../../lib/authHelper';
const { ProjetSnapshot, ProjetSnapshotSection, Projet, User } = db;

const SNAPSHOT_SECTIONS = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];

function parsePositiveInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeLimit(value, fallback = 50, max = 200) {
  const parsed = parsePositiveInt(value);
  if (!parsed) return fallback;
  return Math.min(parsed, max);
}

function buildSnapshotPayloadFromSections(project, sections) {
  const safeSections = sections && typeof sections === 'object' ? sections : {};
  const projetInfo = safeSections.projet_info && typeof safeSections.projet_info === 'object'
    ? safeSections.projet_info
    : {};

  return {
    nom_projet: projetInfo.nom_projet || project.nom_projet || null,
    description: projetInfo.description ?? project.description ?? null,
    statut_projet_id: projetInfo.statut_projet_id ?? project.statut_projet_id ?? null,
    date_ident_projet: projetInfo.date_ident_projet ?? project.date_ident_projet ?? null,
    projet_signale: projetInfo.projet_signale ?? project.projet_signale ?? false,
    charte_accueil: projetInfo.charte_accueil ?? project.charte_accueil ?? false,
    demande_suppression: projetInfo.demande_suppression ?? project.demande_suppression ?? false,
    demande_archivage: projetInfo.demande_archivage ?? project.demande_archivage ?? false,
    demande_restauration: projetInfo.demande_restauration ?? project.demande_restauration ?? false,
    is_archived: projetInfo.is_archived ?? project.is_archived ?? false,
    archived_at: projetInfo.archived_at ?? project.archived_at ?? null,
    archived_by: projetInfo.archived_by ?? project.archived_by ?? null,
    service_id: projetInfo.service_id ?? project.service_id ?? null,
    referent_ddt: projetInfo.referent_ddt ?? project.referent_ddt ?? null,
    porteurs: Array.isArray(safeSections.porteurs) ? safeSections.porteurs : [],
    suivis: Array.isArray(safeSections.suivis) ? safeSections.suivis : [],
    thematiques: Array.isArray(safeSections.thematiques) ? safeSections.thematiques : [],
    documents: Array.isArray(safeSections.documents) ? safeSections.documents : [],
    geometry: safeSections.geometrie && typeof safeSections.geometrie === 'object'
      ? safeSections.geometrie
      : {}
  };
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      return res.status(authResult.status).json(authResult.response);
    }

    const { id_projet, sections, description, skipRotation = false } = req.body;

    try {
      const userId = authResult.userId;

      if (!id_projet || !sections || typeof sections !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Paramètres invalides: id_projet et sections (objet) requis'
        });
      }

      const projet = await Projet.findByPk(id_projet);
      if (!projet) {
        return res.status(404).json({
          success: false,
          error: 'Projet introuvable'
        });
      }

      const snapshotPayload = buildSnapshotPayloadFromSections(projet, sections);

      const snapshot = await createSnapshot({
        idProjet: id_projet,
        projetData: snapshotPayload,
        description: description || `Snapshot manuel (API projets/snapshots)`,
        userId,
        skipRotation: !!skipRotation
      });

      const sectionsCount = SNAPSHOT_SECTIONS.filter((name) => sections[name] !== undefined).length;

      return res.status(201).json({
        success: true,
        message: `Snapshot version ${snapshot.version_number} créé avec succès`,
        data: {
          snapshot: {
            id_snapshot: snapshot.id_snapshot,
            version_number: snapshot.version_number,
            snapshot_date: snapshot.snapshot_date,
            is_current: snapshot.is_current,
            sections_count: sectionsCount
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
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      return res.status(authResult.status).json(authResult.response);
    }

    const { id_projet } = req.query;

    try {
      const limit = normalizeLimit(req.query.limit, 100);
      const userId = authResult.userId;

      if (!id_projet) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants ou invalides: id_projet requis'
        });
      }

      const snapshots = await ProjetSnapshot.findAll({
        where: { id_projet, user_id: userId },
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
        order: [['snapshot_date', 'DESC']],
        limit
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

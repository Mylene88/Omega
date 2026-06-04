import { requireAdmin } from '../../../../../lib/adminAuthHelper';
import db from '../../../../../models';

const { getCurrentSectionData } = require('../../../../../lib/sectionVersionHelper');

const SECTION_FIELD_LABELS = {
  projet_info: {
    nom_projet: 'Nom du projet',
    description: 'Description',
    statut_projet_id: 'Statut',
    date_ident_projet: 'Date d’identification',
    projet_signale: 'Projet signalé',
    charte_accueil: 'Charte accueil',
    service_id: 'Service',
    referent_ddt: 'Référent DDT'
  },
  suivis: {
    enjeuPrioritaire: 'Enjeu prioritaire',
    charteAccueil: 'Charte accueil',
    service_id: 'Service',
    contactDDT: 'Contact DDT',
    historique: 'Historique'
  },
  geometrie: {
    geom_type: 'Type de géométrie',
    communes_traversees: 'Communes traversées',
    codes_insee: 'Codes INSEE',
    epci: 'EPCI',
    arrondissements: 'Arrondissements',
    deputes: 'Députés',
    maires: 'Maires'
  }
};

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function formatDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function summarizeValue(value, key = '') {
  if (value === null || value === undefined || value === '') {
    return 'Vide';
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    if (key.toLowerCase().includes('date')) {
      return formatDateValue(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'Aucun élément';
    if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.slice(0, 4).join(', ') + (value.length > 4 ? ` (+${value.length - 4})` : '');
    }
    return `${value.length} élément${value.length > 1 ? 's' : ''}`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return 'Aucune donnée';
    return `${keys.length} champ${keys.length > 1 ? 's' : ''}`;
  }

  return String(value);
}

function buildObjectChanges(sectionName, beforeData = {}, afterData = {}) {
  const fieldLabels = SECTION_FIELD_LABELS[sectionName] || {};
  const keys = Array.from(new Set([
    ...Object.keys(beforeData || {}),
    ...Object.keys(afterData || {})
  ]));

  return keys
    .filter((key) => !deepEqual(beforeData?.[key], afterData?.[key]))
    .map((key) => ({
      key,
      label: fieldLabels[key] || key,
      before: summarizeValue(beforeData?.[key], key),
      after: summarizeValue(afterData?.[key], key)
    }));
}

function buildSectionDiff(sectionName, beforeData, currentData) {
  if (Array.isArray(beforeData) || Array.isArray(currentData)) {
    const beforeArray = Array.isArray(beforeData) ? beforeData : [];
    const currentArray = Array.isArray(currentData) ? currentData : [];
    const hasChanges = !deepEqual(beforeArray, currentArray);

    return {
      hasChanges,
      changes: hasChanges ? [{
        key: 'section_data',
        label: 'Contenu de la section',
        before: summarizeValue(beforeArray),
        after: summarizeValue(currentArray)
      }] : []
    };
  }

  if (
    beforeData &&
    currentData &&
    typeof beforeData === 'object' &&
    typeof currentData === 'object'
  ) {
    const changes = buildObjectChanges(sectionName, beforeData, currentData);
    return {
      hasChanges: changes.length > 0,
      changes
    };
  }

  const hasChanges = !deepEqual(beforeData, currentData);
  return {
    hasChanges,
    changes: hasChanges ? [{
      key: 'section_data',
      label: 'Valeur',
      before: summarizeValue(beforeData),
      after: summarizeValue(currentData)
    }] : []
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const adminCheck = await requireAdmin(req);
      if (!adminCheck.allowed) {
        return res.status(adminCheck.status).json(adminCheck.response);
      }

      const idVersion = parseInt(req.query.idVersion, 10);
      if (!Number.isInteger(idVersion) || idVersion <= 0) {
        return res.status(400).json({
          success: false,
          message: 'idVersion est requis'
        });
      }

      const version = await db.SectionVersion.findByPk(idVersion, {
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id_user', 'username', 'prenom', 'nom']
          },
          {
            model: db.Projet,
            as: 'projet',
            attributes: ['id_projet', 'nom_projet']
          }
        ]
      });

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Version introuvable'
        });
      }

      const currentData = await getCurrentSectionData(version.id_projet, version.section_name);
      const diff = buildSectionDiff(version.section_name, version.section_data, currentData);

      return res.json({
        success: true,
        data: {
          idVersion: version.id_version,
          idProjet: version.id_projet,
          projetNom: version.projet?.nom_projet || 'Projet inconnu',
          sectionName: version.section_name,
          versionNumber: version.version_number,
          snapshotDate: version.snapshot_date,
          createdBy: version.user ? {
            id: version.user.id_user,
            username: version.user.username,
            nomComplet: `${version.user.prenom || ''} ${version.user.nom || ''}`.trim() || version.user.username
          } : null,
          beforeData: version.section_data,
          currentData,
          hasChanges: diff.hasChanges,
          changes: diff.changes
        }
      });
    } catch (error) {
      console.error('❌ Erreur GET /api/admin/section-versions/compare:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la comparaison de version',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  if (req.method === 'OPTIONS') {
    return res.json({});
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

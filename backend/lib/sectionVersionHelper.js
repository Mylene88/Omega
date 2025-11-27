// backend/lib/sectionVersionHelper.js

/**
 * Helper pour la sauvegarde automatique des versions de sections
 * Permet de créer automatiquement un snapshot d'une section avant sa modification
 */

const db = require('../models');
const { createSectionVersion } = require('./auditHelper');

/**
 * Récupère les données actuelles d'une section pour un projet
 * @param {string} idProjet - ID du projet
 * @param {string} sectionName - Nom de la section
 * @param {Object} transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object|Array>} Les données de la section
 */
async function getCurrentSectionData(idProjet, sectionName, transaction = null) {
  const options = transaction ? { transaction } : {};

  try {
    switch (sectionName) {
      case 'projet_info': {
        const projet = await db.Projet.findByPk(idProjet, options);
        if (!projet) return null;
        return {
          nom_projet: projet.nom_projet,
          description: projet.description,
          statut_projet_id: projet.statut_projet_id,
          date_ident_projet: projet.date_ident_projet,
          projet_signale: projet.projet_signale,
          charte_accueil: projet.charte_accueil,
          service_id: projet.service_id,
          referent_ddt: projet.referent_ddt
        };
      }

      case 'porteurs': {
        const porteurs = await db.ProjetPorteur.findAll({
          where: { id_projet: idProjet },
          ...options
        });
        return porteurs.map(p => p.toJSON());
      }

      case 'suivis': {
        const suivis = await db.ProjetSuivi.findAll({
          where: { id_projet: idProjet },
          include: [{
            model: db.User,
            as: 'auteur',
            attributes: ['id_user', 'username', 'prenom', 'nom']
          }],
          order: [['created_at', 'DESC']],
          ...options
        });
        return suivis.map(s => s.toJSON());
      }

      case 'thematiques': {
        const thematiques = await db.ProjetInThematique.findAll({
          where: { id_projet: idProjet },
          include: [
            {
              model: db.Thematique,
              attributes: ['id_thematique', 'libelle', 'modele']
            }
          ],
          ...options
        });
        return thematiques.map(t => t.toJSON());
      }

      case 'documents': {
        const documents = await db.Document.findAll({
          where: { id_projet: idProjet },
          ...options
        });
        return documents.map(d => d.toJSON());
      }

      case 'geometrie': {
        const geometry = await db.Geometry.findOne({
          where: { id_projet: idProjet },
          ...options
        });
        return geometry ? geometry.toJSON() : {};
      }

      default:
        throw new Error(`Section inconnue: ${sectionName}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des données de ${sectionName}:`, error);
    return null;
  }
}

/**
 * Sauvegarde automatiquement la version actuelle d'une section avant modification
 * @param {Object} params
 * @param {string} params.idProjet - ID du projet
 * @param {number} params.userId - ID de l'utilisateur effectuant la modification
 * @param {string} params.sectionName - Nom de la section
 * @param {string} params.description - Description optionnelle de la modification
 * @param {Object} params.transaction - Transaction Sequelize (optionnel)
 * @returns {Promise<Object|null>} La version créée ou null en cas d'erreur
 */
async function saveCurrentSectionVersion({
  idProjet,
  userId,
  sectionName,
  description = null,
  transaction = null
}) {
  try {
    if (!userId) {
      console.warn('⚠️  [VERSION] Pas d\'userId fourni, impossible de sauvegarder la version');
      return null;
    }

    // Récupérer les données actuelles de la section
    const sectionData = await getCurrentSectionData(idProjet, sectionName, transaction);

    if (!sectionData) {
      console.warn(`⚠️  [VERSION] Pas de données à sauvegarder pour ${sectionName} du projet ${idProjet}`);
      return null;
    }

    // Vérifier si les données sont vides (tableau vide ou objet vide)
    const isEmpty = Array.isArray(sectionData)
      ? sectionData.length === 0
      : Object.keys(sectionData).length === 0;

    if (isEmpty) {
      console.log(`ℹ️  [VERSION] Section ${sectionName} vide, pas de version créée`);
      return null;
    }

    // Créer la version
    const version = await createSectionVersion({
      idProjet,
      userId,
      sectionName,
      sectionData,
      description: description || `Modification de ${sectionName}`,
      transaction
    });

    return version;
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la version de section:', error);
    // Ne pas bloquer l'opération principale si la sauvegarde échoue
    return null;
  }
}

/**
 * Middleware pour extraire l'userId d'une requête Next.js
 * Essaie plusieurs sources : header, body, query params
 * @param {Object} request - Requête Next.js
 * @param {Object} body - Body déjà parsé (optionnel)
 * @returns {number|null} L'userId ou null
 */
function extractUserId(request, body = null) {
  // 1. Chercher dans les headers (si authentification JWT)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // TODO: Décoder le JWT pour extraire l'userId
      // Pour l'instant, on suppose que l'userId est dans le header x-user-id
      const userIdHeader = request.headers.get('x-user-id');
      if (userIdHeader) {
        return parseInt(userIdHeader, 10);
      }
    } catch (error) {
      console.warn('⚠️  Impossible d\'extraire userId du header auth');
    }
  }

  // 2. Chercher dans le body
  if (body && body.userId) {
    return body.userId;
  }

  // 3. Chercher dans l'URL (query params)
  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    if (userIdParam) {
      return parseInt(userIdParam, 10);
    }
  } catch (error) {
    // Ignore
  }

  return null;
}

/**
 * Récupère l'ID du projet depuis différentes sources
 * @param {Object} params
 * @param {Object} params.pathParams - Paramètres de route ([id])
 * @param {Object} params.body - Body de la requête
 * @param {Object} params.record - Enregistrement actuel (pour UPDATE/DELETE)
 * @returns {string|null} L'ID du projet ou null
 */
async function extractProjetId({ pathParams = null, body = null, record = null }) {
  // 1. ID direct dans le body
  if (body && (body.idProjet || body.id_projet || body.projetId)) {
    return body.idProjet || body.id_projet || body.projetId;
  }

  // 2. Si c'est un enregistrement d'un modèle lié au projet
  if (record) {
    if (record.id_projet) {
      return record.id_projet;
    }
    // Pour les porteurs, suivis, etc.
    if (record.projet_id) {
      return record.projet_id;
    }
  }

  return null;
}

module.exports = {
  getCurrentSectionData,
  saveCurrentSectionVersion,
  extractUserId,
  extractProjetId
};

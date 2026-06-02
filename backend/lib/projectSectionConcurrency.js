const db = require('../models');
const { getCurrentSectionData, saveCurrentSectionVersion } = require('./sectionVersionHelper');

const SECTION_NAMES = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
const LOCK_TTL_MS = 10 * 60 * 1000;

function isValidSectionName(sectionName) {
  return SECTION_NAMES.includes(sectionName);
}

function getLockExpiryDate() {
  return new Date(Date.now() + LOCK_TTL_MS);
}

function formatUserDisplay(user) {
  if (!user) return null;
  return {
    id: user.id_user,
    username: user.username,
    nom_complet: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username
  };
}

async function ensureSectionState(idProjet, sectionName, transaction = null) {
  const options = transaction ? { transaction } : {};

  let state = await db.ProjectSectionState.findOne({
    where: { id_projet: idProjet, section_name: sectionName },
    ...options
  });

  if (!state) {
    state = await db.ProjectSectionState.create({
      id_projet: idProjet,
      section_name: sectionName,
      revision: 0,
      updated_at: new Date(),
      updated_by: null
    }, options);
  }

  return state;
}

async function getSectionMetadata(idProjet, sectionName) {
  const state = await ensureSectionState(idProjet, sectionName);
  const lock = await db.ProjectSectionLock.findOne({
    where: { id_projet: idProjet, section_name: sectionName },
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id_user', 'username', 'prenom', 'nom']
    }]
  });

  const now = new Date();
  const activeLock = lock && new Date(lock.expires_at) > now ? lock : null;

  if (lock && !activeLock) {
    await lock.destroy();
  }

  return {
    section_name: sectionName,
    revision: state.revision,
    updated_at: state.updated_at,
    updated_by: state.updated_by,
    lock: activeLock ? {
      user: formatUserDisplay(activeLock.user),
      acquired_at: activeLock.acquired_at,
      expires_at: activeLock.expires_at
    } : null
  };
}

async function getAllSectionsMetadata(idProjet) {
  const metadata = await Promise.all(
    SECTION_NAMES.map((sectionName) => getSectionMetadata(idProjet, sectionName))
  );

  return metadata.reduce((acc, item) => {
    acc[item.section_name] = item;
    return acc;
  }, {});
}

async function acquireSectionLock({ idProjet, sectionName, userId }) {
  const now = new Date();
  const expiresAt = getLockExpiryDate();

  const existingLock = await db.ProjectSectionLock.findOne({
    where: { id_projet: idProjet, section_name: sectionName },
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id_user', 'username', 'prenom', 'nom']
    }]
  });

  if (existingLock) {
    const isExpired = new Date(existingLock.expires_at) <= now;
    const isOwnedByRequester = existingLock.user_id === userId;

    if (!isExpired && !isOwnedByRequester) {
      const err = new Error('Section verrouillée');
      err.code = 'LOCKED';
      err.lock = {
        user: formatUserDisplay(existingLock.user),
        acquired_at: existingLock.acquired_at,
        expires_at: existingLock.expires_at
      };
      throw err;
    }

    await existingLock.update({
      user_id: userId,
      acquired_at: now,
      expires_at: expiresAt
    });
  } else {
    await db.ProjectSectionLock.create({
      id_projet: idProjet,
      section_name: sectionName,
      user_id: userId,
      acquired_at: now,
      expires_at: expiresAt
    });
  }

  return getSectionMetadata(idProjet, sectionName);
}

async function releaseSectionLock({ idProjet, sectionName, userId }) {
  const lock = await db.ProjectSectionLock.findOne({
    where: { id_projet: idProjet, section_name: sectionName, user_id: userId }
  });

  if (lock) {
    await lock.destroy();
  }

  return getSectionMetadata(idProjet, sectionName);
}

async function assertSectionLockOwned({ idProjet, sectionName, userId }) {
  const lock = await db.ProjectSectionLock.findOne({
    where: { id_projet: idProjet, section_name: sectionName },
    include: [{
      model: db.User,
      as: 'user',
      attributes: ['id_user', 'username', 'prenom', 'nom']
    }]
  });

  if (!lock || lock.user_id !== userId || new Date(lock.expires_at) <= new Date()) {
    const err = new Error('Verrou absent ou expiré');
    err.code = 'LOCK_REQUIRED';
    err.lock = lock ? {
      user: formatUserDisplay(lock.user),
      acquired_at: lock.acquired_at,
      expires_at: lock.expires_at
    } : null;
    throw err;
  }

  return lock;
}

async function assertSectionRevision({ idProjet, sectionName, expectedRevision, transaction = null }) {
  const state = await ensureSectionState(idProjet, sectionName, transaction);

  if (Number(expectedRevision) !== Number(state.revision)) {
    const err = new Error('Conflit de version');
    err.code = 'REVISION_CONFLICT';
    err.currentRevision = state.revision;
    err.updatedAt = state.updated_at;
    err.updatedBy = state.updated_by;
    throw err;
  }

  return state;
}

async function bumpSectionRevision({ idProjet, sectionName, userId, transaction = null }) {
  const state = await ensureSectionState(idProjet, sectionName, transaction);
  const nextRevision = Number(state.revision || 0) + 1;

  await state.update({
    revision: nextRevision,
    updated_at: new Date(),
    updated_by: userId
  }, transaction ? { transaction } : undefined);

  return state;
}

async function touchProjectUpdatedFields({ idProjet, userId, transaction = null }) {
  const projet = await db.Projet.findByPk(idProjet, transaction ? { transaction } : undefined);
  if (!projet) {
    throw new Error('Projet non trouvé');
  }

  await projet.update({
    updated_at: new Date(),
    updated_by: userId
  }, transaction ? { transaction } : undefined);
}

async function saveSectionData({ idProjet, sectionName, data, userId, transaction = null }) {
  switch (sectionName) {
    case 'projet_info': {
      const projet = await db.Projet.findByPk(idProjet, { transaction });
      if (!projet) throw new Error('Projet non trouvé');

      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      await projet.update({
        nom_projet: data.nom_projet ?? projet.nom_projet,
        description: data.description ?? projet.description,
        statut_projet_id: data.statut_projet_id ?? projet.statut_projet_id,
        date_ident_projet: data.date_ident_projet ?? projet.date_ident_projet
      }, { transaction });
      break;
    }

    case 'porteurs': {
      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      await db.ProjetPorteur.destroy({ where: { id_projet: idProjet }, transaction });
      const rows = Array.isArray(data) ? data.filter((item) => item.nom_structure) : [];
      if (rows.length > 0) {
        await db.ProjetPorteur.bulkCreate(rows.map((item) => ({
          id_projet: idProjet,
          type_porteur_id: item.type_porteur_id || null,
          autre_type_porteur: item.autre_type_porteur || null,
          nom_structure: item.nom_structure,
          referent_nom: item.referent_nom || null,
          referent_fonction: item.referent_fonction || null,
          referent_email: item.referent_email || null,
          referent_tel: item.referent_tel || null
        })), { transaction });
      }
      break;
    }

    case 'suivis': {
      const projet = await db.Projet.findByPk(idProjet, { transaction });
      if (!projet) throw new Error('Projet non trouvé');

      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      await projet.update({
        projet_signale: !!data.enjeuPrioritaire,
        charte_accueil: !!data.charteAccueil,
        service_id: data.service_id || null,
        referent_ddt: data.contactDDT || null
      }, { transaction });

      const suivisExistants = await db.ProjetSuivi.findAll({
        where: { id_projet: idProjet },
        transaction
      });
      const suivisMap = new Map();
      suivisExistants.forEach((s) => {
        suivisMap.set(String(s.suivi || '').trim().toLowerCase(), {
          created_at: s.created_at,
          created_by: s.created_by
        });
      });

      await db.ProjetSuivi.destroy({ where: { id_projet: idProjet }, transaction });
      const historique = Array.isArray(data.historique) ? data.historique : [];
      if (historique.length > 0) {
        await db.ProjetSuivi.bulkCreate(historique
          .filter((item) => item.description)
          .map((item) => {
            const key = String(item.description || '').trim().toLowerCase();
            const existing = suivisMap.get(key);
            return {
              id_projet: idProjet,
              suivi: item.description,
              created_by: existing?.created_by || userId,
              created_at: existing?.created_at || item.dateTime || new Date()
            };
          }), { transaction });
      }
      break;
    }

    case 'documents': {
      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      await db.Document.destroy({ where: { id_projet: idProjet }, transaction });
      const rows = Array.isArray(data) ? data.filter((doc) => doc.lien_local || doc.lien_web) : [];
      if (rows.length > 0) {
        await db.Document.bulkCreate(rows.map((doc) => ({
          id_projet: idProjet,
          lien_local: doc.lien_local || null,
          lien_web: doc.lien_web || null
        })), { transaction });
      }
      break;
    }

    case 'thematiques': {
      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      const { getModelByValue } = require('./config');
      const getSequelizeModelName = (tableName) => {
        const modelKeys = Object.keys(db).filter((k) =>
          !['sequelize', 'Sequelize', 'DataTypes'].includes(k)
        );

        for (const modelKey of modelKeys) {
          const model = db[modelKey];
          if (model && model.tableName === tableName) {
            return modelKey;
          }
        }

        const pascalCase = tableName
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');

        if (db[pascalCase]) {
          return pascalCase;
        }

        const pascalCaseWithUnderscore = tableName
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join('_');

        return pascalCaseWithUnderscore;
      };

      const oldAssociations = await db.ProjetInThematique.findAll({
        where: { id_projet: idProjet },
        include: [{ model: db.Thematique, as: 'thematique', attributes: ['id_thematique'] }],
        transaction
      });

      for (const assoc of oldAssociations) {
        const thematique = assoc.thematique;
        if (!thematique) continue;

        const allModels = Object.keys(db).filter((k) =>
          !['sequelize', 'Sequelize', 'DataTypes'].includes(k) &&
          db[k].tableName &&
          db[k].rawAttributes &&
          db[k].rawAttributes.id_project &&
          db[k].rawAttributes.id_thematique
        );

        for (const modelKey of allModels) {
          await db[modelKey].destroy({
            where: { id_project: idProjet, id_thematique: thematique.id_thematique },
            transaction
          }).catch(() => undefined);
        }
      }

      await db.ProjetInThematique.destroy({ where: { id_projet: idProjet }, transaction });

      const thematiques = Array.isArray(data) ? data.filter((item) => item.id_thematique) : [];
      const thematiqueRecordsMap = new Map();
      thematiques.forEach((them) => {
        if (!thematiqueRecordsMap.has(them.id_thematique)) {
          thematiqueRecordsMap.set(them.id_thematique, {
            id_projet: idProjet,
            id_thematique: them.id_thematique,
            ajoute_par: userId,
            date_ajout: new Date()
          });
        }
      });

      if (thematiqueRecordsMap.size > 0) {
        await db.ProjetInThematique.bulkCreate(Array.from(thematiqueRecordsMap.values()), {
          transaction,
          validate: true
        });
      }

      for (const them of thematiques) {
        if (!them.modele || !them.fields || Object.keys(them.fields).length === 0) continue;

        const modeleConfig = getModelByValue(them.modele);
        if (!modeleConfig) continue;

        const targetModel = db[getSequelizeModelName(modeleConfig.tableName)];

        if (!targetModel) continue;

        const dataToInsert = {
          id_project: idProjet,
          id_thematique: them.id_thematique,
          ...them.fields,
          created_at: new Date(),
          created_by: userId,
          updated_at: null,
          updated_by: null
        };

        delete dataToInsert[modeleConfig.primaryKey];
        await targetModel.create(dataToInsert, { transaction });
      }
      break;
    }

    case 'geometrie': {
      await saveCurrentSectionVersion({
        idProjet,
        userId,
        sectionName,
        description: 'Version automatique avant modification de la section',
        transaction
      });

      await db.ProjetGeometry.destroy({ where: { id_projet: idProjet }, transaction });

      if (data && data.geom && data.geom_type) {
        const geometry = await db.ProjetGeometry.create({
          id_projet: idProjet,
          geom: data.geom,
          geom_type: data.geom_type
        }, { transaction });

        const { calculateSpatialData } = require('../utils/spatial');
        const spatialData = await calculateSpatialData(geometry, transaction);

        await geometry.update({
          area_m2: spatialData.area_m2,
          length_m: spatialData.length_m,
          communes_traversees: spatialData.communes_traversees,
          codes_insee: spatialData.codes_insee,
          epci: spatialData.epci,
          arrondissements: spatialData.arrondissements,
          deputes: spatialData.deputes,
          maires: spatialData.maires
        }, { transaction });

        await db.ProjetGeometryCommune.destroy({ where: { id_projet: idProjet }, transaction });
        const communeRows = (spatialData.intersectedCommunes || []).map((commune) => ({
          id_geom: geometry.id_geom,
          id_projet: idProjet,
          id_commune: commune.id
        }));
        if (communeRows.length > 0) {
          await db.ProjetGeometryCommune.bulkCreate(communeRows, {
            transaction,
            ignoreDuplicates: true
          });
        }
      }
      break;
    }

    default:
      throw new Error(`Section inconnue: ${sectionName}`);
  }

  await touchProjectUpdatedFields({ idProjet, userId, transaction });
  await bumpSectionRevision({ idProjet, sectionName, userId, transaction });

  const currentData = await getCurrentSectionData(idProjet, sectionName, transaction);
  return currentData;
}

module.exports = {
  SECTION_NAMES,
  LOCK_TTL_MS,
  isValidSectionName,
  ensureSectionState,
  getSectionMetadata,
  getAllSectionsMetadata,
  acquireSectionLock,
  releaseSectionLock,
  assertSectionLockOwned,
  assertSectionRevision,
  bumpSectionRevision,
  saveSectionData
};

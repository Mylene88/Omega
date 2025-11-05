// backend/lib/config/index.js

const modeleEnvironnement = require('./environnement/modeleEnv');
const modeleRisques = require('./risques/modeleRisques');
const modeleAutres = require('./autres/modeleAutres');
const modeleUrbanisme = require('./urbanisme/modeleUrba');
const modeleEnr = require('./enr/modeleEnr');

// Centralisation des modèles
const thematiqueModeles = {
    'Urbanisme': modeleUrbanisme,
    'Environnement': modeleEnvironnement,
    'Risques': modeleRisques,
    'Autres': modeleAutres,
    'EnR': modeleEnr
};

function generateModeleOptions() {
  const options = [];

  for (const thematique of Object.keys(thematiqueModeles)) {
    for (const modele of Object.keys(thematiqueModeles[thematique])) {
      const config = thematiqueModeles[thematique][modele];
      options.push({
        value: `${thematique}-${modele}`,
        label: `${thematique} - ${config.displayName || modele.replace(/_/g, ' ')}`,
        thematique,
        modele,
        config
      });
    }
  }

  options.sort((a, b) =>
    a.thematique === b.thematique
      ? a.label.localeCompare(b.label)
      : a.thematique.localeCompare(b.thematique)
  );

  return options;
}

function getModelsByThematique(thematique) {
  return thematiqueModeles[thematique] || {};
}

function getAllEnumTables() {
  const set = new Set();
  for (const thematique of Object.keys(thematiqueModeles)) {
    for (const config of Object.values(thematiqueModeles[thematique])) {
      config.fields?.forEach(field => {
        if (field.enumTable) {
          set.add(field.enumTable);
        }
      });
    }
  }
  return set;
}

function getModeleConfig(thematique, modele) {
  return thematiqueModeles[thematique]?.[modele] || null;
}

function getModelByValue(value) {
  if (!value || !value.includes('-')) return null;

  const parts = value.split('-');
  if (parts.length < 2) return null;

  const thematique = parts[0];
  const modele = parts.slice(1).join('-');

  return getModeleConfig(thematique, modele);
}

function getAllThematiques() {
  return Object.keys(thematiqueModeles);
}

function validateModelConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.tableName) errors.push('tableName est requis');
  if (!config.schema) errors.push('schema est requis');
  if (!config.primaryKey) errors.push('primaryKey est requis');

  if (!Array.isArray(config.fields)) {
    errors.push('fields doit être un tableau');
  } else {
    config.fields.forEach((field, index) => {
      if (!field.name) errors.push(`fields[${index}]: name est requis`);
      if (!field.label) warnings.push(`fields[${index}]: label est recommandé`);
      if (!field.type) errors.push(`fields[${index}]: type est requis`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Fonction pour retrouver la catégorie d'une thématique
function getCategorieByModele(modele) {
  for (const [categorie, modeles] of Object.entries(thematiqueModeles)) {
    if (modeles[modele]) {
      return categorie;
    }
  }
  return null;
}

// Fonction pour obtenir le libellé complet formaté
function getFormattedThematiqueLabel(modele) {
  const categorie = getCategorieByModele(modele);
  if (!categorie) return modele;

  const config = thematiqueModeles[categorie][modele];
  const displayName = config?.displayName || modele.replace(/_/g, ' ').charAt(0).toUpperCase() + modele.slice(1).replace(/_/g, ' ');

  return `${categorie} - ${displayName}`;
}

module.exports = {
  thematiqueModeles,
  generateModeleOptions,
  getAllEnumTables,
  validateModelConfig,
  getModelsByThematique,
  getAllThematiques,
  getModeleConfig,
  getModelByValue,
  getCategorieByModele,
  getFormattedThematiqueLabel
};

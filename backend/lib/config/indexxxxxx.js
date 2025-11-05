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

// Export ESM
export {
  thematiqueModeles,
  generateModeleOptions,
  getAllEnumTables,
  validateModelConfig,
  getModelsByThematique,
  getAllThematiques,
  getModeleConfig,
  getModelByValue
};
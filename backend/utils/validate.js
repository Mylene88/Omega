// utils/validate.js

// Liste des types de géométrie valides pour le projet
const VALID_GEOMETRY_TYPES = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon'
];

/**
 * Valide un ID numérique
 * @param {string|number} id - ID à valider
 * @returns {boolean} True si valide
 */
function validateId(id) {
  return id && !isNaN(parseInt(id)) && parseInt(id) > 0;
}

/**
 * Valide les données d'un projet
 * @param {Object} data - Données du projet
 * @returns {Object} { isValid: boolean, errors: string[], code: string|null }
 */
function validateProjetData(data) {
  const errors = [];
  
  if (!data.nom_projet?.trim()) {
    errors.push('Le nom du projet est requis');
  }
  
  if (!validateId(data.id_projet)) {
    errors.push('ID projet invalide');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    code: errors.length ? 'VALIDATION_ERROR' : null
  };
}

/**
 * Valide les données de géométrie
 * @param {Object} data - Données de géométrie
 * @returns {Object} { isValid: boolean, errors: string[], code: string|null }
 */
function validateGeometryData(data) {
  const errors = [];

  // Vérification de la présence de geom
  if (!data.geom) {
    errors.push('La géométrie est requise');
  } else {
    // Vérification du format GeoJSON
    try {
      const parsed = typeof data.geom === 'string' ? JSON.parse(data.geom) : data.geom;
      if (!parsed.type || !parsed.coordinates) {
        errors.push('Géométrie invalide (GeoJSON mal formé)');
      }
    } catch {
      errors.push('La géométrie doit être un JSON valide');
    }
  }

  // Vérification du type
  if (!data.geom_type) {
    errors.push('Le type de géométrie est requis');
  } else if (!VALID_GEOMETRY_TYPES.includes(data.geom_type)) {
    errors.push(`Type de géométrie invalide. Types acceptés: ${VALID_GEOMETRY_TYPES.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    code: errors.length ? 'VALIDATION_ERROR' : null
  };
}

module.exports = {
VALID_GEOMETRY_TYPES,
validateId,
validateProjetData,
validateGeometryData
};

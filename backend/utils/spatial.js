// backend/utils/spatial.js

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
//const { GeomCommune } = require('../models/externe');

/**
 * Calcule toutes les données spatiales d'une géométrie de projet
 * @param {Object} geometry - Instance de ProjetGeometry
 * @param {Object} transaction - Transaction Sequelize (optionnel)
 * @returns {Object} Données spatiales calculées
 */
async function calculateSpatialData(geometry, transaction = null) {
    const queryOptions = transaction ? { transaction } : {};
    
    try {
        console.log('🔍 DEBUG - Calcul spatial pour géométrie ID:', geometry.id_geom);
        
        // Récupérer  type, aire, longueur avec SRID
        const geomStats = await sequelize.query(
            `SELECT
                ST_GeometryType(geom) as geom_type,
                ST_Area(ST_Transform(geom, 2154)) as area,
                ST_Length(ST_Transform(geom, 2154)) as length,
                ST_SRID(geom) as srid
             FROM principale.projet_geometry
             WHERE id_geom = :id`,
            {
                replacements: { id: geometry.id_geom },
                type: QueryTypes.SELECT,
                ...queryOptions
            }
        );

        const { geom_type, area, length, srid } = geomStats[0] || {};
        console.log('🔍 DEBUG - Stats géométrie:', { geom_type, area, length, srid });
        
        const area_m2 = (geom_type?.includes('Polygon')) ? area : null;
        const length_m = (geom_type?.includes('LineString')) ? length : null;

        // Trouver toutes les communes intersectées avec transformation de projection
        const intersectedCommunes = await sequelize.query(
            `SELECT gc.id, gc.nom_com, gc.code_insee, gc.nom_epci, gc.arrondisst,
                    gc.maire_prenom, gc.maire_nom, gc.depute_prenom, gc.depute_nom,
                    ST_Area(ST_Intersection(
                        gc.geom, 
                        ST_Transform(pg.geom, ST_SRID(gc.geom))
                    )) as intersection_area
             FROM externe.geom_commune gc
             JOIN principale.projet_geometry pg
             ON ST_Intersects(
                 gc.geom, 
                 ST_Transform(pg.geom, ST_SRID(gc.geom))
             )
             WHERE pg.id_geom = :id
             AND gc.code_dep = '28'
             ORDER BY intersection_area DESC`,
            {
                replacements: { id: geometry.id_geom },
                type: QueryTypes.SELECT,
                ...queryOptions
            }
        );

        console.log('🔍 DEBUG - Communes trouvées:', intersectedCommunes.length);
        console.log('🔍 DEBUG - Première commune:', intersectedCommunes[0]);

        // Extraire et nettoyer les données
        const communes_traversees = intersectedCommunes.map(c => c.nom_com?.trim()).filter(Boolean);
        const codes_insee = [...new Set(intersectedCommunes.map(c => c.code_insee?.trim()).filter(Boolean))];
        const epci = [...new Set(intersectedCommunes.map(c => c.nom_epci?.trim()).filter(Boolean))];
        const arrondissements = [...new Set(intersectedCommunes.map(c => c.arrondisst?.trim()).filter(Boolean))];
        
        const deputes = [...new Set(intersectedCommunes
            .map(c => c.depute_prenom && c.depute_nom ? `${c.depute_prenom} ${c.depute_nom}`.trim() : null)
            .filter(Boolean))];
        
        const maires = [...new Set(intersectedCommunes
            .map(c => c.maire_prenom && c.maire_nom ? `${c.maire_prenom} ${c.maire_nom}`.trim() : null)
            .filter(Boolean))];

        const result = {
            area_m2,
            length_m,
            communes_traversees,
            codes_insee,
            epci,
            arrondissements,
            deputes,
            maires,
            intersectedCommunes: intersectedCommunes
        };

        console.log('✅ Résultat spatial final:', result);
        return result;

    } catch (error) {
        console.error('❌ Erreur lors du calcul spatial:', error);
        throw error;
    }
}

/**
 * Convertit une géométrie GeoJSON en format WKT pour PostGIS
 * @param {Object} geojson - Géométrie GeoJSON
 * @returns {string} Géométrie en format WKT
 */
function geojsonToWKT(geojson) {
    // Fonction utilitaire pour convertir GeoJSON vers WKT si nécessaire
    // Implémentation selon vos besoins
}

/**
 * Valide qu'une géométrie est correcte
 * @param {Object} geom - Géométrie à valider
 * @param {string} geom_type - Type de géométrie attendu
 * @returns {boolean} True si valide
 */
function validateGeometry(geom, geom_type) {
    if (!geom || !geom_type) return false;
    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    return validTypes.includes(geom_type);
}

module.exports = {
calculateSpatialData,
validateGeometry,
geojsonToWKT
}

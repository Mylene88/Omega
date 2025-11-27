//backend/app/api/projet-geometry/[id]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { calculateSpatialData } from '@/backend/utils/spatial';
import { validateId, validateGeometryData } from '@/backend/utils/validate';
import { successResponse, errorResponse, validationErrorResponse } from '@/backend/utils/response';
import { withTransaction, createCommuneLiaisons } from '@/backend/utils/database';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

// Extraire les modèles et sequelize du module db
const {
  ProjetGeometry,
  ProjetGeometryCommune,
  Projet,
  StatutProjetEnum,
  DdtServiceEnum,
  GeomCommune,
  sequelize,
  QueryTypes
} = db;

// Constantes géographiques pour Eure-et-Loir
const EURE_ET_LOIR_CENTER = {
  latitude: 48.5525242,
  longitude: 1.1989814
};

const EURE_ET_LOIR_BOUNDARY = {
  "type": "Polygon",
  "coordinates": [
    [
      // Points approximatifs des limites d'Eure-et-Loir
      [0.45, 48.18], // Ouest
      [1.99, 48.16], // Est
      [1.50, 48.95], // Nord
      [1.22, 47.95], // Sud
      [0.45, 48.18]  // Fermeture
    ]
  ]
};

// Fonction de validation géographique intégrée
async function isWithinEureEtLoir(geom, transaction = null) {
  const queryOptions = transaction ? { transaction } : {};

  try {
    const result = await sequelize.query(
      `SELECT ST_Intersects(
         ST_GeomFromGeoJSON(:geom), 
         ST_GeomFromGeoJSON(:boundary)
       ) as intersects`,
      {
        replacements: {
          geom: JSON.stringify(geom),
          boundary: JSON.stringify(EURE_ET_LOIR_BOUNDARY)
        },
        type: QueryTypes.SELECT,
        ...queryOptions
      }
    );

    return result[0]?.intersects || false;
  } catch (error) {
    console.error('Erreur validation géographique:', error);
    return false;
  }
}

// GET - Récupérer une géométrie spécifique avec tous ses détails
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!validateId(id)) {
      return errorResponse('ID invalide', 400);
    }

    const geometry = await ProjetGeometry.findByPk(id, {
      include: [
        {
          model: Projet,
          attributes: [
            'id_projet', 'nom_projet', 'description', 'date_ident_projet',
            'projet_signale', 'charte_accueil', 'referent_ddt'
          ],
          include: [
            {
              model: StatutProjetEnum,
              as: 'statut_projet_enum',
              attributes: ['id_statut', 'libelle'],
              required: false
            },
            {
              model: DdtServiceEnum,
              as: 'ddt_service_enum',
              attributes: ['id_service', 'libelle_service'],
              required: false
            }
          ]
        },
        {
          model: ProjetGeometryCommune,
          as: 'projet_geometry_communes',
          include: [
            {
              model: GeomCommune,
              where: { code_dep: '28' }, // Filtrer seulement Eure-et-Loir
              attributes: [
                'id', 'nom_com', 'code_dep', 'code_insee', 'canton',
                'arrondisst', 'popul', 'code_epci', 'nom_epci',
                'maire_prenom', 'maire_nom', 'num_arrond',
                'depute_prenom', 'depute_nom'
              ],
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (!geometry) {
      return errorResponse('Géométrie non trouvée', 404);
    }

    // Vérifier si la géométrie est bien dans Eure-et-Loir
    const isInDepartment = await isWithinEureEtLoir(geometry.geom);

    const responseData = geometry.toJSON();

    // Ajouter des informations formatées
    if (responseData.area_m2) {
      responseData.area_formatted = `${(responseData.area_m2 / 10000).toFixed(2)} ha`;
    }
    if (responseData.length_m) {
      responseData.length_formatted = `${(responseData.length_m / 1000).toFixed(2)} km`;
    }

    // Ajouter les informations géographiques
    responseData.geographic_info = {
      department: 'Eure-et-Loir',
      department_code: '28',
      center: EURE_ET_LOIR_CENTER,
      is_within_department: isInDepartment
    };

    // Statistiques
    responseData.stats = {
      communes_count: responseData.communes_traversees?.length || 0,
      codes_insee_count: responseData.codes_insee?.length || 0,
      epci_count: responseData.epci?.length || 0,
      deputes_count: responseData.deputes?.length || 0,
      maires_count: responseData.maires?.length || 0
    };

    return successResponse(responseData);

  } catch (error) {
    console.error('Erreur GET géométrie:', error);
    return errorResponse(
      'Erreur lors de la récupération de la géométrie',
      500,
      error.message
    );
  }
}

// PATCH - Modifier partiellement une géométrie
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const updates = await request.json();
    const userId = extractUserId(request, updates);

    console.log('🔄 PATCH géométrie:', {
      geometryId: id,
      updateFields: Object.keys(updates),
      hasNewGeometry: !!updates.geom
    })

    if (!validateId(id)) {
      return errorResponse('ID invalide', 400);
    }

    // Validation des données de géométrie si présentes
    if (updates.geom || updates.geom_type) {
      const geometryValidation = validateGeometryData(updates);
      if (!geometryValidation.isValid) {
        return validationErrorResponse(geometryValidation.errors);
      }

      // Validation géographique si nouvelle géométrie
      if (updates.geom) {
        const isInDepartment = await isWithinEureEtLoir(updates.geom);
        if (!isInDepartment) {
          return errorResponse(
            'La géométrie doit être située dans le département d\'Eure-et-Loir',
            400,
            'Coordonnées hors limites départementales'
          );
        }
      }
    }

    const result = await withTransaction(async (transaction) => {
      const geometry = await ProjetGeometry.findByPk(id, { transaction });

      if (!geometry) {
        throw new Error('Géométrie non trouvée');
      }

      // 📸 Sauvegarder la version actuelle avant modification
      if (userId && geometry.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: geometry.id_projet,
          userId,
          sectionName: 'geometrie',
          description: 'Modification de la géométrie (PATCH)',
          transaction
        });
      }

      // Mise à jour des champs fournis
      await geometry.update(updates, { transaction });

      // Recalculer les données spatiales si la géométrie a changé
      if (updates.geom || updates.geom_type) {
        // Supprimer les anciennes liaisons communes
        await ProjetGeometryCommune.destroy({
          where: { id_geom: id },
          transaction
        });

        // Calculer nouvelles données spatiales
        const spatialData = await calculateSpatialData(geometry, transaction);

        // Mettre à jour avec les données calculées
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

        // Recréer les liaisons avec les communes d'Eure-et-Loir
        const eureEtLoirCommunes = spatialData.intersectedCommunes.filter(
          commune => commune.code_dep === '28'
        );

        await createCommuneLiaisons(
          geometry.id_geom,
          geometry.id_projet,
          eureEtLoirCommunes,
          transaction
        );
      }

      return geometry;
    });

    // Récupérer la géométrie mise à jour avec associations
    const updatedGeometry = await ProjetGeometry.findByPk(id, {
      include: [
        {
          model: Projet,
          attributes: ['id_projet', 'nom_projet', 'description']
        },
        {
          model: ProjetGeometryCommune,
          include: [
            {
              model: GeomCommune,
              where: { code_dep: '28' },
              attributes: [
                'id', 'nom_com', 'code_dep', 'code_insee', 'canton',
                'arrondisst', 'popul', 'code_epci', 'nom_epci',
                'maire_prenom', 'maire_nom', 'num_arrond',
                'depute_prenom', 'depute_nom'
              ],
              required: false
            }
          ],
          required: false
        }
      ]
    });

    const responseData = updatedGeometry.toJSON();

    // Formatage des données
    if (responseData.area_m2) {
      responseData.area_formatted = `${(responseData.area_m2 / 10000).toFixed(2)} ha`;
    }
    if (responseData.length_m) {
      responseData.length_formatted = `${(responseData.length_m / 1000).toFixed(2)} km`;
    }

    responseData.geographic_info = {
      department: 'Eure-et-Loir',
      department_code: '28',
      updated_fields: Object.keys(updates)
    };

    return successResponse(
      responseData,
      'Géométrie mise à jour avec succès'
    );

  } catch (error) {
    console.error('Erreur PATCH géométrie:', error);

    if (error.message === 'Géométrie non trouvée') {
      return errorResponse('Géométrie non trouvée', 404);
    }

    return errorResponse(
      'Erreur lors de la mise à jour de la géométrie',
      500,
      error.message
    );
  }
}

// PUT - Remplacement complet d'une géométrie
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const userId = extractUserId(request, data);

    if (!validateId(id)) {
      return errorResponse('ID invalide', 400);
    }

    // Validation complète pour PUT
    if (!data.geom || !data.geom_type) {
      return errorResponse(
        'La géométrie et le type de géométrie sont requis pour un remplacement complet',
        400
      );
    }

    const geometryValidation = validateGeometryData(data);
    if (!geometryValidation.isValid) {
      return validationErrorResponse(geometryValidation.errors);
    }

    // Validation géographique obligatoire
    const isInDepartment = await isWithinEureEtLoir(data.geom);
    if (!isInDepartment) {
      return errorResponse(
        'La géométrie doit être située dans le département d\'Eure-et-Loir',
        400,
        'Coordonnées hors limites départementales'
      );
    }

    const result = await withTransaction(async (transaction) => {
      const geometry = await ProjetGeometry.findByPk(id, { transaction });

      if (!geometry) {
        throw new Error('Géométrie non trouvée');
      }

      // 📸 Sauvegarder la version actuelle avant remplacement
      if (userId && geometry.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: geometry.id_projet,
          userId,
          sectionName: 'geometrie',
          description: 'Remplacement complet de la géométrie (PUT)',
          transaction
        });
      }

      // Supprimer toutes les anciennes liaisons communes
      await ProjetGeometryCommune.destroy({
        where: { id_geom: id },
        transaction
      });

      // Remplacer complètement la géométrie
      await geometry.update({
        geom: data.geom,
        geom_type: data.geom_type,
        // Réinitialiser les champs calculés
        area_m2: null,
        length_m: null,
        communes_traversees: [],
        codes_insee: [],
        epci: [],
        arrondissements: [],
        deputes: [],
        maires: []
      }, { transaction });

      // Recalculer toutes les données spatiales
      const spatialData = await calculateSpatialData(geometry, transaction);

      // Mettre à jour avec les nouvelles données calculées
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

      // Créer les nouvelles liaisons avec les communes d'Eure-et-Loir
      const eureEtLoirCommunes = spatialData.intersectedCommunes.filter(
        commune => commune.code_dep === '28'
      );

      await createCommuneLiaisons(
        geometry.id_geom,
        geometry.id_projet,
        eureEtLoirCommunes,
        transaction
      );

      return geometry;
    });

    // Récupérer la géométrie remplacée avec associations
    const replacedGeometry = await ProjetGeometry.findByPk(id, {
      include: [
        {
          model: Projet,
          attributes: ['id_projet', 'nom_projet', 'description']
        },
        {
          model: ProjetGeometryCommune,
          include: [
            {
              model: GeomCommune,
              where: { code_dep: '28' },
              attributes: [
                'id', 'nom_com', 'code_dep', 'code_insee', 'canton',
                'arrondisst', 'popul', 'code_epci', 'nom_epci',
                'maire_prenom', 'maire_nom', 'num_arrond',
                'depute_prenom', 'depute_nom'
              ],
              required: false
            }
          ],
          required: false
        }
      ]
    });

    const responseData = replacedGeometry.toJSON();

    // Formatage des données
    if (responseData.area_m2) {
      responseData.area_formatted = `${(responseData.area_m2 / 10000).toFixed(2)} ha`;
    }
    if (responseData.length_m) {
      responseData.length_formatted = `${(responseData.length_m / 1000).toFixed(2)} km`;
    }

    responseData.geographic_info = {
      department: 'Eure-et-Loir',
      department_code: '28',
      operation: 'complete_replacement'
    };

    responseData.stats = {
      communes_count: responseData.communes_traversees?.length || 0,
      codes_insee_count: responseData.codes_insee?.length || 0,
      epci_count: responseData.epci?.length || 0,
      deputes_count: responseData.deputes?.length || 0,
      maires_count: responseData.maires?.length || 0
    };

    return successResponse(
      responseData,
      'Géométrie remplacée avec succès'
    );

  } catch (error) {
    console.error('Erreur PUT géométrie:', error);

    if (error.message === 'Géométrie non trouvée') {
      return errorResponse('Géométrie non trouvée', 404);
    }

    return errorResponse(
      'Erreur lors du remplacement de la géométrie',
      500,
      error.message
    );
  }
}

// DELETE - Supprimer une géométrie
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get('userId'), 10) || null;

    if (!validateId(id)) {
      return errorResponse('ID invalide', 400);
    }

    const result = await withTransaction(async (transaction) => {
      const geometry = await ProjetGeometry.findByPk(id, {
        transaction,
        include: [{
          model: Projet,
          attributes: ['nom_projet']
        }]
      });

      if (!geometry) {
        throw new Error('Géométrie non trouvée');
      }

      // 📸 Sauvegarder la version actuelle avant suppression
      if (userId && geometry.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: geometry.id_projet,
          userId,
          sectionName: 'geometrie',
          description: 'Suppression de la géométrie',
          transaction
        });
      }

      const projetNom = geometry.projet?.nom_projet || 'Inconnu';
      const geometryData = {
        id_geom: geometry.id_geom,
        projet_nom: projetNom,
        geom_type: geometry.geom_type,
        area_m2: geometry.area_m2,
        length_m: geometry.length_m
      };

      // Supprimer les liaisons avec les communes
      await ProjetGeometryCommune.destroy({
        where: { id_geom: id },
        transaction
      });

      // Supprimer la géométrie
      await geometry.destroy({ transaction });

      return geometryData;
    });

    return successResponse(
      {
        deleted_geometry: result,
        geographic_info: {
          department: 'Eure-et-Loir',
          department_code: '28'
        }
      },
      `Géométrie du projet "${result.projet_nom}" supprimée avec succès`
    );

  } catch (error) {
    console.error('Erreur DELETE géométrie:', error);

    if (error.message === 'Géométrie non trouvée') {
      return errorResponse('Géométrie non trouvée', 404);
    }

    return errorResponse(
      'Erreur lors de la suppression de la géométrie',
      500,
      error.message
    );
  }
}

// OPTIONS - Support CORS pour les requêtes preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    },
  });
}

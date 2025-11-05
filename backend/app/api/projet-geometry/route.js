//backend/app/api/projet-geometry/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { calculateSpatialData } from '@/backend/utils/spatial';
import { validateProjetData, validateGeometryData } from '@/backend/utils/validate';
import { successResponse, errorResponse, validationErrorResponse } from '@/backend/utils/response';
import { withTransaction, createCommuneLiaisons } from '@/backend/utils/database';

const {
  ProjetGeometry,
  ProjetGeometryCommune,
  Projet,
  StatutProjetEnum,
  DdtServiceEnum,
  GeomCommune,
  User,
  ProjetPorteur,
  TypePorteurEnum,
  ProjetSuivi,
  ProjetInThematique,
  Thematique,
  Document,
  sequelize
} = db;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const limit = parseInt(searchParams.get('limit')) || 1000;
    const projetId = searchParams.get('projet_id');

    console.log('📡 GET /api/projet-geometry - Paramètres:', { format, limit, projetId });

    const whereClause = {};
    if (projetId) {
      whereClause.id_projet = projetId;
      console.log('🔍 Filtrage par projet:', projetId);
    }

    const geometries = await ProjetGeometry.findAll({
      where: whereClause,
      include: [
        {
          model: Projet,
          attributes: [
            'id_projet', 'nom_projet', 'description', 'date_ident_projet',
            'projet_signale', 'charte_accueil', 'referent_ddt', 'service_id',
            'statut_projet_id', 'created_at', 'updated_at', 'created_by'
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
            },
            {
              model: ProjetPorteur,
              as: 'porteurs',
              attributes: [
                'id_porteur', 'type_porteur_id', 'nom_structure',
                'autre_type_porteur', 'referent_nom', 'referent_fonction',
                'referent_email', 'referent_tel'
              ],
              include: [
                {
                  model: TypePorteurEnum,
                  as: 'type_porteur_enum',
                  attributes: ['id_type_porteur', 'libelle'],
                  required: false
                }
              ],
              required: false,
              separate: true
            },
            {
              model: ProjetSuivi,
              as: 'suivis',
              attributes: ['id_suivi', 'suivi', 'created_at', 'created_by'],
              include: [
                {
                  model: User,
                  as: 'auteur',
                  attributes: ['id_user', 'username', 'prenom', 'nom'],
                  required: false
                }
              ],
              required: false,
              separate: true,
              limit: 50,
              order: [['created_at', 'DESC']]
            },
            {
              model: ProjetInThematique,
              as: 'projet_in_thematiques',
              attributes: ['id_thematique', 'date_ajout', 'ajoute_par'],
              include: [
                {
                  model: Thematique,
                  attributes: ['id_thematique', 'libelle', 'modele'],
                  required: false
                },
                {
                  model: User,
                  as: 'ajouteParUser',
                  attributes: ['id_user', 'username', 'prenom', 'nom'],
                  required: false
                }
              ],
              required: false,
              separate: true
            },
            {
              model: Document,
              as: 'documents',
              attributes: ['id_document', 'lien_local', 'lien_web'],
              required: false,
              separate: true
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id_user', 'username', 'prenom', 'nom'],
              required: false
            }
          ],
          required: false
        }
      ],
      limit: projetId ? undefined : limit,
      order: [['id_geom', 'DESC']]
    });

    console.log(`✅ ${geometries.length} géométries récupérées`);

    // ✅ FIX: Corrected the syntax error here
    if (projetId && geometries.length === 0) {
      console.warn(`⚠️ Aucune géométrie trouvée pour le projet ${projetId}`);
      return NextResponse.json({
        success: true,
        message: `Aucune géométrie trouvée pour le projet ${projetId}`,
        data: [],  // ✅ FIXED: Added 'data' property
        pagination: {
          total: 0,
          returned: 0,
          filtered_by_projet: true
        }
      }, { status: 200 });
    }

    if (projetId && geometries.length > 0) {
      const firstGeom = geometries[0].toJSON();
      console.log('🔍 Première géométrie:', {
        id_geom: firstGeom.id_geom,
        id_projet: firstGeom.id_projet,
        has_projet: !!firstGeom.projet,
        has_porteurs: !!firstGeom.projet?.porteurs,
        nb_porteurs: firstGeom.projet?.porteurs?.length || 0,
        has_suivis: !!firstGeom.projet?.suivis,
        nb_suivis: firstGeom.projet?.suivis?.length || 0,
        has_thematiques: !!firstGeom.projet?.projet_in_thematiques,
        nb_thematiques: firstGeom.projet?.projet_in_thematiques?.length || 0,
        has_documents: !!firstGeom.projet?.documents,
        nb_documents: firstGeom.projet?.documents?.length || 0
      });
    }


    if (format === 'geojson') {
       const features = geometries
          .filter(geom => geom.geom)
          .map(geom => {
            const geomData = geom.toJSON();
            const projetData = geomData.projet || {};

            const thematiqueCount = projetData.projet_in_thematiques?.length || 0;


            // ✅ RÉCUPÉRER LE STATUT CORRECTEMENT
            const statutLibelle = projetData.statut_projet_enum?.libelle || 'Aucun statut renseigné';

            console.log('📊 Projet:', projetData.nom_projet, '- Statut:', {
              id: projetData.statut_projet_id,
              libelle: statutLibelle
            });

            // ✅ CORRECTION FINALE: Extraire les thématiques au format "Catégorie-Modèle"
            let thematiques = [];

            if (Array.isArray(projetData.projet_in_thematiques)) {
              projetData.projet_in_thematiques.forEach(pit => {
                if (!pit.thematique) return;

                try {
                  // pit.thematique.libelle = "Risques" (catégorie)
                  // pit.thematique.modele = '["Bruit", "ICPE"]' (JSON string)

                  const categorie = pit.thematique.libelle;
                  const modeleString = pit.thematique.modele;

                  if (!modeleString) {
                    console.warn(`⚠️ Modèle vide pour thématique ${categorie}`);
                    return;
                  }

                  // Parser le JSON
                  const modeles = JSON.parse(modeleString);

                  if (!Array.isArray(modeles)) {
                    console.warn(`⚠️ Modèle n'est pas un array pour ${categorie}:`, modeles);
                    return;
                  }

                  // Générer une entrée pour chaque modèle
                  modeles.forEach(modele => {
                    thematiques.push({
                      value: `${categorie}-${modele}`,  // "Risques-Bruit"
                      label: `${categorie} - ${modele}`  // "Risques - Bruit"
                    });
                  });

                } catch (error) {
                  console.error(`❌ Erreur parsing thématique pour projet ${projetData.nom_projet}:`, error);
                }
              });
            }

            // 🔍 LOG pour vérifier (retirer en production)
            if (thematiques.length > 0) {
              console.log(`📋 Projet "${projetData.nom_projet}": ${thematiques.length} thématique(s)`);
              thematiques.forEach(t => {
                console.log(`   - ${t.label} (value: "${t.value}")`);
              });
            }

            return {
              type: 'Feature',
              geometry: geomData.geom,
              properties: {
                // IDs
                id_geom: geomData.id_geom,
                id_projet: geomData.id_projet,

                // Informations du projet
                nom_projet: projetData.nom_projet || 'Sans nom',
                description: projetData.description || '',
                date_ident_projet: projetData.date_ident_projet,
                referent_ddt: projetData.referent_ddt,

                // Statuts
                projet_signale: projetData.projet_signale || false,
                charte_accueil: projetData.charte_accueil || false,

                // ✅ STATUTS - TOUTES LES VARIANTES
                statut_projet_id: projetData.statut_projet_id,
                statut: statutLibelle,
                statut_projet: statutLibelle,
                libelle_statut: statutLibelle,

                //statut: projetData.statut_projet_enum?.libelle || 'Non défini',

                // Service DDT (avec plusieurs clés pour compatibilité)
                service_id: projetData.service_id,
                serviceid: projetData.service_id,
                serviceddtid: projetData.service_id,
                service: projetData.ddt_service_enum?.libelle_service || 'Aucun service renseigné',

                // ✅ THÉMATIQUES - Format "Catégorie-Modèle"
                thematiques: thematiques,
                nombre_thematiques: thematiqueCount,
                thematiques_count: thematiqueCount,

                // ✅ DONNÉES GÉOGRAPHIQUES
                geom_type: geomData.geom_type,
                area_m2: geomData.area_m2,
                length_m: geomData.length_m,
                communes_traversees: geomData.communes_traversees || [],
                codes_insee: geomData.codes_insee || [],
                epci: geomData.epci || [],
                arrondissements: geomData.arrondissements || [],
                deputes: geomData.deputes || [],
                maires: geomData.maires || [],

                // Compteurs
                nb_porteurs: projetData.porteurs?.length || 0,
                nb_suivis: projetData.suivis?.length || 0,
                nb_documents: projetData.documents?.length || 0
              }
            };
          });

      console.log(`✅ ${features.length} features GeoJSON générées`);

      // ✅ LOG d'un exemple complet
      if (features.length > 0) {
        const example = features[0].properties;
        console.log('\n📋 Exemple de feature:', {
          id_projet: example.id_projet,
          nom_projet: example.nom_projet,
          service_id: example.service_id,
          thematiques: example.thematiques,
          nb_communes: example.communes_traversees?.length || 0
        });

        // Vérifier le format des thématiques
        if (example.thematiques.length > 0) {
          console.log('\n✅ Format des thématiques vérifié:');
          console.log('   Premier:', example.thematiques[0]);
          console.log('   Type de value:', typeof example.thematiques[0].value);
          console.log('   Pattern:', example.thematiques[0].value.includes('-') ? 'OK ✅' : 'ERREUR ❌');
        }
      }

      return NextResponse.json({
        type: 'FeatureCollection',
        features: features,
        meta: {
          total: features.length,
          returned: features.length,
          projet_id: projetId || null,
          generated_at: new Date().toISOString()
        }
      });
    }

    const data = geometries.map(g => g.toJSON());

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: data.length,
        returned: data.length,
        filtered_by_projet: !!projetId
      }
    });

  } catch (error) {
    console.error('❌ Erreur GET /api/projet-geometry:', error);
    console.error('❌ Stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    const projetValidation = validateProjetData({
      nom_projet: 'temp',
      id_projet: data.id_projet
    });

    if (!projetValidation.isValid) {
      return validationErrorResponse(projetValidation.errors);
    }

    const geometryValidation = validateGeometryData(data);
    if (!geometryValidation.isValid) {
      return validationErrorResponse(geometryValidation.errors);
    }

    const projet = await Projet.findByPk(data.id_projet, {
      attributes: ['id_projet', 'nom_projet']
    });

    if (!projet) {
      return errorResponse('Projet non trouvé', 404);
    }

    const result = await withTransaction(async (transaction) => {
      const geometry = await ProjetGeometry.create({
        id_projet: data.id_projet,
        geom: data.geom,
        geom_type: data.geom_type
      }, { transaction });

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

      await createCommuneLiaisons(
          geometry.id_geom,
          data.id_projet,
          spatialData.intersectedCommunes,
          transaction
      );

      return geometry;
    });

    const completeGeometry = await ProjetGeometry.findByPk(result.id_geom, {
      include: [
        {
          model: Projet,
          attributes: ['id_projet', 'nom_projet', 'description', 'date_ident_projet'],
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
        }
      ]
    });

    const responseData = completeGeometry.toJSON();

    if (responseData.area_m2) {
      responseData.area_formatted = `${(responseData.area_m2 / 10000).toFixed(2)} ha`;
    }
    if (responseData.length_m) {
      responseData.length_formatted = `${(responseData.length_m / 1000).toFixed(2)} km`;
    }

    responseData.stats = {
      communes_count: responseData.communes_traversees?.length || 0,
      codes_insee_count: responseData.codes_insee?.length || 0,
      epci_count: responseData.epci?.length || 0,
      deputes_count: responseData.deputes?.length || 0,
      maires_count: responseData.maires?.length || 0
    };

    return successResponse(
        responseData,
        `Géométrie créée avec succès pour le projet "${projet.nom_projet}"`,
        201
    );

  } catch (error) {
    console.error('Erreur POST géométrie:', error);

    if (error.message.includes('ST_')) {
      return errorResponse(
          'Erreur de géométrie spatiale',
          400,
          'Vérifiez que la géométrie est valide'
      );
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return errorResponse('Référence invalide dans les données', 400);
    }

    return errorResponse(
        'Erreur lors de la création de la géométrie',
        500,
        error.message
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/projets/[id]/route.js


import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { getFormattedThematiqueLabel } from '@/backend/lib/config';
import db from '@/backend/models';
import { logAudit, createSnapshot, createSectionVersion, extractRequestInfo } from '@/backend/lib/auditHelper';

const {
  Projet,
  StatutProjetEnum,
  DdtServiceEnum,
  RoleEnum,
  Document,
  TypePorteurEnum,
  ProjetGeometry,
  User,
  ProjetPorteur,
  Porteur,
  ProjetSuivi,
  Thematique,
  ProjetInThematique
} = db;



export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id){
      return NextResponse.json({
        success: false,
        message: 'Id du projet est invalide'
      })
    }

    const projet = await Projet.findByPk(id, {
      include: [
        {
          model: ProjetSuivi,
          as: 'suivis',
          include: {
             model: User,
             as: 'auteur',
             attributes: ['nom', 'prenom']
          }
        },
        {
          model: User,
          as: 'createur',
          attributes: ['nom', 'prenom']
        }
      ]
    });

    // Requête complexe avec tous les includes nécessaires et ALIAS CORRECTS
    const projetComplet = await Projet.findByPk(id, {
      include: [
        // 1. Statut du projet
        {
          model: StatutProjetEnum,
          as: 'statut_projet_enum',
          attributes: ['id_statut', 'libelle']
        },

        // 2. Service DDT -
        {
          model: DdtServiceEnum,
          as: 'ddt_service_enum',
          attributes: ['id_service', 'libelle_service']
        },

        // 3. Utilisateur créateur - AVEC ALIAS car défini dans les associations
        {
          model: User,
          as: 'creator',
          attributes: ['id_user', 'username', 'prenom', 'nom'],
          include: [
            {
              model: RoleEnum,
              as: 'role_enum',
              attributes: ['id_role', 'libelle']
            }
          ]
        },

        // 4. Utilisateur modificateur - AVEC ALIAS car défini dans les associations
        {
          model: User,
          as: 'updater',
          attributes: ['id_user', 'username', 'prenom', 'nom'],
          required: false,
          include: [
            {
              model: RoleEnum,
              as: 'role_enum',
              attributes: ['id_role', 'libelle']
            }
          ]
        }
      ],

      // Attributs du projet principal
      attributes: [
        'id_projet',
        'nom_projet',
        'description',
        'date_ident_projet',
        'projet_signale',
        'charte_accueil',
        'demande_suppression',
        'referent_ddt',
        'statut_projet_id',
        'service_id',
        'created_at',
        'updated_at'
      ]
    });

    if (!projetComplet) {
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    const [porteurs, suivis, thematiqueAssociations, documents, geometries] = await Promise.all([
      ProjetPorteur.findAll({
        where: { id_projet: id },
        include: [
          {
            model: TypePorteurEnum,
            as: 'type_porteur_enum',
            attributes: ['id_type_porteur', 'libelle'],
            required: false
          }
        ]
      }),

      // Suivi DDT (historique des actions) - 50 derniers
      ProjetSuivi.findAll({
        where: { id_projet: id },
        order: [['created_at', 'DESC']],
        limit: 50,
        include: [
          {
            model: User,
            as: 'auteur',
            //as: 'createdByUser',
            attributes: ['id_user', 'username', 'prenom', 'nom'],
            required: false
          }
        ]
      }),

      // Thématiques avec détails de liaison
      ProjetInThematique.findAll({
        where: { id_projet: id },
        attributes: ['id', 'id_thematique', 'date_ajout', 'ajoute_par'],
        include: [
          {
            model: Thematique,
            as: 'thematique',
            attributes: ['id_thematique', 'libelle', 'modele']
          },
          {
            model: User,
            as: 'ajouteParUser',
            attributes: ['id_user', 'username', 'prenom', 'nom'],
            required: false
          }
        ],
        order: [['date_ajout', 'ASC'], ['id', 'ASC']]
      }),


      // Documents
      Document.findAll({
        where: { id_projet: id }
      }),

      // Géométries (sans la géométrie brute)
      ProjetGeometry.findAll({
        where: { id_projet: id },
        attributes: [
          'id_geom',
          'geom_type',
          [
            db.sequelize.fn(
                'ST_AsGeoJSON',
                db.sequelize.col('geom')
            ),
            'geom_json'
          ],
          'area_m2',
          'length_m',
          'communes_traversees',
          'codes_insee',
          'epci',
          'arrondissements',
          'deputes',
          'maires'
        ],
        raw: true
      })
    ]);



    const { getModelByValue } = require('@/backend/lib/config');

    function getSequelizeModelName(tableName) {
      const modelKeys = Object.keys(db).filter(k =>
          !['sequelize', 'Sequelize', 'DataTypes'].includes(k)
      );

      // D'abord, chercher par correspondance exacte de tableName
      for (const modelKey of modelKeys) {
        const model = db[modelKey];
        if (model && model.tableName === tableName) {
          return modelKey;
        }
      }

      // Fallback: Convertir en PascalCase
      return tableName
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
    }

// ✅ FONCTION POUR RÉCUPÉRER LE NOM DU MODÈLE ENUM AUTOMATIQUEMENT
    function getEnumModelForField(field) {
      if (!field.enumTable) return null;

      const enumTableName = field.enumTable;
      const modelName = getSequelizeModelName(enumTableName);
      const EnumModel = db[modelName];

      if (EnumModel) {
        return {
          model: EnumModel,
          modelName: modelName,
          tableName: enumTableName
        };
      }

      console.warn(`⚠️ Modèle enum non trouvé pour: ${enumTableName}`);
      return null;
    }

// ✅ Dédupliquer les thématiques par id_thematique pour éviter de traiter plusieurs fois la même thématique
    const thematiquesDedupliquees = [];
    const seenThematiqueIds = new Set();

    for (const assoc of thematiqueAssociations) {
      const thematiqueId = assoc.thematique.id_thematique;
      if (!seenThematiqueIds.has(thematiqueId)) {
        seenThematiqueIds.add(thematiqueId);
        thematiquesDedupliquees.push(assoc);
      }
    }

    console.log(`📊 Thématiques avant déduplication: ${thematiqueAssociations.length}, après: ${thematiquesDedupliquees.length}`);

// Enrichir les thématiques avec les données des modèles
    const thematiquesAvecDonnees = await Promise.all(
        thematiquesDedupliquees.map(async (assoc) => {
          const modeles = JSON.parse(assoc.thematique.modele);
          const thematiqueLibelle = assoc.thematique.libelle;
          const donneesModeles = {};
          const fieldsMetadataByModel = {};
          const libelleFinal = getFormattedThematiqueLabel(thematiqueLibelle);


          for (const modeleValue of modeles) {
  try {
    let thematiqueNormalized = thematiqueLibelle;

    const thematiquesCaseSensitive = {
      'enr': 'EnR',
      'Enr': 'EnR',
      'ENR': 'EnR',
      'urbanisme': 'Urbanisme',
      'Urbanisme': 'Urbanisme',
      'environnement': 'Environnement',
      'Environnement': 'Environnement',
      'risques': 'Risques',
      'Risques': 'Risques',
      'autres': 'Autres',
      'Autres': 'Autres'
    };

    if (thematiquesCaseSensitive[thematiqueLibelle]) {
      thematiqueNormalized = thematiquesCaseSensitive[thematiqueLibelle];
    }

    const fullModeleKey = `${thematiqueNormalized}-${modeleValue}`;
    console.log(`🔍 Recherche config pour: ${fullModeleKey} (original: ${thematiqueLibelle}-${modeleValue})`);

    const modeleConfig = getModelByValue(fullModeleKey);


              if (!modeleConfig) {
                console.warn(`⚠️ Config non trouvée pour: ${fullModeleKey}`);
                donneesModeles[modeleValue] = [];
                fieldsMetadataByModel[modeleValue] = [];
                continue;
              }

              const modelName = getSequelizeModelName(modeleConfig.tableName);

              const Model = db[modelName];

            if (!Model) {
              console.warn(`⚠️ Modèle non trouvé: ${modelName}`);
              donneesModeles[modeleValue] = [];
              continue;
            }


            function findBelongsToManyAssociation(Model, enumTableName, enumSchema, relationTableName) {
              const assocs = Model.associations || {};
              for (const k in assocs) {
                const a = assocs[k];
                if (a.associationType !== 'BelongsToMany') continue;
                const targetOk = a.target?.tableName === enumTableName && a.target?.options?.schema === enumSchema;
                const throughTbl = a.through?.model?.tableName || a.through?.table?.tableName || a.through?.tableName;
                const throughOk = relationTableName ? throughTbl === relationTableName : true;
                if (targetOk && throughOk) return a; // .as, .through, .foreignKey, .otherKey
              }
              return null;
            }

            function getEnumDisplayAttributes(enumTableName) {
              // Tables qui ont SEULEMENT 'libelle' (pas de 'value')
              const usesLibelleOnly = ['type_sol_enum'].includes(enumTableName);

              if (usesLibelleOnly) {
                return ['id', 'libelle'];
              } else {
                // Toutes les autres tables enum ont {id, value}
                return ['id', 'value'];
              }
            }


          // ✅ CONSTRUIRE LES INCLUDES POUR LES ENUMS
             const includeOptions = [];

              console.log(`🔧 Traitement des champs pour ${modeleConfig.tableName}:`, modeleConfig.fields?.map(f => ({
                name: f.name,
                type: f.type,
                enumTable: f.enumTable,
                relationTable: f.relationTable
              })));

              modeleConfig.fields?.forEach(field => {
                if (!field.enumTable) return;

                // Enum simple (select/checkbox-single)
                const EnumModelSimple = Object.values(db).find(
                  model => model.tableName === field.enumTable && model.options?.schema === modeleConfig.schema
                );
                if (EnumModelSimple && field.type !== 'checkbox-multiple') {
                  includeOptions.push({
                    model: EnumModelSimple,
                    as: (Object.values(Model.associations || {}).find(a =>
                          a.associationType !== 'BelongsToMany' &&
                          a.target?.tableName === field.enumTable &&
                          a.target?.options?.schema === modeleConfig.schema
                        )?.as) || field.enumTable,
                    attributes: getEnumDisplayAttributes(field.enumTable),
                    required: false
                  });
                }

                // Many-to-Many (checkbox-multiple)
                if (field.type === 'checkbox-multiple' && field.relationTable) {
                  console.log(`🔍 Traitement M2M pour ${field.name}:`);

                  // Debug: lister tous les modèles avec cette table
                  const modelsWithTable = Object.values(db).filter(
                    model => model.tableName === field.enumTable
                  );
                  console.log(`   Modèles trouvés pour ${field.enumTable}:`, modelsWithTable.map(m => ({
                    name: m.name,
                    schema: m.options?.schema,
                    tableName: m.tableName
                  })));

                  const EnumModelM2M = Object.values(db).find(
                    model => model.tableName === field.enumTable && model.options?.schema === field.enumSchema
                  );
                  console.log(`   EnumModelM2M trouvé:`, !!EnumModelM2M, EnumModelM2M?.name);

                  const assocM2M = findBelongsToManyAssociation(
                    Model,
                    field.enumTable,
                    field.enumSchema,
                    field.relationTable
                  );
                  console.log(`   Association M2M trouvée:`, !!assocM2M, assocM2M?.as);

                  // Debug: afficher les associations trouvées
                  if (!assocM2M) {
                    console.warn(`⚠️ Association M2M introuvable ${Model.tableName} -> ${field.enumTable}`);
                    console.warn(`   Recherche: enumTable=${field.enumTable}, enumSchema=${field.enumSchema}, relationTable=${field.relationTable}`);
                    console.warn(`   Associations disponibles:`, Object.keys(Model.associations || {}).map(k => {
                      const a = Model.associations[k];
                      return `${k} (type=${a.associationType}, target=${a.target?.tableName}, schema=${a.target?.options?.schema}, through=${a.through?.model?.tableName})`;
                    }));
                  }

                  if (!EnumModelM2M) {
                    console.error(`❌ EnumModelM2M non trouvé pour ${field.enumTable} dans schema ${field.enumSchema}`);
                  }

                  if (EnumModelM2M && assocM2M) {
                    const includeConfig = {
                      model: EnumModelM2M,
                      as: assocM2M.as,                 // ex. 'type_sol_enum' / 'origine_intrants_enum'
                      through: { attributes: [] },
                      attributes: getEnumDisplayAttributes(field.enumTable),
                      required: false
                    };
                    includeOptions.push(includeConfig);
                    console.log(`✅ Include M2M ajouté pour ${field.name}:`, {
                      fieldName: field.name,
                      alias: assocM2M.as,
                      enumTable: field.enumTable,
                      attributes: includeConfig.attributes
                    });
                  }
                }
              });

              console.log(`📦 Includes totaux pour ${Model.tableName}:`, includeOptions.length, 'includes');

// ✅ RÉCUPÉRER LES DONNÉES AVEC LES RELATIONS (uniquement le plus récent)
const donnees = await Model.findAll({
  where: {
    id_project: id,
    id_thematique: assoc.thematique.id_thematique
  },
  include: includeOptions,
  order: [[modeleConfig.primaryKey, 'DESC']], // Récupérer le plus récent
  limit: 1 // Limiter à 1 enregistrement pour éviter les doublons
});

console.log(`✅ ${donnees.length} enregistrement(s) trouvé(s) pour ${modeleValue}`);


  donneesModeles[modeleValue] = donnees.map((d) => {
    const formattedData = {
      id: d[modeleConfig.primaryKey],
      commentaires: d.commentaires || null,
      dateCreation: d.created_at || null,
      dateMiseAJour: d.updated_at || null
    };

  // Parcourir chaque champ de la config
    for (const field of modeleConfig.fields || []) {
      const fieldValue = d[field.name];

    // ✅ CAS 1: Champ Many-to-Many (checkbox-multiple)
    // IMPORTANT: Ne pas skipper même si fieldValue est null, car les données sont dans la table de jonction
    if (field.type === 'checkbox-multiple' && field.relationTable) {
  const assocM2M = findBelongsToManyAssociation(Model, field.enumTable, field.enumSchema, field.relationTable);
  const relatedData = assocM2M ? d[assocM2M.as] : null;

  console.log(`🔍 Champ M2M [${field.name}]:`, {
    assocFound: !!assocM2M,
    assocAs: assocM2M?.as,
    relatedData: relatedData,
    isArray: Array.isArray(relatedData),
    length: relatedData?.length
  });

  // ✅ Renvoyer les objets complets avec ID et libellé pour l'affichage
  if (Array.isArray(relatedData) && relatedData.length > 0) {
    formattedData[field.name] = relatedData.map(item => ({
      id: item.id,
      label: item.libelle || item.value || String(item.id), // Priorité: libelle > value > id
      value: item.libelle || item.value || String(item.id)
    }));
  }
  // ✅ Ne pas ajouter le champ s'il est vide (pour ne pas polluer avec des tableaux vides)
  continue; // Passer au champ suivant
}

      // Ignorer les champs vides (sauf pour checkbox-multiple traité ci-dessus)
      if (fieldValue === null || fieldValue === undefined) {
        continue;
      }

    // ✅ CAS 2: Champ avec enumTable (select simple)
   else if (field.enumTable) {
  // ✅ Chercher l'association et récupérer le libellé via l'alias
  const assoc = Object.values(Model.associations || {}).find(a =>
    a.associationType !== 'BelongsToMany' &&
    a.target?.tableName === field.enumTable &&
    a.target?.options?.schema === modeleConfig.schema
  );

  // ✅ Vérification améliorée : ne pas considérer null/undefined comme "pas d'association"
  // Permet de gérer les valeurs 0 et false qui sont valides
  if (assoc && d[assoc.as] !== null && d[assoc.as] !== undefined) {
    // ✅ Renvoyer un objet {id, value} pour que le frontend puisse extraire l'ID
    formattedData[field.name] = {
      id: fieldValue, // L'ID stocké dans la base
      value: d[assoc.as].value || d[assoc.as].libelle || fieldValue
    };
  } else {
    formattedData[field.name] = fieldValue;
  }
}

    // ✅ CAS 3: Champ normal
    else {
      formattedData[field.name] = fieldValue;
    }
  }

  // ✅ Ajouter les champs non définis dans la config (à l'intérieur du map)
  if (d.dataValues) {
    Object.keys(d.dataValues).forEach(key => {
      const isExcluded = [
        'id_project',
        'id_thematique',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'commentaires'
      ].includes(key);

      const isEnumField = modeleConfig.fields?.some(f => f.enumTable === key);
      const isRelationField = modeleConfig.fields?.some(f => f.name.replace('_id', '') === key);

      if (!isExcluded && !isEnumField && !isRelationField && !formattedData.hasOwnProperty(key)) {
        formattedData[key] = d[key];
      }
    });
  }

  return formattedData;
});

        fieldsMetadataByModel[modeleValue] = {
          displayName: modeleConfig.displayName || modeleValue,
          fields : modeleConfig.fields?.map(field => ({
            name: field.name,
            label: field.label,
            type: field.type
          })) || []
        };
            } catch (error) {
              console.error(`❌ Erreur pour ${modeleValue}:`, error.message);
              console.error('Stack:', error.stack);
              donneesModeles[modeleValue] = [];
            }
          }

          return {
            pitId:assoc.id,
            id: assoc.thematique.id_thematique,
            libelle: libelleFinal,
            modele: assoc.thematique.modele,
            dateAjout: assoc.date_ajout,
            ajoutePar: assoc.ajouteParUser ? {
              id: assoc.ajouteParUser.id_user,
              username: assoc.ajouteParUser.username,
              nomComplet: `${assoc.ajouteParUser.prenom || ''} ${assoc.ajouteParUser.nom || ''}`.trim()
            } : null,
            donnees: donneesModeles,
            fieldsMetadataByModel: fieldsMetadataByModel

          };
        })
    );


        //  LOGS ICI,
    console.log('===== DÉBOGAGE =====');
    console.log('Porteurs trouvés:', porteurs.length);
    console.log('Porteurs bruts:', JSON.stringify(porteurs, null, 2));
    console.log('Thématiques trouvées:', thematiqueAssociations.length);
    console.log('Thématiques brutes:', JSON.stringify(thematiqueAssociations, null, 2));
    console.log('projetComplet statut_projet_id:', projetComplet.statut_projet_id);
    console.log('projetComplet service_id:', projetComplet.service_id);
    console.log('projetComplet StatutProjetEnum:', projetComplet.StatutProjetEnum);
    console.log('projetComplet DdtServiceEnum:', projetComplet.DdtServiceEnum);
    console.log('====================');


    // Transformation des données
    const projetFormate = {
      // Informations de base du projet
      projet: {
        id: projetComplet.id_projet,
        nom: projetComplet.nom_projet,
        description: projetComplet.description,
        dateIdentification: projetComplet.date_ident_projet,
        projetSignale: projetComplet.projet_signale,
        charteAccueil: projetComplet.charte_accueil,
        demandeSuppression: projetComplet.demande_suppression,
        referentDdt: projetComplet.referent_ddt,
        dateCreation: projetComplet.created_at,
        dateMiseAJour: projetComplet.updated_at
      },

      // Statut
      statut: projetComplet.statut_projet_enum ? {
        id: projetComplet.statut_projet_enum.id_statut,
        libelle: projetComplet.statut_projet_enum.libelle
      } : null,

      // Service DDT
      serviceDdt: projetComplet.ddt_service_enum ? {
        id: projetComplet.ddt_service_enum.id_service,
        libelle: projetComplet.ddt_service_enum.libelle_service
      } : null,

      // Créateur et modificateur
      createur: projetComplet.creator ? {
        id: projetComplet.creator.id_user,
        username: projetComplet.creator.username,
        nomComplet: projetComplet.creator.getFullName ? projetComplet.creator.getFullName() : `${projetComplet.creator.prenom || ''} ${projetComplet.creator.nom || ''}`.trim(),
        role: projetComplet.creator.role_enum?.libelle || null
      } : null,

      modificateur: projetComplet.updater ? {
        id: projetComplet.updater.id_user,
        username: projetComplet.updater.username,
        nomComplet: projetComplet.updater.getFullName ? projetComplet.updater.getFullName() : `${projetComplet.updater.prenom || ''} ${projetComplet.updater.nom || ''}`.trim(),
        role: projetComplet.updater.role_enum?.libelle || null
      } : null,

      // Porteurs de projet
      porteurs: porteurs.map(porteur => ({
        id: porteur.id_porteur,
        typePorteur: porteur.type_porteur_enum ? {
          id: porteur.type_porteur_enum.id_type_porteur,
          libelle: porteur.type_porteur_enum.libelle
        } : null,
        autreTypePorteur: porteur.autre_type_porteur,
        nomStructure: porteur.nom_structure,
        referent: {
          nom: porteur.referent_nom,
          fonction: porteur.referent_fonction,
          email: porteur.referent_email,
          telephone: porteur.referent_tel
        }
      })),

      // Historique des suivis DDT
      suivis: suivis.map(suivi => ({
        id: suivi.id_suivi,
        contenu: suivi.suivi,
        dateCreation: suivi.created_at,
        creePar: suivi.auteur ? {
          id: suivi.auteur.id_user,
          username: suivi.auteur.username,
          nomComplet: suivi.auteur.getFullName ? suivi.auteur.getFullName() : `${suivi.auteur.prenom || ''} ${suivi.auteur.nom || ''}`.trim()
        } : null
      })),

        // Thématiques avec données
      thematiques: thematiquesAvecDonnees,

      // Documents
      documents: documents.map(doc => ({
        id: doc.id_document,
        lienLocal: doc.lien_local,
        lienWeb: doc.lien_web
      })),

      // Informations géométriques
      /*geometries: geometries.map(geom => ({
        id: geom.id_geom,
        type: geom.geom_type,
        surface: geom.area_m2,
        longueur: geom.length_m,
        communesTraversees: geom.communes_traversees,
        codesInsee: geom.codes_insee,
        epci: geom.epci,
        arrondissements: geom.arrondissements
      }))*/

      geometries: geometries.map(geom => {
        let geomParsed = null;
        if (geom.geom_json) {
          try {
            geomParsed = JSON.parse(geom.geom_json);
          } catch (e) {
            console.error('❌ Erreur parsing GeoJSON:', e);
          }
        }

        return {
          id: geom.id_geom,
          type: geom.geom_type,
          geom: geomParsed,  // ← AJOUT
          surface: geom.area_m2 ? parseFloat(geom.area_m2) : null,
          longueur: geom.length_m ? parseFloat(geom.length_m) : null,
          communes_traversees: geom.communes_traversees || [],
          codes_insee: geom.codes_insee || [],
          epci: geom.epci || [],
          arrondissements: geom.arrondissements || [],
          deputes: geom.deputes || [],
          maires: geom.maires || []
        };
      })
    };

    // Statistiques supplémentaires
    const stats = {
      nombrePorteurs: projetFormate.porteurs.length,
      nombreThematiques: projetFormate.thematiques.length,
      nombreSuivis: projetFormate.suivis.length,
      nombreDocuments: projetFormate.documents.length,
      nombreGeometries: projetFormate.geometries.length
    };

    return NextResponse.json({
      success: true,
      data: projetFormate,
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Erreur GET /api/projets/${params?.id}:`, error);

    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération du projet complet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// PUT /api/projets/[id] - Mise à jour d'un projet

export async function PUT(request, { params }) {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`🔄 Mise à jour du projet ${id}`);
    console.log('Body reçu:', JSON.stringify(body, null, 2));

    // 1. Vérifier que le projet existe et récupérer l'état actuel pour snapshot
    const projet = await Projet.findByPk(id, {
      include: [
        { model: ProjetPorteur, as: 'porteurs' },
        { model: ProjetSuivi, as: 'suivis' },
        { model: Document, as: 'documents' },
        { model: ProjetGeometry, as: 'geometry' },
        { model: ProjetInThematique, as: 'projet_in_thematiques' }
      ],
      transaction
    });

    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    // 1.5. Sauvegarder l'état AVANT modification et créer un snapshot
    // ✅ Extraire userId de plusieurs sources possibles (updated_by, userId, created_by)
    const userId = body.updated_by || body.userId || body.created_by;
    const projetAvant = projet.toJSON(); // Sauvegarder l'état avant modification

    // Créer un snapshot AVANT modification pour permettre la restauration
    if (userId) {
      try {
        await createSnapshot({
          idProjet: id,
          projetData: projetAvant,
          description: `Snapshot automatique avant modification`,
          userId,
          transaction
        });
        console.log('📸 Snapshot créé avant modification');
      } catch (snapshotError) {
        console.error('⚠️  Erreur création snapshot (non bloquant):', snapshotError.message);
        // Ne pas bloquer la mise à jour si le snapshot échoue
      }
    }

    // 2. Mettre à jour les champs de base du projet
    // 2.1 Sauvegarder version de la section projet_info AVANT modification
    if (userId) {
      try {
        await createSectionVersion({
          idProjet: id,
          userId,
          sectionName: 'projet_info',
          sectionData: {
            nom_projet: projet.nom_projet,
            description: projet.description,
            statut_projet_id: projet.statut_projet_id,
            date_ident_projet: projet.date_ident_projet,
            projet_signale: projet.projet_signale,
            charte_accueil: projet.charte_accueil,
            service_id: projet.service_id,
            referent_ddt: projet.referent_ddt
          },
          description: 'Version automatique avant modification des informations du projet',
          transaction
        });
        console.log('📋 Version de projet_info créée');
      } catch (err) {
        console.error('⚠️  Erreur création version projet_info (non bloquant):', err.message);
      }
    }

    await projet.update({
      nom_projet: body.nom_projet ?? projet.nom_projet,
      description: body.description ?? projet.description,
      statut_projet_id: body.statut_projet_id ?? projet.statut_projet_id,
      date_ident_projet: body.date_ident_projet ?? projet.date_ident_projet,
      projet_signale: body.projet_signale ?? projet.projet_signale,
      charte_accueil: body.charte_accueil ?? projet.charte_accueil,
      demande_suppression: body.demande_suppression ?? projet.demande_suppression,
      service_id: body.service_id ?? projet.service_id,
      referent_ddt: body.referent_ddt ?? projet.referent_ddt,
      updated_by: userId ?? projet.updated_by,  // ✅ Utiliser le userId extrait
      updated_at: new Date(),
    }, { transaction });

    console.log('✅ Projet de base mis à jour');

    // 3. Mettre à jour les porteurs
    if (Array.isArray(body.porteurs)) {
      // 3.1 Sauvegarder version de la section porteurs AVANT modification
      if (userId) {
        try {
          const porteursAvant = await ProjetPorteur.findAll({
            where: { id_projet: id },
            transaction,
            raw: true
          });
          await createSectionVersion({
            idProjet: id,
            userId,
            sectionName: 'porteurs',
            sectionData: { porteurs: porteursAvant },
            description: 'Version automatique avant modification des porteurs',
            transaction
          });
          console.log('📋 Version de porteurs créée');
        } catch (err) {
          console.error('⚠️  Erreur création version porteurs (non bloquant):', err.message);
        }
      }

      // Supprimer les anciens porteurs
      await ProjetPorteur.destroy({ where: { id_projet: id }, transaction });

      // Créer les nouveaux
      if (body.porteurs.length > 0) {
        const porteursRecords = body.porteurs.map(p => ({
          id_projet: id,
          type_porteur_id: p.type_porteur_id,
          autre_type_porteur: p.autre_type_porteur || null,
          nom_structure: p.nom_structure,
          referent_nom: p.referent_nom || null,
          referent_fonction: p.referent_fonction || null,
          referent_email: p.referent_email || null,
          referent_tel: p.referent_tel || null,
        }));
        await ProjetPorteur.bulkCreate(porteursRecords, { transaction });
        console.log(`✅ ${porteursRecords.length} porteurs mis à jour`);
      }
    }

    // 4. Mettre à jour les suivis
    if (Array.isArray(body.suivis) && body.suivis.length > 0) {
      // 4.1 Sauvegarder version de la section suivis AVANT ajout
      if (userId) {
        try {
          const suivisAvant = await ProjetSuivi.findAll({
            where: { id_projet: id },
            transaction,
            raw: true
          });
          await createSectionVersion({
            idProjet: id,
            userId,
            sectionName: 'suivis',
            sectionData: { suivis: suivisAvant },
            description: 'Version automatique avant ajout de suivis',
            transaction
          });
          console.log('📋 Version de suivis créée');
        } catch (err) {
          console.error('⚠️  Erreur création version suivis (non bloquant):', err.message);
        }
      }

      const suivisRecords = body.suivis.map(s => ({
        id_projet: id,
        suivi: s.suivi,
        created_by: s.created_by || body.updated_by
      }));
      await ProjetSuivi.bulkCreate(suivisRecords, { transaction });
      console.log(`✅ ${suivisRecords.length} suivis ajoutés`);
    }

    // 5. Mettre à jour la géométrie
    if (body.geometry) {
      // 5.1 Sauvegarder version de la section geometrie AVANT modification
      if (userId) {
        try {
          const geometrieAvant = await ProjetGeometry.findOne({
            where: { id_projet: id },
            transaction,
            raw: true
          });
          if (geometrieAvant) {
            await createSectionVersion({
              idProjet: id,
              userId,
              sectionName: 'geometrie',
              sectionData: { geometry: geometrieAvant },
              description: 'Version automatique avant modification de la géométrie',
              transaction
            });
            console.log('📋 Version de geometrie créée');
          }
        } catch (err) {
          console.error('⚠️  Erreur création version geometrie (non bloquant):', err.message);
        }
      }

      // Supprimer l'ancienne géométrie
      await ProjetGeometry.destroy({ where: { id_projet: id }, transaction });

      // Créer la nouvelle
      await ProjetGeometry.create({
        id_projet: id,
        geom_type: body.geometry.geom_type,
        geom: body.geometry.geom,
        area_m2: body.geometry.area_m2,
        length_m: body.geometry.length_m,
        communes_traversees: body.geometry.communes_traversees,
        codes_insee: body.geometry.codes_insee,
        epci: body.geometry.epci,
        arrondissements: body.geometry.arrondissements,
        deputes: body.geometry.deputes,
        maires: body.geometry.maires,
      }, { transaction });
      console.log('✅ Géométrie mise à jour');
    }

    // 6. Mettre à jour les documents
    if (Array.isArray(body.documents)) {
      // 6.1 Sauvegarder version de la section documents AVANT modification
      if (userId) {
        try {
          const documentsAvant = await Document.findAll({
            where: { id_projet: id },
            transaction,
            raw: true
          });
          await createSectionVersion({
            idProjet: id,
            userId,
            sectionName: 'documents',
            sectionData: { documents: documentsAvant },
            description: 'Version automatique avant modification des documents',
            transaction
          });
          console.log('📋 Version de documents créée');
        } catch (err) {
          console.error('⚠️  Erreur création version documents (non bloquant):', err.message);
        }
      }

      // Supprimer les anciens documents
      await Document.destroy({ where: { id_projet: id }, transaction });

      // Créer les nouveaux
      const documentsFiltered = body.documents.filter(doc => doc.lien_local || doc.lien_web);
      if (documentsFiltered.length > 0) {
        const documentsRecords = documentsFiltered.map(doc => ({
          id_projet: id,
          lien_local: doc.lien_local || null,
          lien_web: doc.lien_web || null
        }));
        await Document.bulkCreate(documentsRecords, { transaction });
        console.log(`✅ ${documentsRecords.length} documents mis à jour`);
      }
    }

    // 7. Mettre à jour les thématiques (associations uniquement, pas les données)
    if (Array.isArray(body.thematiques)) {
      // 7.1 Sauvegarder version de la section thematiques AVANT modification
      if (userId) {
        try {
          const thematiquesAvant = await ProjetInThematique.findAll({
            where: { id_projet: id },
            transaction,
            raw: true
          });
          await createSectionVersion({
            idProjet: id,
            userId,
            sectionName: 'thematiques',
            sectionData: { thematiques: thematiquesAvant },
            description: 'Version automatique avant modification des thématiques',
            transaction
          });
          console.log('📋 Version de thematiques créée');
        } catch (err) {
          console.error('⚠️  Erreur création version thematiques (non bloquant):', err.message);
        }
      }

      // Supprimer les anciennes associations
      await ProjetInThematique.destroy({ where: { id_projet: id }, transaction });

      // Créer les nouvelles
      const thematiqueRecords = body.thematiques
        .filter(them => them.id_thematique)
        .map(them => ({
          id_projet: id,
          id_thematique: them.id_thematique,
          ajoute_par: body.updated_by || them.ajoute_par || 404,
          date_ajout: new Date()
        }));

      if (thematiqueRecords.length > 0) {
        await ProjetInThematique.bulkCreate(thematiqueRecords, { transaction });
        console.log(`✅ ${thematiqueRecords.length} thématiques associées`);
      }
    }

    // 8. Enregistrer l'audit log pour tracer la modification
    const { userIp, userAgent } = extractRequestInfo(request);
    const projetApres = await Projet.findByPk(id, {
      include: [
        { model: ProjetPorteur, as: 'porteurs' },
        { model: ProjetSuivi, as: 'suivis' },
        { model: Document, as: 'documents' },
        { model: ProjetGeometry, as: 'geometry' },
        { model: ProjetInThematique, as: 'projet_in_thematiques' }
      ],
      transaction
    });

    if (userId && projetApres) {
      await logAudit({
        tableName: 'projet',
        recordId: id,
        action: 'UPDATE',
        oldValues: projetAvant,
        newValues: projetApres.toJSON(),
        userId,
        userIp,
        userAgent,
        transaction
      });
      console.log('✅ Audit log enregistré');
    }

    await transaction.commit();

    // ✅ Recharger le projet pour obtenir les valeurs à jour (updated_at, etc.)
    await projet.reload();

    return NextResponse.json({
      success: true,
      message: 'Projet mis à jour avec succès',
      data: {
        id_projet: projet.id_projet,
        nom_projet: projet.nom_projet,
        updated_at: projet.updated_at,
        updated_by: projet.updated_by
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Erreur PUT /api/projets/${params?.id}:`, error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la mise à jour du projet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// PATCH /api/projets/[id] - Alias pour PUT
export async function PATCH(request, { params }) {
  return PUT(request, { params });
}



  //DELETE /api/projets/[id] - Suppression d'un projet

export async function DELETE(request, { params }) {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = await params;

    // 1. Récupérer le projet complet avant suppression
    const projet = await Projet.findByPk(id, {
      include: [
        { model: ProjetPorteur, as: 'porteurs' },
        { model: ProjetSuivi, as: 'suivis' },
        { model: Document, as: 'documents' },
        { model: ProjetGeometry, as: 'geometry' },
        { model: ProjetInThematique, as: 'projet_in_thematiques' }
      ],
      transaction
    });

    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }

    const projetData = projet.toJSON();
    const { userIp, userAgent } = extractRequestInfo(request);

    // Extraire l'userId depuis le body si disponible, sinon null
    const body = await request.json().catch(() => ({}));
    const userId = body.deleted_by || null;

    // 2. Créer un snapshot AVANT suppression
    await createSnapshot({
      idProjet: id,
      projetData: projetData,
      snapshotType: 'BEFORE_DELETE',
      description: `Snapshot automatique avant suppression du projet "${projetData.nom_projet}"`,
      userId,
      transaction
    });
    console.log('✅ Snapshot BEFORE_DELETE créé');

    // 3. Enregistrer dans l'audit log
    await logAudit({
      tableName: 'projet',
      recordId: id,
      action: 'DELETE',
      oldValues: projetData,
      newValues: null,
      userId,
      userIp,
      userAgent,
      transaction
    });
    console.log('✅ Audit log DELETE enregistré');

    // 4. Supprimer le projet (les relations en cascade seront supprimées automatiquement)
    await projet.destroy({ transaction });

    await transaction.commit();

    return NextResponse.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });

  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Erreur DELETE /api/projets/${params?.id}:`, error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la suppression du projet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

//cors

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

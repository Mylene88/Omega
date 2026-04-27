// pages/api/projets/[id]/index.js
// Next.js 13 

import { Op } from 'sequelize';
import { getFormattedThematiqueLabel } from '@/backend/lib/config';
import db from '@/backend/models';
import { logAudit, createSnapshot, createSectionVersion, extractRequestInfo } from '@/backend/lib/auditHelper';
import { requireAuth } from '@/backend/lib/authHelper';

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

export default async function handler(req, res) {
  const { id } = req.query;

  // ✅ Vérifier que l'ID est valide
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Id du projet est invalide'
    });
  }

  let authenticatedUserId = null;
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      return res.status(authResult.status).json(authResult.response);
    }
    authenticatedUserId = authResult.userId;
  }

  // ✅ GET /api/projets/[id]
  if (req.method === 'GET') {
    try {
      // ✅ Récupérer le projet complet avec tous les includes
      const projetComplet = await Projet.findByPk(id, {
        include: [
          // 1. Statut du projet
          {
            model: StatutProjetEnum,
            as: 'statut_projet_enum',
            attributes: ['id_statut', 'libelle']
          },

          // 2. Service DDT
          {
            model: DdtServiceEnum,
            as: 'ddt_service_enum',
            attributes: ['id_service', 'libelle_service']
          },

          // 3. Utilisateur créateur
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

          // 4. Utilisateur modificateur
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
          'demande_archivage',
          'demande_restauration',
          'is_archived',
          'archived_at',
          'referent_ddt',
          'statut_projet_id',
          'service_id',
          'created_at',
          'updated_at'
        ]
      });

      if (!projetComplet) {
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }

      // ✅ Récupérer les données associées en parallèle
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

        // Géométries
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

        // Chercher par correspondance exacte de tableName
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

      // ✅ Dédupliquer les thématiques
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
                console.log(`🔍 Recherche config pour: ${fullModeleKey}`);

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
                    if (targetOk && throughOk) return a;
                  }
                  return null;
                }

                function getEnumDisplayAttributes(enumTableName) {
                  const usesLibelleOnly = ['type_sol_enum'].includes(enumTableName);
                  return usesLibelleOnly ? ['id', 'libelle'] : ['id', 'value'];
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
                        as: assocM2M.as,
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

                // ✅ RÉCUPÉRER LES DONNÉES AVEC LES RELATIONS
                const donnees = await Model.findAll({
                  where: {
                    id_project: id,
                    id_thematique: assoc.thematique.id_thematique
                  },
                  include: includeOptions,
                  order: [[modeleConfig.primaryKey, 'DESC']],
                  limit: 1
                });

                console.log(`✅ ${donnees.length} enregistrement(s) trouvé(s) pour ${modeleValue}`);

                donneesModeles[modeleValue] = donnees.map((d) => {
                  const formattedData = {
                    id: d[modeleConfig.primaryKey],
                    commentaires: d.commentaires || null,
                    dateCreation: d.created_at || null,
                    dateMiseAJour: d.updated_at || null
                  };

                  for (const field of modeleConfig.fields || []) {
                    const fieldValue = d[field.name];

                    // ✅ CAS 1: Many-to-Many (checkbox-multiple)
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

                      if (Array.isArray(relatedData) && relatedData.length > 0) {
                        formattedData[field.name] = relatedData.map(item => ({
                          id: item.id,
                          label: item.libelle || item.value || String(item.id),
                          value: item.libelle || item.value || String(item.id)
                        }));
                      }
                      continue;
                    }

                    // Ignorer les champs vides
                    if (fieldValue === null || fieldValue === undefined) {
                      continue;
                    }

                    // ✅ CAS 2: Champ avec enumTable (select simple)
                    if (field.enumTable) {
                      const assoc = Object.values(Model.associations || {}).find(a =>
                        a.associationType !== 'BelongsToMany' &&
                        a.target?.tableName === field.enumTable &&
                        a.target?.options?.schema === modeleConfig.schema
                      );

                      if (assoc && d[assoc.as] !== null && d[assoc.as] !== undefined) {
                        formattedData[field.name] = {
                          id: fieldValue,
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

                  // ✅ Ajouter les champs non définis dans la config
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
              pitId: assoc.id,
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

      console.log('===== DÉBOGAGE =====');
      console.log('Porteurs trouvés:', porteurs.length);
      console.log('Thématiques trouvées:', thematiqueAssociations.length);
      console.log('====================');

      // ✅ Transformation des données
      const projetFormate = {
        projet: {
          id: projetComplet.id_projet,
          nom: projetComplet.nom_projet,
          description: projetComplet.description,
          dateIdentification: projetComplet.date_ident_projet,
          projetSignale: projetComplet.projet_signale,
          charteAccueil: projetComplet.charte_accueil,
          demandeSuppression: projetComplet.demande_suppression,
          demandeArchivage: projetComplet.demande_archivage,
          demandeRestauration: projetComplet.demande_restauration,
          isArchived: projetComplet.is_archived,
          archivedAt: projetComplet.archived_at,
          referentDdt: projetComplet.referent_ddt,
          dateCreation: projetComplet.created_at,
          dateMiseAJour: projetComplet.updated_at
        },

        statut: projetComplet.statut_projet_enum ? {
          id: projetComplet.statut_projet_enum.id_statut,
          libelle: projetComplet.statut_projet_enum.libelle
        } : null,

        serviceDdt: projetComplet.ddt_service_enum ? {
          id: projetComplet.ddt_service_enum.id_service,
          libelle: projetComplet.ddt_service_enum.libelle_service
        } : null,

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

        thematiques: thematiquesAvecDonnees,

        documents: documents.map(doc => ({
          id: doc.id_document,
          lienLocal: doc.lien_local,
          lienWeb: doc.lien_web
        })),

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
            geom: geomParsed,
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

      const stats = {
        nombrePorteurs: projetFormate.porteurs.length,
        nombreThematiques: projetFormate.thematiques.length,
        nombreSuivis: projetFormate.suivis.length,
        nombreDocuments: projetFormate.documents.length,
        nombreGeometries: projetFormate.geometries.length
      };

      return res.status(200).json({
        success: true,
        data: projetFormate,
        stats: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Erreur GET /api/projets/[id]:`, error);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du projet complet',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ PUT /api/projets/[id]
  else if (req.method === 'PUT') {
    const transaction = await db.sequelize.transaction();

    try {
      const body = req.body;

      console.log(`🔄 Mise à jour du projet ${id}`);
      console.log('Body reçu:', JSON.stringify(body, null, 2));

      // 1. Vérifier que le projet existe
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
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }

      const userId = authenticatedUserId;
      const projetAvant = projet.toJSON();

      // ✅ Créer un snapshot AVANT modification
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
        }
      }

      // 2. Sauvegarder version de la section projet_info AVANT modification
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
              demande_suppression: projet.demande_suppression,
              demande_archivage: projet.demande_archivage,
              demande_restauration: projet.demande_restauration,
              is_archived: projet.is_archived,
              archived_at: projet.archived_at,
              archived_by: projet.archived_by,
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

      // 3. Mettre à jour le projet
      await projet.update({
        nom_projet: body.nom_projet ?? projet.nom_projet,
        description: body.description ?? projet.description,
        statut_projet_id: body.statut_projet_id ?? projet.statut_projet_id,
        date_ident_projet: body.date_ident_projet ?? projet.date_ident_projet,
        projet_signale: body.projet_signale ?? projet.projet_signale,
        charte_accueil: body.charte_accueil ?? projet.charte_accueil,
        demande_suppression: body.demande_suppression ?? projet.demande_suppression,
        demande_archivage: body.demande_archivage ?? projet.demande_archivage,
        demande_restauration: body.demande_restauration ?? projet.demande_restauration,
        is_archived: body.is_archived ?? projet.is_archived,
        archived_at: body.archived_at ?? projet.archived_at,
        archived_by: body.archived_by ?? projet.archived_by,
        service_id: body.service_id ?? projet.service_id,
        referent_ddt: body.referent_ddt ?? projet.referent_ddt,
        updated_by: userId ?? projet.updated_by,
        updated_at: new Date(),
      }, { transaction });

      console.log('✅ Projet de base mis à jour');

      // 4. Mettre à jour les porteurs
      if (Array.isArray(body.porteurs)) {
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

        await ProjetPorteur.destroy({ where: { id_projet: id }, transaction });

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

      // 5. Mettre à jour les suivis (remplacement complet)
      if (Array.isArray(body.suivis)) {
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
              description: 'Version automatique avant modification des suivis',
              transaction
            });
            console.log('📋 Version de suivis créée');
          } catch (err) {
            console.error('⚠️  Erreur création version suivis (non bloquant):', err.message);
          }
        }

        await ProjetSuivi.destroy({ where: { id_projet: id }, transaction });

        const suivisRecords = body.suivis
          .map((s) => {
            const contenu = s?.suivi ?? s?.contenu ?? s?.texte ?? s?.description ?? null;
            if (!contenu || !String(contenu).trim()) return null;

            return {
              id_projet: id,
              suivi: String(contenu).trim(),
              created_by: s.created_by || userId || null,
              created_at: s.created_at || s.dateCreation || new Date()
            };
          })
          .filter(Boolean);

        if (suivisRecords.length > 0) {
          await ProjetSuivi.bulkCreate(suivisRecords, { transaction });
          console.log(`✅ ${suivisRecords.length} suivis mis à jour`);
        } else {
          console.log('ℹ️  Aucun suivi à enregistrer après remplacement');
        }
      }

      // 6. Mettre à jour la géométrie
      if (body.geometry) {
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

        await ProjetGeometry.destroy({ where: { id_projet: id }, transaction });

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

      // 7. Mettre à jour les documents
      if (Array.isArray(body.documents)) {
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

        await Document.destroy({ where: { id_projet: id }, transaction });

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

      // 8. Mettre à jour les thématiques
      if (Array.isArray(body.thematiques)) {
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

        await ProjetInThematique.destroy({ where: { id_projet: id }, transaction });

        const thematiqueRecords = body.thematiques
          .filter(them => them.id_thematique)
          .map(them => ({
            id_projet: id,
            id_thematique: them.id_thematique,
            ajoute_par: userId,
            date_ajout: new Date()
          }));

        if (thematiqueRecords.length > 0) {
          await ProjetInThematique.bulkCreate(thematiqueRecords, { transaction });
          console.log(`✅ ${thematiqueRecords.length} thématiques associées`);
        }
      }

      // 9. Enregistrer l'audit log
      const { userIp, userAgent } = extractRequestInfo(req);
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
      await projet.reload();

      return res.status(200).json({
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
      console.error(`❌ Erreur PUT /api/projets/[id]:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du projet',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ DELETE /api/projets/[id]
  else if (req.method === 'DELETE') {
    const transaction = await db.sequelize.transaction();

    try {
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
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }

      const projetData = projet.toJSON();
      const { userIp, userAgent } = extractRequestInfo(req);

      const userId = authenticatedUserId;

      // ✅ Créer un snapshot AVANT suppression
      await createSnapshot({
        idProjet: id,
        projetData: projetData,
        snapshotType: 'BEFORE_DELETE',
        description: `Snapshot automatique avant suppression du projet "${projetData.nom_projet}"`,
        userId,
        transaction
      });
      console.log('✅ Snapshot BEFORE_DELETE créé');

      // ✅ Enregistrer dans l'audit log
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

      // ✅ Supprimer le projet
      await projet.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Projet supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error(`❌ Erreur DELETE /api/projets/[id]:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du projet',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ Méthode non supportée
  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({
      success: false,
      message: `Méthode ${req.method} non autorisée`
    });
  }
}

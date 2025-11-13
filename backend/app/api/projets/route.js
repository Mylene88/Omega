// app/api/projets/route.js


import { NextResponse } from 'next/server';
import db from '@/backend/models';  // ✅ Chemin corrigé
import generateUniqueProjectId from '@/backend/utils/identifiant';  // ✅ Chemin corrigé
import { logAudit, createSnapshot, extractRequestInfo } from '@/backend/lib/auditHelper';

const {
  Projet,
  StatutProjetEnum,
  DdtServiceEnum,
  TypePorteurEnum,
  User,
  ProjetPorteur,
  ProjetSuivi,
  ProjetGeometry,
  Thematique,
  Document,
  ProjetInThematique
} = db;

      async function insertJunctionTableData(mainRecordId, fieldName, fieldValues, junctionTableName, schema, transaction) {
        if (!Array.isArray(fieldValues) || fieldValues.length === 0) {
          console.log(`⏭️  Aucune valeur pour ${fieldName}, skip junction table`);
          return;
        }

        try {
          // Construire le nom du modèle Sequelize pour la table de jonction
          const modelKeys = Object.keys(db).filter(k =>
            !['sequelize', 'Sequelize', 'DataTypes'].includes(k)
          );

          // Chercher le modèle correspondant
          let JunctionModel = null;
          for (const modelKey of modelKeys) {
            const model = db[modelKey];
            if (model && model.tableName === junctionTableName) {
              JunctionModel = model;
              console.log(`✅ Modèle de jonction trouvé: ${modelKey}`);
              break;
            }
          }

          if (!JunctionModel) {
            console.warn(`⚠️  Modèle de jonction ${junctionTableName} introuvable`);
            return;
          }

          // Déterminer les noms des colonnes
          const tableBaseName = junctionTableName.split('_')[0]; // Ex: "methanisation"
          const mainIdColumn = `id_${tableBaseName}`;

          // Pour origine_intrants_id -> id_origine_intrants
          const foreignIdColumn = `id_${fieldName.replace('_id', '')}`;

          console.log(`✅ Insertion dans ${junctionTableName}`);
          console.log(`   ${mainIdColumn} = ${mainRecordId}`);
          console.log(`   ${foreignIdColumn} = [${fieldValues.join(', ')}]`);

          // Créer les enregistrements de jonction
          const junctionRecords = fieldValues
            .filter(id => id !== null && id !== undefined && id !== '')
            .map(foreignId => ({
              [mainIdColumn]: mainRecordId,
              [foreignIdColumn]: parseInt(foreignId)
            }));

          if (junctionRecords.length > 0) {
            await JunctionModel.bulkCreate(junctionRecords, { transaction });
            console.log(`✅ ${junctionRecords.length} enregistrement(s) inséré(s) dans ${junctionTableName}`);
          }
        } catch (error) {
          console.error(`❌ Erreur insertion junction table ${junctionTableName}:`, error.message);
          throw error;
        }
      }

// ✅ FONCTION INTELLIGENTE: Trouve automatiquement le bon nom de modèle
      function getSequelizeModelName(tableName) {
        const modelKeys = Object.keys(db).filter(k =>
            !['sequelize', 'Sequelize', 'DataTypes'].includes(k)
        );

        // D'abord, chercher par correspondance exacte de tableName
        for (const modelKey of modelKeys) {
          const model = db[modelKey];
          if (model && model.tableName === tableName) {
            console.log(`      ✅ Match exact trouvé: ${modelKey} pour table ${tableName}`);
            return modelKey;
          }
        }

        // Fallback 1: Essayer avec PascalCase (sans underscores)
        const pascalCase = tableName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(''); // ⚠️ PAS de underscore ici

        if (db[pascalCase]) {
          console.log(`      ✅ Match PascalCase trouvé: ${pascalCase} pour table ${tableName}`);
          return pascalCase;
        }

        // Fallback 2: Essayer avec PascalCase + underscores (votre version)
        const pascalCaseWithUnderscore = tableName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('_');

        if (db[pascalCaseWithUnderscore]) {
          console.log(`      ✅ Match PascalCase_Underscore trouvé: ${pascalCaseWithUnderscore}`);
          return pascalCaseWithUnderscore;
        }

        // Si rien ne fonctionne, logger les modèles disponibles
        console.error(`      ❌ Aucun modèle trouvé pour table: ${tableName}`);
        console.log(`      📋 Modèles disponibles:`, modelKeys);
        console.log(`      🔍 Tentatives:`, { pascalCase, pascalCaseWithUnderscore });

        return pascalCase; // Retourner le PascalCase par défaut
      }


// GET /api/projets → récupérer tous les projets
export async function GET() {
  try {
    const projets = await Projet.findAll({
      include: [
        {
          model: StatutProjetEnum,
          attributes: ['id_statut', 'libelle']
        },
        {
          model: DdtServiceEnum,
          attributes: ['id_service', 'libelle_service']
        },
        {
          model: ProjetPorteur,
          as: 'porteurs',
          attributes: ['id_porteur', 'nom_structure', 'autre_type_porteur', 'referent_nom', 'referent_fonction', 'referent_email', 'referent_tel'],
          include: [
            {
              model: TypePorteurEnum,
              as: 'type_porteur_enum',
              attributes: ['id_type_porteur', 'libelle']
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id_user', 'username', 'nom_complet']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id_user', 'username', 'nom_complet']
        }
      ]
    });

    const result = projets.map(p => ({
      id_projet: p.id_projet,
      nom_projet: p.nom_projet,
      description: p.description,
      statut: p.statut_projet_enum?.libelle,
      statut_projet_id: p.statut_projet_id,  // ✅ Ajouter l'ID du statut pour le filtrage
      service: p.ddt_service_enum?.libelle_service,
      projet_signale: p.projet_signale,
      charte_accueil: p.charte_accueil,
      referent_ddt: p.referent_ddt,
      created_by: p.creator?.username || null,
      created_by_name: p.creator?.nom_complet || p.creator?.username || null,
      updated_by: p.updater?.username || null,
      updated_by_name: p.updater?.nom_complet || p.updater?.username || null,
      date_ident_projet: p.date_ident_projet,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/projets:', error);
    return NextResponse.json({ error: 'Impossible de récupérer les projets' }, { status: 500 });
  }
}

// POST → créer ou mettre à jour un projet
export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  const extra = {}; // Pour stocker des données additionnelles à retourner
  try {
    const body = await request.json();
    console.log('==================== DEBUG POST /api/projets ====================');
    console.log('1. Body reçu (brut):', JSON.stringify(body, null, 2));
    console.log('\n2. Vérification des types des champs associés:');
    console.log('   - porteurs:', typeof body.porteurs, 'isArray:', Array.isArray(body.porteurs));
    console.log('   - suivis:', typeof body.suivis, 'isArray:', Array.isArray(body.suivis));
    console.log('   - thematiques:', typeof body.thematiques, 'isArray:', Array.isArray(body.thematiques));
    console.log('   - documents:', typeof body.documents, 'isArray:', Array.isArray(body.documents));
    console.log('   - geometry:', typeof body.geometry);
    console.log('\n3. Contenu des champs associés:');
    console.log('   - porteurs:', body.porteurs);
    console.log('   - suivis:', body.suivis);
    console.log('   - thematiques:', body.thematiques);
    console.log('   - documents:', body.documents);

    // ✅ Vérifier si le projet existe déjà (mode édition)
    const projetExistant = await Projet.findOne({
      where: { id_projet: body.id_projet },
      transaction
    });

    const isUpdate = !!projetExistant;
    console.log(`\n4. Mode détecté: ${isUpdate ? '✏️ MISE À JOUR' : '✨ CRÉATION'}`);
    if (isUpdate) {
      console.log('   Projet existant trouvé:', projetExistant.id_projet);
    }

    // 📸 Capturer l'état actuel pour l'audit (avant modification)
    let oldProjectData = null;
    if (isUpdate) {
      const fullOldProject = await Projet.findByPk(projetExistant.id_projet, {
        include: [
          { model: ProjetPorteur, as: 'porteurs' },
          { model: ProjetSuivi, as: 'suivis' },
          { model: Document, as: 'documents' },
          { model: ProjetGeometry, as: 'geometry' },
          { model: ProjetInThematique, as: 'projet_in_thematiques' }
        ],
        transaction
      });
      oldProjectData = fullOldProject ? fullOldProject.toJSON() : null;
      console.log('   📸 État actuel capturé pour audit');
    }

    // Sécurisation des données
    const securisedData = {
      // Champs du modèle Projet
      id_projet: body.id_projet,
      nom_projet: body.nom_projet,
      description: body.description,
      statut_projet_id: body.statut_projet_id,
      date_ident_projet: body.date_ident_projet || null,
      projet_signale: body.projet_signale,
      charte_accueil: body.charte_accueil,
      service_id: body.service_id,
      referent_ddt: body.referent_ddt,
      created_by: body.created_by,
      updated_by: body.updated_by,

      porteurs: Array.isArray(body.porteurs) ? body.porteurs : [],
      suivis: Array.isArray(body.suivis) ? body.suivis : [],
      //documents: Array.isArray(body.documents) ? body.documents : [],
      geometry: body.geometry ? body.geometry : null
    };

    console.log('\n5. Données sécurisées:');
    console.log('   - porteurs:', securisedData.porteurs);
    console.log('   - suivis:', securisedData.suivis);

    let nouveauProjet;

    if (isUpdate) {
      // ✅ MODE MISE À JOUR
      console.log('\n6. 🔄 Mise à jour du projet...');

      // Mettre à jour les champs du projet
      await projetExistant.update({
        nom_projet: securisedData.nom_projet,
        description: securisedData.description,
        statut_projet_id: securisedData.statut_projet_id,
        date_ident_projet: securisedData.date_ident_projet,
        projet_signale: securisedData.projet_signale,
        charte_accueil: securisedData.charte_accueil,
        service_id: securisedData.service_id,
        referent_ddt: securisedData.referent_ddt,
        updated_by: securisedData.updated_by,
        updated_at: new Date()
      }, { transaction });

      // ✅ Supprimer les anciennes relations
      console.log('\n   🗑️  Suppression des anciennes relations...');
      await ProjetPorteur.destroy({ where: { id_projet: projetExistant.id_projet }, transaction });
      await ProjetSuivi.destroy({ where: { id_projet: projetExistant.id_projet }, transaction });
      await ProjetGeometry.destroy({ where: { id_projet: projetExistant.id_projet }, transaction });

      // ✅ Créer les nouvelles relations porteurs
      if (securisedData.porteurs && securisedData.porteurs.length > 0) {
        const porteursData = securisedData.porteurs.map(p => ({
          ...p,
          id_projet: projetExistant.id_projet
        }));
        await ProjetPorteur.bulkCreate(porteursData, { transaction });
        console.log(`   ✅ ${porteursData.length} porteurs mis à jour`);
      }

      // ✅ Créer les nouvelles relations suivis
      if (securisedData.suivis && securisedData.suivis.length > 0) {
        const suivisData = securisedData.suivis.map(s => ({
          id_projet: projetExistant.id_projet,
          suivi: s.suivi,
          created_by: s.created_by,
          created_at: new Date()
        }));
        await ProjetSuivi.bulkCreate(suivisData, { transaction });
        console.log(`   ✅ ${suivisData.length} suivis mis à jour`);
      }

      // ✅ Créer la nouvelle géométrie
      if (securisedData.geometry) {
        await ProjetGeometry.create({
          id_projet: projetExistant.id_projet,
          ...securisedData.geometry
        }, { transaction });
        console.log('   ✅ Géométrie mise à jour');
      }

      nouveauProjet = projetExistant;
      console.log('\n7. ✅ Projet mis à jour avec succès!');
      console.log('   ID:', nouveauProjet.id_projet);
    } else {
      // ✅ MODE CRÉATION
      console.log('\n6. Option include pour Projet.create:');

      const includeOptions = [
        { model: ProjetPorteur, as: 'porteurs' },
        { model: ProjetSuivi, as: 'suivis' },
        { model: ProjetGeometry, as: 'geometry' },
      ];

      console.log('   Includes:', includeOptions.map(inc => `${inc.model.name} (as: ${inc.as})`));
      console.log('\n6. Appel de Projet.create...');

      nouveauProjet = await Projet.create(securisedData, {
        include: includeOptions,
        transaction
      });

      console.log('\n7. Projet créé avec succès!');
      console.log('   ID:', nouveauProjet.id_projet);
    }


  // ✅  SECTION POUR LES DOCUMENTS
    // Création ou mise à jour des documents
    if (isUpdate) {
      console.log('\n8. 📄 Mise à jour des documents...');
      await Document.destroy({ where: { id_projet: nouveauProjet.id_projet }, transaction });
    }

    if (Array.isArray(body.documents) && body.documents.length > 0) {
      console.log(isUpdate ? ' Documents reçus pour mise à jour:' : '\n8. 📄 Création des documents...');
      console.log(' Documents reçus:', JSON.stringify(body.documents, null, 2));

      const documentsFiltered = body.documents.filter(doc =>
        doc.lien_local || doc.lien_web
      );

      if (documentsFiltered.length > 0) {
        const documentsRecords = documentsFiltered.map(doc => ({
          id_projet: nouveauProjet.id_projet,
          lien_local: doc.lien_local || null,
          lien_web: doc.lien_web || null
        }));

        console.log(' 📋 Records à créer dans document:', JSON.stringify(documentsRecords, null, 2));

        const createdDocuments = await Document.bulkCreate(documentsRecords, {
          transaction,
          validate: true
        });

        console.log(` ✅ ${createdDocuments.length} documents ${isUpdate ? 'mis à jour' : 'créés'}`);
      } else {
        console.log(' ⚠️ Aucun document valide à insérer (liens vides)');
      }
    } else {
      console.log('\n8. ⚠️ Aucun document à associer (documents vide ou non fourni)');
    }


  // ✅ Suppression des anciennes thématiques en mode mise à jour
  if (isUpdate) {
    console.log('\n9. 🗑️ Suppression des anciennes associations thématiques...');

    // Supprimer les données des tables de modèles de thématiques
    const { getModelByValue } = require('@/backend/lib/config');
    const oldAssociations = await ProjetInThematique.findAll({
      where: { id_projet: nouveauProjet.id_projet },
      include: [{ model: Thematique, as: 'thematique', attributes: ['id_thematique', 'libelle'] }],
      transaction
    });

    for (const assoc of oldAssociations) {
      // Essayer de trouver et supprimer les données du modèle de thématique
      const thematique = assoc.thematique;
      if (thematique) {
        // On doit trouver toutes les tables qui ont id_projet et id_thematique
        const allModels = Object.keys(db).filter(k =>
          !['sequelize', 'Sequelize', 'DataTypes'].includes(k) &&
          db[k].tableName &&
          db[k].rawAttributes &&
          db[k].rawAttributes.id_project &&
          db[k].rawAttributes.id_thematique
        );

        for (const modelKey of allModels) {
          try {
            await db[modelKey].destroy({
              where: {
                id_project: nouveauProjet.id_projet,
                id_thematique: thematique.id_thematique
              },
              transaction
            });
          } catch (err) {
            console.log(`   ⚠️ Pas de données à supprimer dans ${modelKey}`);
          }
        }
      }
    }

    // Supprimer les associations
    await ProjetInThematique.destroy({
      where: { id_projet: nouveauProjet.id_projet },
      transaction
    });
    console.log('   ✅ Anciennes thématiques supprimées');
  }

  if (Array.isArray(body.thematiques) && body.thematiques.length > 0) {
    console.log(`\n${isUpdate ? '9' : '8'}. 🔥 ${isUpdate ? 'Mise à jour' : 'Création'} des associations thématiques...`);
    console.log(' Thématiques reçues:', JSON.stringify(body.thematiques, null, 2));

    // ✅ LOGS POUR DÉBUGGER
    body.thematiques.forEach((them, index) => {
      console.log(`   [${index}] Structure:`, Object.keys(them))
      console.log(`   [${index}] id_thematique:`, them.id_thematique);
      console.log(`   [${index}] modele:`, them.modele);
      console.log(`   [${index}] fields:`, them.fields)
    });

    // ✅ Créer les records avec déduplication par id_thematique
    const thematiqueRecordsMap = new Map();

    body.thematiques.forEach((them, index) => {
      if (!them.id_thematique) {
        console.error(`   ❌ [${index}] ERREUR: id_thematique est undefined/null pour:`, them);
        return;
      }

      // Ne créer qu'une seule association par id_thematique (pas par modèle)
      if (!thematiqueRecordsMap.has(them.id_thematique)) {
        thematiqueRecordsMap.set(them.id_thematique, {
          id_projet: nouveauProjet.id_projet,
          id_thematique: them.id_thematique,
          ajoute_par: body.created_by || body.updated_by || them.ajoute_par || 404,
          date_ajout: new Date()
        });
      }
    });

    const thematiqueRecords = Array.from(thematiqueRecordsMap.values());

    console.log(` 📋 Records à créer dans projet_in_thematique (après déduplication): ${thematiqueRecords.length}`);
    console.log(' Détails:', JSON.stringify(thematiqueRecords, null, 2));

    if (thematiqueRecords.length === 0) {
      console.warn(' ⚠️ Aucune thématique valide à insérer!');
    } else {

      const createdThematiques = await ProjetInThematique.bulkCreate(thematiqueRecords, {
        transaction,
        validate: true,
        returning: true
      });

      const liaisonIds = createdThematiques.map(t => t.id);
      console.log(` ✅ ${createdThematiques.length} liaisons ${isUpdate ? 'mises à jour' : 'créées'}`);
      console.log(' Liaison IDs:', liaisonIds);

      extra.liaisonIds = liaisonIds;

      console.log(` ✅ ${createdThematiques.length} thématiques associées au projet`);
      console.log(' IDs créés:', createdThematiques.map(t => `projet: ${t.id_projet}, thematique: ${t.id_thematique}`));
    }
  } else {
  console.log(`\n${isUpdate ? '9' : '8'}. ⚠️ Aucune thématique à associer (thematiques vide ou non fourni)`);
  }

   // ✅ 10. SAUVEGARDE DES DONNÉES SPÉCIFIQUES AUX MODÈLES DE THÉMATIQUES
    if (Array.isArray(body.thematiques) && body.thematiques.length > 0) {
      console.log('\n10. 📝 Sauvegarde des données des modèles de thématiques...');
      const { getModelByValue } = require('@/backend/lib/config');

      for (const them of body.thematiques) {
        if (!them.modele || !them.fields || Object.keys(them.fields).length === 0) {
          console.log(`   ⚠️ Thématique sans modèle ou sans fields, ignorée`);
          continue;
        }

        console.log(`   📋 Traitement du modèle: ${them.modele}`);
        const modeleConfig = getModelByValue(them.modele);

        if (!modeleConfig) {
          console.error(`   ❌ Config non trouvée pour: ${them.modele}`);
          continue;
        }

        const tableName = modeleConfig.tableName;
        const schema = modeleConfig.schema;
        const modelName = getSequelizeModelName(tableName);
        const targetModel = db[modelName];

        if (!targetModel) {
          console.error(`   ❌ Modèle Sequelize non trouvé: ${modelName}`);
          continue;
        }

        try {
          // ✅ SÉPARER LES CHAMPS NORMAUX DES CHAMPS AVEC TABLE DE JONCTION
          const normalFields = {};
          const junctionFields = {};

          for (const [fieldName, fieldValue] of Object.entries(them.fields)) {
            // ✅ Exclure la clé primaire des champs à insérer (auto-incrémentée)
            if (fieldName === modeleConfig.primaryKey) {
              console.log(`      ⏩ Ignorer la clé primaire: ${fieldName}`);
              continue;
            }

            const fieldConfig = modeleConfig.fields?.find(f => f.name === fieldName);

            if (fieldConfig && fieldConfig.type === 'checkbox-multiple' && fieldConfig.relationTable) {
              junctionFields[fieldName] = {
                value: fieldValue,
                relationTable: fieldConfig.relationTable
              };
              console.log(`      🔗 Champ jonction: ${fieldName} → ${fieldConfig.relationTable}`);
            } else {
              if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
                normalFields[fieldName] = fieldValue;
              }
            }
          }

          // Insérer l'enregistrement principal
          const dataToInsert = {
            id_project: nouveauProjet.id_projet,
            id_thematique: them.id_thematique,
            ...normalFields,
            // ✅ Toujours utiliser created_at/created_by car les thématiques sont supprimées puis recréées
            created_at: new Date(),
            created_by: body.created_by || body.updated_by || 404,
            // ✅ Ajouter updated_at et updated_by comme NULL pour satisfaire le modèle Sequelize
            updated_at: null,
            updated_by: null
          };

          console.log(`      💾 Insertion dans ${schema}.${tableName}:`, JSON.stringify(dataToInsert, null, 2));
          const createdRecord = await targetModel.create(dataToInsert, { transaction });
          const recordId = createdRecord.dataValues[modeleConfig.primaryKey];
          console.log(`      ✅ Enregistré avec succès (${modeleConfig.primaryKey}: ${recordId})`);

          // ✅ INSÉRER DANS LES TABLES DE JONCTION
          for (const [fieldName, junctionInfo] of Object.entries(junctionFields)) {
            await insertJunctionTableData(
              recordId,
              fieldName,
              junctionInfo.value,
              junctionInfo.relationTable,
              schema,
              transaction
            );
          }

        } catch (error) {
          console.error(`      ❌ Erreur lors de l'insertion dans ${schema}.${tableName}:`, error.message);
          throw error;
        }
      }
    }

    // ✅ 11. AUDIT LOG ET SNAPSHOT
    console.log('\n11. 📝 Enregistrement de l\'audit...');
    const { userIp, userAgent } = extractRequestInfo(request);
    const userId = body.created_by || body.updated_by;

    // Récupérer l'état complet du projet après modification pour l'audit
    const fullNewProject = await Projet.findByPk(nouveauProjet.id_projet, {
      include: [
        { model: ProjetPorteur, as: 'porteurs' },
        { model: ProjetSuivi, as: 'suivis' },
        { model: Document, as: 'documents' },
        { model: ProjetGeometry, as: 'geometry' },
        { model: ProjetInThematique, as: 'projet_in_thematiques' }
      ],
      transaction
    });
    const newProjectData = fullNewProject ? fullNewProject.toJSON() : null;

    // Enregistrer l'action dans l'audit log
    await logAudit({
      tableName: 'projet',
      recordId: nouveauProjet.id_projet,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      oldValues: isUpdate ? oldProjectData : null,
      newValues: newProjectData,
      userId,
      userIp,
      userAgent,
      transaction
    });
    console.log(`   ✅ Audit log enregistré (${isUpdate ? 'UPDATE' : 'CREATE'})`);

    // Créer un snapshot pour les mises à jour
    if (isUpdate && newProjectData && userId) {
      await createSnapshot({
        idProjet: nouveauProjet.id_projet,
        projetData: newProjectData,
        description: `Snapshot automatique après modification`,
        userId,
        transaction
      });
      console.log('   ✅ Snapshot créé');
    }

    console.log('=================================================================\n');
    await transaction.commit();
    return NextResponse.json({
      success: true,
      data: {
        id_projet: nouveauProjet.id_projet,
        nom_projet: nouveauProjet.nom_projet,
        projet: nouveauProjet,
        liaisonIds: extra?.liaisonIds || []
      }
    }, { status: isUpdate ? 200 : 201 });

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ==================== ERREUR CRITIQUE ====================');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================================\n');

    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
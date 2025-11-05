// app/api/projets/route.js


import { NextResponse } from 'next/server';
import db from '@/backend/models';  // ✅ Chemin corrigé
import generateUniqueProjectId from '@/backend/utils/identifiant';  // ✅ Chemin corrigé

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
          attributes: ['id_user', 'username']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id_user', 'username']
        }
      ]
    });

    const result = projets.map(p => ({
      id_projet: p.id_projet,
      nom_projet: p.nom_projet,
      description: p.description,
      statut: p.statut_projet_enum?.libelle,
      service: p.ddt_service_enum?.libelle_service,
      projet_signale: p.projet_signale,
      charte_accueil: p.charte_accueil,
      referent_ddt: p.referent_ddt,
      created_by: p.creator?.username || null,
      updated_by: p.updater?.username || null,
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

// POST → créer un projet
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

    console.log('\n4. Données sécurisées avant Projet.create:');
    console.log('   - porteurs:', securisedData.porteurs);
    console.log('   - suivis:', securisedData.suivis);
    //console.log('   - documents:', securisedData.documents);

    console.log('\n5. Option include pour Projet.create:');

    const includeOptions = [
      { model: ProjetPorteur, as: 'porteurs' },
      { model: ProjetSuivi, as: 'suivis' },
      { model: ProjetGeometry, as: 'geometry' },

    ];

    console.log('   Includes:', includeOptions.map(inc => `${inc.model.name} (as: ${inc.as})`));

    console.log('\n6. Appel de Projet.create...');

    const nouveauProjet = await Projet.create(securisedData, {
      include: includeOptions,
      transaction
    });

    console.log('\n7. Projet créé avec succès!');
    console.log('   ID:', nouveauProjet.id_projet);


  // ✅  SECTION POUR LES DOCUMENTS
    // Création des documents
    if (Array.isArray(body.documents) && body.documents.length > 0) {
      console.log('\n8. 📄 Création des documents...');
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

        console.log(` ✅ ${createdDocuments.length} documents créés`);
      } else {
        console.log(' ⚠️ Aucun document valide à insérer (liens vides)');
      }
    } else {
      console.log('\n8. ⚠️ Aucun document à associer (documents vide ou non fourni)');
    }


  if (Array.isArray(body.thematiques) && body.thematiques.length > 0) {
    console.log('\n8. 🔥 Création des associations thématiques...');
    console.log(' Thématiques reçues:', JSON.stringify(body.thematiques, null, 2));

    // ✅ LOGS POUR DÉBUGGER
    body.thematiques.forEach((them, index) => {
      console.log(`   [${index}] Structure:`, Object.keys(them))
      console.log(`   [${index}] id_thematique:`, them.id_thematique);
      console.log(`   [${index}] modele:`, them.modele);
      console.log(`   [${index}] fields:`, them.fields)
    });

    const thematiqueRecords = body.thematiques
      .map((them, index) => {
        if (!them.id_thematique) {
          console.error(`   ❌ [${index}] ERREUR: id_thematique est undefined/null pour:`, them);
          return null;
        }

        return {
          id_projet: nouveauProjet.id_projet,
          id_thematique: them.id_thematique,
          ajoute_par: body.created_by || them.ajoute_par || 404,
          date_ajout: new Date()
        };
      })
      .filter(record => record !== null);

    console.log(' 📋 Records à créer dans projet_in_thematique:', JSON.stringify(thematiqueRecords, null, 2));

    if (thematiqueRecords.length === 0) {
      console.warn(' ⚠️ Aucune thématique valide à insérer!');
    } else {

      const createdThematiques = await ProjetInThematique.bulkCreate(thematiqueRecords, {
        transaction,
        validate: true,
        returning: true
      });

      const liaisonIds = createdThematiques.map(t => t.id);
      console.log(` ✅ ${createdThematiques.length} liaisons créées`);
      console.log(' Liaison IDs:', liaisonIds);

      extra.liaisonIds = liaisonIds;

      console.log(` ✅ ${createdThematiques.length} thématiques associées au projet`);
      console.log(' IDs créés:', createdThematiques.map(t => `projet: ${t.id_projet}, thematique: ${t.id_thematique}`));
    }
  } else {
  console.log('\n8. ⚠️ Aucune thématique à associer (thematiques vide ou non fourni)');
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
            created_at: new Date(),
            created_by: body.created_by || 404
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

    console.log('=================================================================\n');
    await transaction.commit();
    return NextResponse.json({
      success: true,
      data: {
        projet: nouveauProjet,
        liaisonIds: extra?.liaisonIds || []
      }
    }, { status: 201 });

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
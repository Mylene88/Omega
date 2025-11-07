// backend/scripts/fixCommunesTraversees.js
/**
 * Script pour corriger les géométries avec des données spatiales mais sans communes_traversees
 * Identifie et corrige les incohérences où codes_insee existe mais communes_traversees est vide
 */

const db = require('../models');
const { ProjetGeometry, GeomCommune } = db;

async function identifierIncohérences() {
  console.log('🔍 Identification des géométries avec incohérences...\n');

  try {
    // Récupérer toutes les géométries
    const geometries = await ProjetGeometry.findAll({
      attributes: [
        'id_geom',
        'id_projet',
        'geom_type',
        'codes_insee',
        'communes_traversees',
        'epci',
        'arrondissements'
      ]
    });

    console.log(`📊 Total géométries en base: ${geometries.length}\n`);

    const incohérences = [];

    for (const geom of geometries) {
      const codesInsee = geom.codes_insee || [];
      const communesTraversees = geom.communes_traversees || [];

      // Incohérence : codes INSEE renseignés mais communes_traversees vide
      if (codesInsee.length > 0 && communesTraversees.length === 0) {
        incohérences.push({
          id_geom: geom.id_geom,
          id_projet: geom.id_projet,
          geom_type: geom.geom_type,
          codes_insee: codesInsee,
          epci: geom.epci || [],
          arrondissements: geom.arrondissements || []
        });

        console.log(`❌ Incohérence détectée:`);
        console.log(`   Géométrie ID: ${geom.id_geom}`);
        console.log(`   Projet ID: ${geom.id_projet}`);
        console.log(`   Type: ${geom.geom_type}`);
        console.log(`   Codes INSEE: ${codesInsee.join(', ')}`);
        console.log(`   Communes: VIDE ❌`);
        console.log(`   EPCI: ${geom.epci?.length || 0} entrée(s)`);
        console.log(`   Arrondissements: ${geom.arrondissements?.length || 0} entrée(s)`);
        console.log('');
      }
    }

    console.log(`\n📋 Résumé:`);
    console.log(`   ✅ Géométries OK: ${geometries.length - incohérences.length}`);
    console.log(`   ❌ Incohérences: ${incohérences.length}`);

    return incohérences;

  } catch (error) {
    console.error('❌ Erreur lors de l\'identification:', error);
    throw error;
  }
}

async function corrigerCommunesTraversees(incohérences) {
  console.log(`\n🔧 Correction de ${incohérences.length} géométrie(s)...\n`);

  let correctionReussies = 0;
  let correctionEchouees = 0;

  for (const inc of incohérences) {
    try {
      console.log(`📝 Traitement géométrie ${inc.id_geom} (Projet ${inc.id_projet})...`);

      // Récupérer les noms de communes depuis les codes INSEE
      const communesNoms = [];

      for (const codeInsee of inc.codes_insee) {
        // Chercher la commune dans la table geom_commune
        const commune = await GeomCommune.findOne({
          where: { code_insee: codeInsee },
          attributes: ['nom', 'code_insee']
        });

        if (commune) {
          communesNoms.push(commune.nom);
          console.log(`   ✅ Trouvé: ${commune.nom} (${codeInsee})`);
        } else {
          console.log(`   ⚠️ Commune non trouvée pour code INSEE: ${codeInsee}`);
          // Ajouter le code INSEE comme fallback
          communesNoms.push(`Code INSEE ${codeInsee}`);
        }
      }

      if (communesNoms.length > 0) {
        // Mettre à jour la géométrie
        await ProjetGeometry.update(
          { communes_traversees: communesNoms },
          { where: { id_geom: inc.id_geom } }
        );

        console.log(`   ✅ Correction réussie: ${communesNoms.join(', ')}\n`);
        correctionReussies++;
      } else {
        console.log(`   ❌ Aucune commune trouvée pour cette géométrie\n`);
        correctionEchouees++;
      }

    } catch (error) {
      console.error(`   ❌ Erreur lors de la correction de ${inc.id_geom}:`, error.message);
      correctionEchouees++;
    }
  }

  console.log(`\n📊 Résultat des corrections:`);
  console.log(`   ✅ Réussies: ${correctionReussies}`);
  console.log(`   ❌ Échouées: ${correctionEchouees}`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Script de correction des communes_traversees             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Étape 1 : Identifier les incohérences
    const incohérences = await identifierIncohérences();

    if (incohérences.length === 0) {
      console.log('\n✅ Aucune incohérence détectée ! Toutes les géométries sont cohérentes.');
      return;
    }

    // Étape 2 : Demander confirmation (ou corriger directement)
    console.log(`\n⚠️  ${incohérences.length} géométrie(s) nécessite(nt) une correction.`);
    console.log('🔧 Lancement de la correction...\n');

    await corrigerCommunesTraversees(incohérences);

    console.log('\n✅ Script terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Exécuter le script
main();

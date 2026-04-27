/**
 * Exécute la migration d'archivage 202604270001-add-archive-system.js
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const migration = require('../migrations/202604270001-add-archive-system');

async function runArchiveMigration() {
  try {
    console.log('🚀 Lancement migration archivage...');
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');

    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, Sequelize);

    console.log('✅ Migration archivage appliquée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur migration archivage:', error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {
      // noop
    }
  }
}

runArchiveMigration();

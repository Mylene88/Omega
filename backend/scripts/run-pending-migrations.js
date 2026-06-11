const path = require('path');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const MIGRATIONS = [
  '202605180001-add-user-is-active.js',
  '202605180002-add-project-section-concurrency.js',
  '202606080001-add-updated-at-to-projet-geometry.js'
];

const HISTORY_SCHEMA = 'principale';
const HISTORY_TABLE = 'migration_history';

async function ensureHistoryTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ${HISTORY_SCHEMA}.${HISTORY_TABLE} (
      id_migration SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function getExecutedMigrations() {
  const [rows] = await sequelize.query(`
    SELECT file_name
    FROM ${HISTORY_SCHEMA}.${HISTORY_TABLE}
    ORDER BY executed_at ASC;
  `);

  return new Set(rows.map((row) => row.file_name));
}

async function markMigrationExecuted(fileName, transaction) {
  await sequelize.query(
    `
      INSERT INTO ${HISTORY_SCHEMA}.${HISTORY_TABLE} (file_name)
      VALUES (:fileName)
      ON CONFLICT (file_name) DO NOTHING;
    `,
    {
      replacements: { fileName },
      transaction
    }
  );
}

async function runMigrationFile(fileName) {
  const absolutePath = path.join(__dirname, '..', 'migrations', fileName);
  const migration = require(absolutePath);

  if (!migration || typeof migration.up !== 'function') {
    throw new Error(`Migration invalide: ${fileName}`);
  }

  const transaction = await sequelize.transaction();

  try {
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, Sequelize);
    await markMigrationExecuted(fileName, transaction);
    await transaction.commit();
    console.log(`✅ Migration appliquée: ${fileName}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function runPendingMigrations() {
  try {
    console.log('🚀 Vérification des migrations en attente...');
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');

    await ensureHistoryTable();
    const executed = await getExecutedMigrations();

    const pending = MIGRATIONS.filter((fileName) => !executed.has(fileName));

    if (pending.length === 0) {
      console.log('ℹ️ Aucune migration en attente.');
      return;
    }

    console.log(`📝 ${pending.length} migration(s) en attente:`);
    pending.forEach((fileName) => console.log(`   - ${fileName}`));

    for (const fileName of pending) {
      await runMigrationFile(fileName);
    }

    console.log('✅ Toutes les migrations en attente ont été appliquées.');
  } catch (error) {
    console.error('❌ Erreur lors de l’exécution des migrations:', error);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      // noop
    }
  }
}

runPendingMigrations();

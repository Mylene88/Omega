// Script pour exécuter la migration demande_suppression
const sequelize = require('../config/database');

async function runMigration() {
  try {
    console.log('🚀 Début de la migration...');

    // Vérifier la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Exécuter la requête SQL
    const query = `
      ALTER TABLE principale.projet
      ADD COLUMN IF NOT EXISTS demande_suppression BOOLEAN NOT NULL DEFAULT false;
    `;

    await sequelize.query(query);
    console.log('✅ Colonne demande_suppression ajoutée avec succès');

    // Vérifier que la colonne existe
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'principale'
        AND table_name = 'projet'
        AND column_name = 'demande_suppression';
    `);

    if (results.length > 0) {
      console.log('✅ Vérification réussie:', results[0]);
    } else {
      console.error('❌ La colonne n\'a pas été trouvée après migration');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

runMigration();

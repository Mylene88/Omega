// backend/scripts/add-deleted-at.js
// Script pour ajouter la colonne deleted_at à la table projet

const db = require('../models');

async function addDeletedAt() {
  try {
    console.log('🚀 Début de la migration add-deleted-at...');

    // Vérifier la connexion
    await db.sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Vérifier si la colonne existe déjà
    const [existing] = await db.sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'principale'
        AND table_name = 'projet'
        AND column_name = 'deleted_at';
    `);

    if (existing.length > 0) {
      console.log('⚠️  La colonne deleted_at existe déjà');
      await db.sequelize.close();
      process.exit(0);
    }

    // Ajouter la colonne deleted_at
    console.log('📝 Ajout de la colonne deleted_at...');
    await db.sequelize.query(`
      ALTER TABLE principale.projet
      ADD COLUMN deleted_at TIMESTAMP;
    `);

    console.log('✅ Colonne deleted_at ajoutée avec succès');

    // Vérifier que la colonne a bien été ajoutée
    const [results] = await db.sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'principale'
        AND table_name = 'projet'
        AND column_name = 'deleted_at';
    `);

    if (results.length > 0) {
      console.log('✅ Vérification réussie:', results[0]);
      console.log('\n✨ Migration terminée avec succès!');
      console.log('📌 Le soft delete est maintenant activé sur le modèle Projet');
    } else {
      console.error('❌ La colonne n\'a pas été trouvée après migration');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

addDeletedAt();

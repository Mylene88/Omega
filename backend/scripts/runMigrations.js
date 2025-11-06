// backend/scripts/runMigrations.js
/**
 * Script pour exécuter les migrations manuellement
 */

const db = require('../models');

async function runMigrations() {
  try {
    console.log('🔄 Exécution des migrations...\n');

    // Migration: Create admin_access_log table
    console.log('📝 Migration: Create admin_access_log table');

    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS principale.admin_access_log (
        id_access SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES principale.user(id_user) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(255),
        resource_id VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table admin_access_log créée');

    // Créer les index
    await db.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_access_user ON principale.admin_access_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_access_date ON principale.admin_access_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_access_action ON principale.admin_access_log(action);
      CREATE INDEX IF NOT EXISTS idx_admin_access_user_date ON principale.admin_access_log(user_id, created_at DESC);
    `);

    console.log('✅ Index créés');

    // Ajouter les commentaires
    await db.sequelize.query(`
      COMMENT ON TABLE principale.admin_access_log IS 'Journalisation de tous les accès et actions dans l''interface admin';
      COMMENT ON COLUMN principale.admin_access_log.action IS 'Type d''action: LOGIN, LOGOUT, VIEW_AUDIT, VIEW_STATS, VIEW_SNAPSHOTS, RESTORE_PROJECT, EXPORT_DATA, etc.';
      COMMENT ON COLUMN principale.admin_access_log.duration_ms IS 'Durée de l''opération en millisecondes';
    `);

    console.log('✅ Commentaires ajoutés');

    console.log('\n✅ Toutes les migrations ont été exécutées avec succès!');

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des migrations:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

runMigrations();

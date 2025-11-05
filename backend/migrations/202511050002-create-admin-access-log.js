// Migration pour créer la table admin_access_log
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
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

      -- Index pour recherche rapide par utilisateur
      CREATE INDEX idx_admin_access_user ON principale.admin_access_log(user_id);

      -- Index pour recherche par date
      CREATE INDEX idx_admin_access_date ON principale.admin_access_log(created_at DESC);

      -- Index pour recherche par action
      CREATE INDEX idx_admin_access_action ON principale.admin_access_log(action);

      -- Index composite pour les filtres courants
      CREATE INDEX idx_admin_access_user_date ON principale.admin_access_log(user_id, created_at DESC);

      COMMENT ON TABLE principale.admin_access_log IS 'Journalisation de tous les accès et actions dans l''interface admin';
      COMMENT ON COLUMN principale.admin_access_log.action IS 'Type d''action: LOGIN, LOGOUT, VIEW_AUDIT, VIEW_STATS, VIEW_SNAPSHOTS, RESTORE_PROJECT, EXPORT_DATA, etc.';
      COMMENT ON COLUMN principale.admin_access_log.duration_ms IS 'Durée de l''opération en millisecondes';
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS principale.admin_access_log CASCADE;
    `);
  }
};

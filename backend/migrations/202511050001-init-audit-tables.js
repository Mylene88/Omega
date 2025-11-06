// migrations/202511050001-init-audit-tables.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Table audit_log : historique de toutes les modifications
    await queryInterface.createTable(
      'audit_log',
      {
        id_audit: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        table_name: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Nom de la table modifiée'
        },
        record_id: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'ID de l\'enregistrement modifié'
        },
        action: {
          type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE'),
          allowNull: false,
          comment: 'Type d\'action effectuée'
        },
        old_values: {
          type: Sequelize.JSONB,
          comment: 'Valeurs avant modification'
        },
        new_values: {
          type: Sequelize.JSONB,
          comment: 'Valeurs après modification'
        },
        changed_fields: {
          type: Sequelize.ARRAY(Sequelize.TEXT),
          comment: 'Liste des champs modifiés'
        },
        user_id: {
          type: Sequelize.INTEGER,
          references: {
            model: 'user',
            key: 'id_user'
          },
          onDelete: 'SET NULL',
          comment: 'ID de l\'utilisateur qui a fait la modification'
        },
        user_ip: {
          type: Sequelize.TEXT,
          comment: 'Adresse IP de l\'utilisateur'
        },
        user_agent: {
          type: Sequelize.TEXT,
          comment: 'User agent du navigateur'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          allowNull: false
        }
      },
      { schema: 'principale' }
    );

    // Index pour améliorer les performances des requêtes
    await queryInterface.addIndex(
      { tableName: 'audit_log', schema: 'principale' },
      ['table_name', 'record_id'],
      { name: 'idx_audit_log_table_record' }
    );

    await queryInterface.addIndex(
      { tableName: 'audit_log', schema: 'principale' },
      ['user_id'],
      { name: 'idx_audit_log_user' }
    );

    await queryInterface.addIndex(
      { tableName: 'audit_log', schema: 'principale' },
      ['created_at'],
      { name: 'idx_audit_log_created_at' }
    );

    await queryInterface.addIndex(
      { tableName: 'audit_log', schema: 'principale' },
      ['action'],
      { name: 'idx_audit_log_action' }
    );

    // Table projet_snapshot : snapshots complets des projets
    await queryInterface.createTable(
      'projet_snapshot',
      {
        id_snapshot: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        id_projet: {
          type: Sequelize.STRING,
          references: {
            model: 'projet',
            key: 'id_projet'
          },
          onDelete: 'CASCADE',
          allowNull: false,
          comment: 'ID du projet snapshooté'
        },
        snapshot_data: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Données complètes du projet au moment du snapshot'
        },
        snapshot_type: {
          type: Sequelize.ENUM('AUTO', 'MANUAL', 'BEFORE_DELETE'),
          defaultValue: 'AUTO',
          allowNull: false,
          comment: 'Type de snapshot (automatique, manuel, avant suppression)'
        },
        description: {
          type: Sequelize.TEXT,
          comment: 'Description du snapshot'
        },
        created_by: {
          type: Sequelize.INTEGER,
          references: {
            model: 'user',
            key: 'id_user'
          },
          onDelete: 'SET NULL',
          comment: 'ID de l\'utilisateur qui a créé le snapshot'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          allowNull: false
        }
      },
      { schema: 'principale' }
    );

    // Index pour les snapshots
    await queryInterface.addIndex(
      { tableName: 'projet_snapshot', schema: 'principale' },
      ['id_projet'],
      { name: 'idx_projet_snapshot_projet' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_snapshot', schema: 'principale' },
      ['created_at'],
      { name: 'idx_projet_snapshot_created_at' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_snapshot', schema: 'principale' },
      ['snapshot_type'],
      { name: 'idx_projet_snapshot_type' }
    );

    console.log('✅ Tables audit_log et projet_snapshot créées avec succès');
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les tables dans l'ordre inverse
    await queryInterface.dropTable({ tableName: 'projet_snapshot', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'audit_log', schema: 'principale' });

    console.log('✅ Tables audit_log et projet_snapshot supprimées');
  }
};

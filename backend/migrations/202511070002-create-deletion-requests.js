// migrations/202511070002-create-deletion-requests.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Créer la table des demandes de suppression
    await queryInterface.createTable(
      'projet_deletion_request',
      {
        id_deletion_request: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        id_projet: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet'
          },
          onDelete: 'CASCADE'
        },
        requested_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user'
          }
        },
        raison: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Raison de la demande de suppression'
        },
        statut: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Statut de la demande: pending, approved, rejected'
        },
        reviewed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user'
          }
        },
        review_comment: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Commentaire de l\'admin lors de la révision'
        },
        reviewed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      { schema: 'principale' }
    );

    // Index pour améliorer les performances
    await queryInterface.addIndex(
      { tableName: 'projet_deletion_request', schema: 'principale' },
      ['id_projet'],
      { name: 'idx_deletion_request_projet' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_deletion_request', schema: 'principale' },
      ['statut'],
      { name: 'idx_deletion_request_statut' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_deletion_request', schema: 'principale' },
      ['requested_by'],
      { name: 'idx_deletion_request_user' }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'projet_deletion_request', schema: 'principale' });
  }
};

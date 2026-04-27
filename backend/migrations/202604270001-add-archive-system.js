'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';

    await queryInterface.addColumn(
      { tableName: 'projet', schema },
      'demande_archivage',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si une demande d\'archivage est en attente'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'projet', schema },
      'demande_restauration',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si une demande de restauration est en attente'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'projet', schema },
      'is_archived',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si le projet est archive'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'projet', schema },
      'archived_at',
      {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Date d\'archivage du projet'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'projet', schema },
      'archived_by',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: { tableName: 'user', schema },
          key: 'id_user'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Administrateur ayant archive le projet'
      }
    );

    await queryInterface.createTable(
      { tableName: 'projet_archive_request', schema },
      {
        id_archive_request: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        id_projet: {
          type: Sequelize.STRING,
          allowNull: true,
          references: {
            model: { tableName: 'projet', schema },
            key: 'id_projet'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        projet_nom_cache: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Nom du projet au moment de la demande (historique)'
        },
        requested_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'user', schema },
            key: 'id_user'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        request_type: {
          type: Sequelize.ENUM('archivage', 'restauration'),
          allowNull: false,
          defaultValue: 'archivage'
        },
        raison: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Motif utilisateur de la demande'
        },
        statut: {
          type: Sequelize.ENUM('en attente', 'accepter', 'refuser'),
          allowNull: false,
          defaultValue: 'en attente'
        },
        reviewed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: { tableName: 'user', schema },
            key: 'id_user'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        review_comment: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Commentaire admin lors de la reponse'
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
      }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_archive_request', schema },
      ['id_projet'],
      { name: 'idx_archive_request_projet' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_archive_request', schema },
      ['statut'],
      { name: 'idx_archive_request_statut' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_archive_request', schema },
      ['request_type'],
      { name: 'idx_archive_request_type' }
    );

    await queryInterface.addIndex(
      { tableName: 'projet_archive_request', schema },
      ['requested_by'],
      { name: 'idx_archive_request_user' }
    );

    console.log('✅ Systeme d\'archivage ajoute');
  },

  async down(queryInterface, Sequelize) {
    const schema = 'principale';

    await queryInterface.dropTable({ tableName: 'projet_archive_request', schema });

    await queryInterface.removeColumn({ tableName: 'projet', schema }, 'archived_by');
    await queryInterface.removeColumn({ tableName: 'projet', schema }, 'archived_at');
    await queryInterface.removeColumn({ tableName: 'projet', schema }, 'is_archived');
    await queryInterface.removeColumn({ tableName: 'projet', schema }, 'demande_restauration');
    await queryInterface.removeColumn({ tableName: 'projet', schema }, 'demande_archivage');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_principale_projet_archive_request_request_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_principale_projet_archive_request_statut";');

    console.log('✅ Systeme d\'archivage retire');
  }
};

// migrations/202509150002-init-autres.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createSchema('autres');

    // Enums
    const mkEnum = async (name) =>
      queryInterface.createTable(
        name,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          value: { type: Sequelize.TEXT, allowNull: false, unique: true },
        },
        { schema: 'autres', timestamps: false }
      );

    await mkEnum('soumis_enum');
    await mkEnum('avis_copenaf_enum');
    await mkEnum('avis_prefet_enum');
    await mkEnum('type_participation_enum');
    await mkEnum('organisateur_participation_enum');
    await mkEnum('avis_commissaire_enqueteur_enum');
    await mkEnum('regime_icpe_enum');

    // Tables métier
    await queryInterface.createTable(
      'compensation_agricole_collective',
      {
        id_compensation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
          onDelete: 'CASCADE',
        },
        soumis_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'soumis_enum', schema: 'autres' }, key: 'id' },
        },
        avis_copenaf_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'avis_copenaf_enum', schema: 'autres' }, key: 'id' },
        },
        avis_prefet_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'avis_prefet_enum', schema: 'autres' }, key: 'id' },
        },
        montant: { type: Sequelize.NUMERIC, validate: { min: 0 } },
        destinataire_compensation: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE },
        created_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
      },
      { schema: 'autres' }
    );

    await queryInterface.createTable(
      'participation_du_public',
      {
        id_participation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
          onDelete: 'CASCADE',
        },
        type_participation_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'type_participation_enum', schema: 'autres' }, key: 'id' },
        },
        debut_participation: { type: Sequelize.DATE },
        fin_participation: { type: Sequelize.DATE },
        organisateur_participation_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'organisateur_participation_enum', schema: 'autres' }, key: 'id' },
        },
        avis_commissaire_enqueteur_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'avis_commissaire_enqueteur_enum', schema: 'autres' }, key: 'id' },
        },
        commentaires: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE },
        created_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
      },
      { schema: 'autres' }
    );

    await queryInterface.createTable(
      'icpe',
      {
        id_icpe: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
          onDelete: 'CASCADE',
        },
        regime_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'regime_icpe_enum', schema: 'autres' }, key: 'id' },
        },
        rubriques: { type: Sequelize.TEXT },
        decision: { type: Sequelize.TEXT },
        commentaires: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE },
        created_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'user', schema: 'principale' }, key: 'id_user' },
        },
      },
      { schema: 'autres' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'icpe', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'participation_du_public', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'compensation_agricole_collective', schema: 'autres' });

    await queryInterface.dropTable({ tableName: 'regime_icpe_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'avis_commissaire_enqueteur_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'organisateur_participation_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'type_participation_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'avis_prefet_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'avis_copenaf_enum', schema: 'autres' });
    await queryInterface.dropTable({ tableName: 'soumis_enum', schema: 'autres' });

    await queryInterface.dropSchema('autres');
  },
};

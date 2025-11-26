// migrations/202509150003-init-urbanisme.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createSchema('urbanisme');

    const mkEnum = async (name) =>
      queryInterface.createTable(
        name,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          value: { type: Sequelize.TEXT, allowNull: false },
        },
        { schema: 'urbanisme', timestamps: false }
      );

    await mkEnum('procedure_enum');
    await mkEnum('decision_autorisation_enum');
    await mkEnum('document_urbanisme_enum');
    await mkEnum('procedure_compatibilite_enum');
    await mkEnum('avancement_procedure_enum');
    await mkEnum('conformite_sdagdv_enum');

    await queryInterface.createTable(
      'autorisation_urbanisme',
      {
        id_autorisation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
        },
        procedure_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'procedure_enum', schema: 'urbanisme' }, key: 'id' },
        },
        service_instructeur: { type: Sequelize.TEXT },
        objet_autorisation: { type: Sequelize.TEXT, allowNull: false },
        numero_dossier: { type: Sequelize.TEXT },
        date_depot: { type: Sequelize.DATE },
        avis_cdpenaf: { type: Sequelize.TEXT },
        decision_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'decision_autorisation_enum', schema: 'urbanisme' }, key: 'id' },
        },
        date_decision: { type: Sequelize.DATE },
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
      { schema: 'urbanisme' }
    );

    await queryInterface.createTable(
      'planification',
      {
        id_planification: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
        },
        document_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'document_urbanisme_enum', schema: 'urbanisme' }, key: 'id' },
        },
        motifs_incompatibilite: { type: Sequelize.TEXT },
        procedure_compatibilite_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'procedure_compatibilite_enum', schema: 'urbanisme' }, key: 'id' },
        },
        avancement_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'avancement_procedure_enum', schema: 'urbanisme' }, key: 'id' },
        },
        date: { type: Sequelize.DATE },
        avis_cdpenaf: { type: Sequelize.TEXT },
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
      { schema: 'urbanisme' }
    );

    await queryInterface.createTable(
      'planification_procedure_compatibilite',
      {
        id_planification: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: { model: { tableName: 'planification', schema: 'urbanisme' }, key: 'id_planification' },
          onDelete: 'CASCADE',
        },
        id_procedure_compatibilite: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: { model: { tableName: 'procedure_compatibilite_enum', schema: 'urbanisme' }, key: 'id' },
          onDelete: 'CASCADE',
        },
      },
      { schema: 'urbanisme', timestamps: false }
    );

    await queryInterface.createTable(
      'habitat',
      {
        id_habitat: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
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
      { schema: 'urbanisme' }
    );

    await queryInterface.createTable(
      'gdv',
      {
        id_gdv: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
        },
        conformite_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'conformite_sdagdv_enum', schema: 'urbanisme' }, key: 'id' },
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
      { schema: 'urbanisme' }
    );

    await queryInterface.createTable(
      'police_urbanisme',
      {
        id_police: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
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
      { schema: 'urbanisme' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'police_urbanisme', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'gdv', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'habitat', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'planification_procedure_compatibilite', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'planification', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'autorisation_urbanisme', schema: 'urbanisme' });

    await queryInterface.dropTable({ tableName: 'conformite_sdagdv_enum', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'avancement_procedure_enum', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'procedure_compatibilite_enum', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'document_urbanisme_enum', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'decision_autorisation_enum', schema: 'urbanisme' });
    await queryInterface.dropTable({ tableName: 'procedure_enum', schema: 'urbanisme' });

    await queryInterface.dropSchema('urbanisme');
  },
};

// migrations/202509150004-init-enr.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createSchema('enr');

    const mkEnum = async (name, key = 'value') =>
      queryInterface.createTable(
        name,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          [key]: { type: Sequelize.TEXT, allowNull: false, unique: true },
        },
        { schema: 'enr', timestamps: false }
      );

    await mkEnum('type_installation_enum');
    await mkEnum('projet_zone_acc_enum');
    await mkEnum('doc_cadre_enum');
    await mkEnum('etat_avancement_enum');
    await mkEnum('etat_avancement_stockage_enum');
    await queryInterface.createTable(
      'type_sol_enum',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle: { type: Sequelize.TEXT, allowNull: false, unique: true },
      },
      { schema: 'enr', timestamps: false }
    );
    await mkEnum('type_methaniseur_enum');
    await mkEnum('origine_intrants_enum');
    await mkEnum('instructeur_icpe_enum');
    await mkEnum('regime_icpe_enum');

    await queryInterface.createTable(
      'eolien',
      {
        id_eolien: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
      { schema: 'enr' }
    );

    await queryInterface.createTable(
      'pv_agri_pv',
      {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
        },
        type_installation_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'type_installation_enum', schema: 'enr' }, key: 'id' },
        },
        zone_acceleration_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet_zone_acc_enum', schema: 'enr' }, key: 'id' },
        },
        document_cadre_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'doc_cadre_enum', schema: 'enr' }, key: 'id' },
        },
        puissance_mw: { type: Sequelize.NUMERIC },
        surface_totale_ha: { type: Sequelize.NUMERIC },
        raccordement: { type: Sequelize.TEXT },
        date_comite_projet: { type: Sequelize.DATE },
        etat_avancement_id: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
          references: { model: { tableName: 'etat_avancement_enum', schema: 'enr' }, key: 'id' },
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
      { schema: 'enr' }
    );

    await queryInterface.createTable(
      'pv_type_sol',
      {
        id_pv: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: { model: { tableName: 'pv_agri_pv', schema: 'enr' }, key: 'id' },
          onDelete: 'CASCADE',
        },
        id_type_sol: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: { model: { tableName: 'type_sol_enum', schema: 'enr' }, key: 'id' },
          onDelete: 'CASCADE',
        },
      },
      { schema: 'enr', timestamps: false }
    );

    await queryInterface.createTable(
      'methanisation',
      {
        id_methanisation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
          onDelete: 'CASCADE',
        },
        type_methaniseur_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'type_methaniseur_enum', schema: 'enr' }, key: 'id' },
        },
        origine_intrants_ids: { type: Sequelize.ARRAY(Sequelize.INTEGER) },
        instructeur_icpe_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'instructeur_icpe_enum', schema: 'enr' }, key: 'id' },
        },
        regime_icpe_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'regime_icpe_enum', schema: 'enr' }, key: 'id' },
        },
        etat_avancement_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'etat_avancement_enum', schema: 'enr' }, key: 'id' },
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
      { schema: 'enr' }
    );

    await queryInterface.createTable(
      'stockage_batterie',
      {
        id_stockage_batterie: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_project: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'projet', schema: 'principale' }, key: 'id_projet' },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'thematique', schema: 'principale' }, key: 'id_thematique' },
          onDelete: 'CASCADE',
        },
        puissance_mw: { type: Sequelize.NUMERIC },
        surface_totale_ha: { type: Sequelize.NUMERIC },
        type_sol: { type: Sequelize.TEXT },
        etat_avancement_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'etat_avancement_stockage_enum', schema: 'enr' }, key: 'id' },
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
      { schema: 'enr' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'stockage_batterie', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'methanisation', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'pv_type_sol', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'pv_agri_pv', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'eolien', schema: 'enr' });

    await queryInterface.dropTable({ tableName: 'regime_icpe_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'instructeur_icpe_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'origine_intrants_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'type_methaniseur_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'type_sol_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'etat_avancement_stockage_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'etat_avancement_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'doc_cadre_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'projet_zone_acc_enum', schema: 'enr' });
    await queryInterface.dropTable({ tableName: 'type_installation_enum', schema: 'enr' });

    await queryInterface.dropSchema('enr');
  },
};

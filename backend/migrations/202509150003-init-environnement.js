// migrations/202509150005-init-environnement.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Créer le schéma
    await queryInterface.createSchema('environnement');

    // Tables ENUM (sans timestamps)
    const mkEnum = async (name) =>
      queryInterface.createTable(
        name,
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          value: { type: Sequelize.TEXT, allowNull: false, unique: true },
        },
        { schema: 'environnement', timestamps: false }
      );

    await mkEnum('necessite_dep_enum');
    await mkEnum('necessite_defrichement_enum');
    await mkEnum('regime_eau_enum');
    await mkEnum('statut_eau_enum');
    await mkEnum('regime_evaluation_env_enum');

    // Tables métier
    await queryInterface.createTable(
      'derogation_espece_protegee',
      {
        id_derogation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
        espece_protegee: { type: Sequelize.TEXT, allowNull: false },
        necessite_dep_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'necessite_dep_enum', schema: 'environnement' }, key: 'id' },
        },
        numero_dossier: { type: Sequelize.TEXT, unique: true },
        date_depot: { type: Sequelize.DATE },
        decision: { type: Sequelize.TEXT },
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
      { schema: 'environnement' }
    );

    await queryInterface.createTable(
      'defrichement',
      {
        id_defrichement: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
        surface_impactee: { type: Sequelize.TEXT, allowNull: false },
        necessite_autorisation_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'necessite_defrichement_enum', schema: 'environnement' }, key: 'id' },
        },
        numero_dossier: { type: Sequelize.TEXT, unique: true },
        date_depot: { type: Sequelize.DATE },
        decision: { type: Sequelize.TEXT },
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
      { schema: 'environnement' }
    );

    await queryInterface.createTable(
      'loi_sur_leau',
      {
        id_loi_eau: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
        rubrique_eau: { type: Sequelize.TEXT, allowNull: false },
        regime_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'regime_eau_enum', schema: 'environnement' }, key: 'id' },
        },
        numero_dossier: { type: Sequelize.TEXT, unique: true },
        statut_id: {
          type: Sequelize.INTEGER,
          references: { model: { tableName: 'statut_eau_enum', schema: 'environnement' }, key: 'id' },
        },
        date_depot: { type: Sequelize.DATE },
        decision: { type: Sequelize.TEXT },
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
      { schema: 'environnement' }
    );

    await queryInterface.createTable(
      'assainissement',
      {
        id_assainissement: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
      { schema: 'environnement' }
    );

    await queryInterface.createTable(
      'evaluation_environnementale',
      {
        id_evaluation: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
          references: { model: { tableName: 'regime_evaluation_env_enum', schema: 'environnement' }, key: 'id' },
        },
        rubriques_ee: { type: Sequelize.TEXT, allowNull: false },
        quelle_procedure_ee: { type: Sequelize.TEXT, allowNull: false },
        date_contrib_ddt_mrae: { type: Sequelize.DATE },
        avis_mrae: { type: Sequelize.TEXT },
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
      { schema: 'environnement' }
    );
  },

  async down(queryInterface) {
    // Drop en ordre inverse
    await queryInterface.dropTable({ tableName: 'evaluation_environnementale', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'assainissement', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'loi_sur_leau', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'defrichement', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'derogation_espece_protegee', schema: 'environnement' });

    await queryInterface.dropTable({ tableName: 'regime_evaluation_env_enum', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'statut_eau_enum', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'regime_eau_enum', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'necessite_defrichement_enum', schema: 'environnement' });
    await queryInterface.dropTable({ tableName: 'necessite_dep_enum', schema: 'environnement' });

    await queryInterface.dropSchema('environnement');
  },
};

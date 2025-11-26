// migrations/202509150001-init-principale.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Schéma
    await queryInterface.createSchema('principale');

    // ENUM-like tables (sans timestamps)
    await queryInterface.createTable(
      'role_enum',
      {
        id_role: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle: { type: Sequelize.TEXT, allowNull: false },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'statut_projet_enum',
      {
        id_statut: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle: { type: Sequelize.TEXT, allowNull: false },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'ddt_service_enum',
      {
        id_service: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle_service: { type: Sequelize.TEXT, allowNull: false },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'type_porteur_enum',
      {
        id_type_porteur: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle: { type: Sequelize.TEXT, allowNull: false },
      },
      { schema: 'principale' }
    );

    // Tables principales
    await queryInterface.createTable(
      'user',
      {
        id_user: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: Sequelize.TEXT, allowNull: false, unique: true },
        password_hash: { type: Sequelize.TEXT, allowNull: false },
        first_login: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        role_id: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'role_enum', schema: 'principale' },
            key: 'id_role',
          },
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'thematique',
      {
        id_thematique: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        libelle: { type: Sequelize.TEXT, allowNull: false },
        modele: { type: Sequelize.TEXT },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet',
      {
        id_projet: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nom_projet: { type: Sequelize.TEXT, allowNull: false },
        description: { type: Sequelize.TEXT },
        statut_projet_id: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'statut_projet_enum', schema: 'principale' },
            key: 'id_statut',
          },
        },
        date_ident_projet: { type: Sequelize.DATE, allowNull: false },
        projet_signale: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        charte_accueil: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        service_id: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'ddt_service_enum', schema: 'principale' },
            key: 'id_service',
          },
        },
        referent_ddt: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        created_by: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user',
          },
        },
        updated_at: { type: Sequelize.DATE },
        updated_by: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user',
          },
        },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet_porteur',
      {
        id_porteur: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_projet: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        type_porteur_id: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'type_porteur_enum', schema: 'principale' },
            key: 'id_type_porteur',
          },
        },
        autre_type_porteur: { type: Sequelize.TEXT },
        nom_structure: { type: Sequelize.TEXT, allowNull: false },
        referent_nom: { type: Sequelize.TEXT },
        referent_fonction: { type: Sequelize.TEXT },
        referent_email: { type: Sequelize.TEXT },
        referent_tel: { type: Sequelize.TEXT },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet_suivi',
      {
        id_suivi: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_projet: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        suivi: { type: Sequelize.TEXT, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        created_by: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user',
          },
        },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet_in_thematique',
      {
        id_projet: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        id_thematique: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: {
            model: { tableName: 'thematique', schema: 'principale' },
            key: 'id_thematique',
          },
          onDelete: 'CASCADE',
        },
        date_ajout: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        ajoute_par: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'user', schema: 'principale' },
            key: 'id_user',
          },
        },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'document',
      {
        id_document: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_projet: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        lien_local: { type: Sequelize.TEXT },
        lien_web: { type: Sequelize.TEXT },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet_geometry',
      {
        id_geom: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        id_projet: {
          type: Sequelize.INTEGER,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        geom: { type: Sequelize.GEOMETRY }, // nécessite PostGIS
        geom_type: { type: Sequelize.TEXT },
        area_m2: { type: Sequelize.NUMERIC },
        length_m: { type: Sequelize.NUMERIC },
        communes_traversees: { type: Sequelize.ARRAY(Sequelize.TEXT) },
        codes_insee: { type: Sequelize.ARRAY(Sequelize.TEXT) },
        epci: { type: Sequelize.ARRAY(Sequelize.TEXT) },
        arrondissements: { type: Sequelize.ARRAY(Sequelize.TEXT) },
        deputes: { type: Sequelize.ARRAY(Sequelize.TEXT) },
        maires: { type: Sequelize.ARRAY(Sequelize.TEXT) },
      },
      { schema: 'principale' }
    );

    await queryInterface.createTable(
      'projet_geometry_commune',
      {
        id_geom: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: {
            model: { tableName: 'projet_geometry', schema: 'principale' },
            key: 'id_geom',
          },
          onDelete: 'CASCADE',
        },
        id_projet: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          references: {
            model: { tableName: 'projet', schema: 'principale' },
            key: 'id_projet',
          },
          onDelete: 'CASCADE',
        },
        id_commune: { type: Sequelize.INTEGER, primaryKey: true }, // référence externe (pas de FK ici)
      },
      { schema: 'principale', timestamps: false }
    );
  },

  async down(queryInterface) {
    // Drop en ordre inverse
    await queryInterface.dropTable({ tableName: 'projet_geometry_commune', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'projet_geometry', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'document', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'projet_in_thematique', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'projet_suivi', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'projet_porteur', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'projet', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'thematique', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'user', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'type_porteur_enum', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'ddt_service_enum', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'statut_projet_enum', schema: 'principale' });
    await queryInterface.dropTable({ tableName: 'role_enum', schema: 'principale' });

    await queryInterface.dropSchema('principale');
  },
};

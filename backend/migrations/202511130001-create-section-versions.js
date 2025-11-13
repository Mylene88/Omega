// backend/migrations/202511130001-create-section-versions.js
/**
 * Migration pour créer la table de versioning par section
 * - 10 versions max par section par utilisateur
 * - Rétention 15 jours
 * - Sauvegarde granulaire par section
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';

    // Créer la table des versions de sections
    await queryInterface.createTable(
      'section_version',
      {
        id_version: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        id_projet: {
          type: Sequelize.STRING,
          allowNull: false,
          references: {
            model: { tableName: 'projet', schema },
            key: 'id_projet'
          },
          onDelete: 'CASCADE',
          comment: 'ID du projet concerné'
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { tableName: 'user', schema },
            key: 'id_user'
          },
          onDelete: 'CASCADE',
          comment: 'Utilisateur ayant créé cette version'
        },
        section_name: {
          type: Sequelize.ENUM(
            'projet_info',
            'porteurs',
            'suivis',
            'thematiques',
            'documents',
            'geometrie'
          ),
          allowNull: false,
          comment: 'Nom de la section sauvegardée'
        },
        version_number: {
          type: Sequelize.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 10
          },
          comment: 'Numéro de version (1-10, rotation circulaire)'
        },
        section_data: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Données complètes de la section'
        },
        snapshot_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: 'Date de création de la version'
        },
        is_current: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Indique si c\'est la version actuelle'
        },
        description: {
          type: Sequelize.TEXT,
          comment: 'Description optionnelle de la version'
        },
        metadata: {
          type: Sequelize.JSONB,
          comment: 'Métadonnées additionnelles (changements, contexte, etc.)'
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      },
      {
        schema,
        comment: 'Versions des sections de projets avec limite de 10 versions par section par utilisateur'
      }
    );

    // Ajouter contrainte CHECK pour version_number (1-10)
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}.section_version
      ADD CONSTRAINT chk_version_number_range
      CHECK (version_number >= 1 AND version_number <= 10)
    `);

    // Index pour optimiser les requêtes
    await queryInterface.addIndex(
      { tableName: 'section_version', schema },
      ['id_projet', 'section_name', 'user_id'],
      {
        name: 'idx_section_version_projet_section_user'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'section_version', schema },
      ['user_id', 'section_name'],
      {
        name: 'idx_section_version_user_section'
      }
    );

    await queryInterface.addIndex(
      { tableName: 'section_version', schema },
      ['snapshot_date'],
      {
        name: 'idx_section_version_date'
      }
    );

    // Index unique pour garantir qu'on n'a qu'une seule version N par section par utilisateur par projet
    await queryInterface.addIndex(
      { tableName: 'section_version', schema },
      ['id_projet', 'user_id', 'section_name', 'version_number'],
      {
        unique: true,
        name: 'idx_section_version_unique'
      }
    );

    console.log('✅ Table section_version créée avec succès');
  },

  async down(queryInterface, Sequelize) {
    const schema = 'principale';

    // Supprimer la table
    await queryInterface.dropTable({ tableName: 'section_version', schema });

    console.log('✅ Table section_version supprimée');
  }
};

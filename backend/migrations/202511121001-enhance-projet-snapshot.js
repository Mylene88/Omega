// Migration pour améliorer la table projet_snapshot avec versioning
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Migration: Enhancement de projet_snapshot avec versioning...');

    try {
      // Vérifier si la colonne user_id existe déjà
      const table = await queryInterface.describeTable(
        { tableName: 'projet_snapshot', schema: 'principale' }
      );

      const columnsToAdd = [];

      // Ajouter user_id si manquant
      if (!table.user_id) {
        columnsToAdd.push('user_id');
        await queryInterface.addColumn(
          { tableName: 'projet_snapshot', schema: 'principale' },
          'user_id',
          {
            type: Sequelize.INTEGER,
            references: {
              model: 'user',
              key: 'id_user',
              schema: 'principale'
            },
            onDelete: 'SET NULL'
          }
        );
        console.log('  ✅ Colonne user_id ajoutée');
      }

      // Ajouter version_number si manquant
      if (!table.version_number) {
        columnsToAdd.push('version_number');
        await queryInterface.addColumn(
          { tableName: 'projet_snapshot', schema: 'principale' },
          'version_number',
          {
            type: Sequelize.INTEGER,
            defaultValue: 1,
            comment: 'Numéro de version du snapshot pour un projet'
          }
        );
        console.log('  ✅ Colonne version_number ajoutée');
      }

      // Ajouter snapshot_date si manquant
      if (!table.snapshot_date) {
        columnsToAdd.push('snapshot_date');
        await queryInterface.addColumn(
          { tableName: 'projet_snapshot', schema: 'principale' },
          'snapshot_date',
          {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            comment: 'Date du snapshot'
          }
        );
        console.log('  ✅ Colonne snapshot_date ajoutée');
      }

      // Ajouter is_current si manquant
      if (!table.is_current) {
        columnsToAdd.push('is_current');
        await queryInterface.addColumn(
          { tableName: 'projet_snapshot', schema: 'principale' },
          'is_current',
          {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            comment: 'Indique si c\'est le snapshot courant'
          }
        );
        console.log('  ✅ Colonne is_current ajoutée');
      }

      // Créer la fonction PostgreSQL pour obtenir le prochain numéro de version
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION principale.get_next_version_number(
          p_id_projet VARCHAR,
          p_user_id INTEGER
        ) RETURNS INTEGER AS $$
        DECLARE
          v_next_version INTEGER;
        BEGIN
          SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
          FROM principale.projet_snapshot
          WHERE id_projet = p_id_projet
          AND user_id = p_user_id;

          RETURN v_next_version;
        END;
        $$ LANGUAGE plpgsql STABLE;
      `);
      console.log('  ✅ Fonction get_next_version_number créée');

      // Créer la contrainte unique si elle n'existe pas
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE principale.projet_snapshot
          ADD CONSTRAINT unique_project_user_version
          UNIQUE (id_projet, user_id, version_number);
        `);
        console.log('  ✅ Contrainte unique ajoutée');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('  ℹ️  Contrainte unique déjà existante');
        } else {
          throw error;
        }
      }

      // Ajouter des index pour améliorer les performances
      const existingIndexes = await queryInterface.sequelize.query(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'principale' AND tablename = 'projet_snapshot'
      `);
      const indexNames = existingIndexes[0].map(idx => idx.indexname);

      if (!indexNames.includes('idx_projet_snapshot_user_version')) {
        await queryInterface.addIndex(
          { tableName: 'projet_snapshot', schema: 'principale' },
          ['id_projet', 'user_id', 'version_number'],
          { name: 'idx_projet_snapshot_user_version' }
        );
        console.log('  ✅ Index idx_projet_snapshot_user_version créé');
      }

      if (!indexNames.includes('idx_projet_snapshot_user_id')) {
        await queryInterface.addIndex(
          { tableName: 'projet_snapshot', schema: 'principale' },
          ['user_id'],
          { name: 'idx_projet_snapshot_user_id' }
        );
        console.log('  ✅ Index idx_projet_snapshot_user_id créé');
      }

      if (!indexNames.includes('idx_projet_snapshot_is_current')) {
        await queryInterface.addIndex(
          { tableName: 'projet_snapshot', schema: 'principale' },
          ['is_current'],
          { name: 'idx_projet_snapshot_is_current' }
        );
        console.log('  ✅ Index idx_projet_snapshot_is_current créé');
      }

      console.log('✅ Migration enhancement projet_snapshot complétée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⏮️  Rollback migration enhancement projet_snapshot...');

    try {
      // Supprimer la fonction PostgreSQL
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS principale.get_next_version_number(VARCHAR, INTEGER);
      `);

      // Supprimer la contrainte unique
      await queryInterface.removeConstraint(
        { tableName: 'projet_snapshot', schema: 'principale' },
        'unique_project_user_version',
        { ifExists: true }
      );

      // Supprimer les colonnes
      const columnsToRemove = ['user_id', 'version_number', 'snapshot_date', 'is_current'];
      for (const col of columnsToRemove) {
        try {
          await queryInterface.removeColumn(
            { tableName: 'projet_snapshot', schema: 'principale' },
            col
          );
          console.log(`  ✅ Colonne ${col} supprimée`);
        } catch (error) {
          console.log(`  ℹ️  Colonne ${col} n'existe pas`);
        }
      }

      // Supprimer les index
      const indexesToRemove = [
        'idx_projet_snapshot_user_version',
        'idx_projet_snapshot_user_id',
        'idx_projet_snapshot_is_current'
      ];
      for (const idx of indexesToRemove) {
        try {
          await queryInterface.removeIndex(
            { tableName: 'projet_snapshot', schema: 'principale' },
            idx
          );
          console.log(`  ✅ Index ${idx} supprimé`);
        } catch (error) {
          console.log(`  ℹ️  Index ${idx} n'existe pas`);
        }
      }

      console.log('✅ Rollback migration complété');
    } catch (error) {
      console.error('❌ Erreur lors du rollback:', error.message);
      throw error;
    }
  }
};

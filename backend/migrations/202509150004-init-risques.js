// migrations/202509150006-init-risques.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Schéma
    await queryInterface.createSchema('risques');

    // Helper pour créer une table "risque" avec le même pattern
    const createRisqueTable = async (tableName, pkName) => {
      await queryInterface.createTable(
        tableName,
        {
          [pkName]: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
        { schema: 'risques' }
      );
    };

    // Tables
    await createRisqueTable('ruissellement', 'id_ruissellement');
    await createRisqueTable('bruit', 'id_bruit');
    await createRisqueTable('zonesinond', 'id_zonesinond');
    await createRisqueTable('cavites', 'id_cavites');
    await createRisqueTable('incendie', 'id_incendie');
    await createRisqueTable('rga', 'id_rga');
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ tableName: 'rga', schema: 'risques' });
    await queryInterface.dropTable({ tableName: 'incendie', schema: 'risques' });
    await queryInterface.dropTable({ tableName: 'cavites', schema: 'risques' });
    await queryInterface.dropTable({ tableName: 'zonesinond', schema: 'risques' });
    await queryInterface.dropTable({ tableName: 'bruit', schema: 'risques' });
    await queryInterface.dropTable({ tableName: 'ruissellement', schema: 'risques' });

    await queryInterface.dropSchema('risques');
  },
};

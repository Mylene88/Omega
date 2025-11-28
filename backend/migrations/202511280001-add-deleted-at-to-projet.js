// backend/migrations/202511280001-add-deleted-at-to-projet.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      { schema: 'principale', tableName: 'projet' },
      'deleted_at',
      {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      }
    );

    console.log('✅ Colonne deleted_at ajoutée à la table projet');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      { schema: 'principale', tableName: 'projet' },
      'deleted_at'
    );

    console.log('✅ Colonne deleted_at retirée de la table projet');
  }
};

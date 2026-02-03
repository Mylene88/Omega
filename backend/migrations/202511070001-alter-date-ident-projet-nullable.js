// migrations/202511070001-alter-date-ident-projet-nullable.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Modifier la colonne date_ident_projet pour permettre NULL
    await queryInterface.changeColumn(
      { tableName: 'projet', schema: 'principale' },
      'date_ident_projet',
      {
        type: Sequelize.DATE,
        allowNull: true, // Changement: permettre NULL
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // Restaurer la contrainte NOT NULL (attention: cela échouera s'il y a des valeurs NULL)
    await queryInterface.changeColumn(
      { tableName: 'projet', schema: 'principale' },
      'date_ident_projet',
      {
        type: Sequelize.DATE,
        allowNull: false,
      }
    );
  },
};

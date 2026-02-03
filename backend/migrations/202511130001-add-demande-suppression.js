// migrations/202511130001-add-demande-suppression.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ajouter la colonne demande_suppression à la table projet
    await queryInterface.addColumn(
      { tableName: 'projet', schema: 'principale' },
      'demande_suppression',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Indique si une demande de suppression a été faite pour ce projet'
      }
    );

    console.log('✅ Colonne demande_suppression ajoutée à la table projet');
  },

  async down(queryInterface, Sequelize) {
    // Supprimer la colonne en cas de rollback
    await queryInterface.removeColumn(
      { tableName: 'projet', schema: 'principale' },
      'demande_suppression'
    );

    console.log('✅ Colonne demande_suppression supprimée de la table projet');
  }
};

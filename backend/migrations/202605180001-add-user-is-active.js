'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';

    await queryInterface.addColumn(
      { tableName: 'user', schema },
      'is_active',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indique si le compte utilisateur est actif'
      }
    );

    console.log('✅ Colonne is_active ajoutée à principale.user');
  },

  async down(queryInterface) {
    const schema = 'principale';

    await queryInterface.removeColumn({ tableName: 'user', schema }, 'is_active');

    console.log('✅ Colonne is_active supprimée de principale.user');
  }
};

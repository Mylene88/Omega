'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';
    const tableName = 'projet_geometry';

    const [rows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${tableName}'
        AND column_name = 'updated_at'
      LIMIT 1;
    `);

    if (rows.length === 0) {
      await queryInterface.addColumn(
        { tableName, schema },
        'updated_at',
        {
          type: Sequelize.DATE,
          allowNull: true
        }
      );
    }
  },

  async down(queryInterface) {
    const schema = 'principale';
    const tableName = 'projet_geometry';

    const [rows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = '${schema}'
        AND table_name = '${tableName}'
        AND column_name = 'updated_at'
      LIMIT 1;
    `);

    if (rows.length > 0) {
      await queryInterface.removeColumn({ tableName, schema }, 'updated_at');
    }
  }
};

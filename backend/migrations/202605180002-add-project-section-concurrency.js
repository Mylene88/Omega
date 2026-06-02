'use strict';

const SECTION_ENUM_VALUES = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';
    const [stateTableRows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_name = 'project_section_state'
      LIMIT 1;
    `);
    const [lockTableRows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_name = 'project_section_lock'
      LIMIT 1;
    `);

    if (stateTableRows.length === 0) {
      await queryInterface.createTable(
        { tableName: 'project_section_state', schema },
        {
          id_state: {
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
            onUpdate: 'CASCADE'
          },
          section_name: {
            type: Sequelize.ENUM(...SECTION_ENUM_VALUES),
            allowNull: false
          },
          revision: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: { tableName: 'user', schema },
              key: 'id_user'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
          }
        }
      );

      await queryInterface.addIndex(
        { tableName: 'project_section_state', schema },
        ['id_projet', 'section_name'],
        { unique: true, name: 'idx_project_section_state_unique' }
      );
    }

    if (lockTableRows.length === 0) {
      await queryInterface.createTable(
        { tableName: 'project_section_lock', schema },
        {
          id_lock: {
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
            onUpdate: 'CASCADE'
          },
          section_name: {
            type: Sequelize.ENUM(...SECTION_ENUM_VALUES),
            allowNull: false
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: { tableName: 'user', schema },
              key: 'id_user'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
          },
          acquired_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: false
          }
        }
      );

      await queryInterface.addIndex(
        { tableName: 'project_section_lock', schema },
        ['id_projet', 'section_name'],
        { unique: true, name: 'idx_project_section_lock_unique' }
      );

      await queryInterface.addIndex(
        { tableName: 'project_section_lock', schema },
        ['expires_at'],
        { name: 'idx_project_section_lock_expires_at' }
      );
    }

    console.log('✅ Tables de concurrence par section ajoutées');
  },

  async down(queryInterface) {
    const schema = 'principale';
    const [stateTableRows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_name = 'project_section_state'
      LIMIT 1;
    `);
    const [lockTableRows] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
        AND table_name = 'project_section_lock'
      LIMIT 1;
    `);

    if (lockTableRows.length > 0) {
      await queryInterface.dropTable({ tableName: 'project_section_lock', schema });
    }
    if (stateTableRows.length > 0) {
      await queryInterface.dropTable({ tableName: 'project_section_state', schema });
    }

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_principale_project_section_lock_section_name";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_principale_project_section_state_section_name";');

    console.log('✅ Tables de concurrence par section supprimées');
  }
};

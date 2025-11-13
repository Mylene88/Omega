// backend/migrations/202511130002-fix-deletion-request-cascade.js
/**
 * Migration pour corriger la contrainte CASCADE sur projet_deletion_request
 * Pour permettre de garder l'historique des demandes même après suppression du projet
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'principale';

    // 1. Supprimer l'ancienne contrainte de clé étrangère avec CASCADE
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}.projet_deletion_request
      DROP CONSTRAINT IF EXISTS projet_deletion_request_id_projet_fkey
    `);

    // 2. Recréer la contrainte avec SET NULL au lieu de CASCADE
    // Ainsi, quand un projet est supprimé, id_projet devient NULL mais la demande reste
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}.projet_deletion_request
      ADD CONSTRAINT projet_deletion_request_id_projet_fkey
      FOREIGN KEY (id_projet)
      REFERENCES ${schema}.projet(id_projet)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    // 3. Modifier la colonne id_projet pour accepter NULL
    await queryInterface.changeColumn(
      { tableName: 'projet_deletion_request', schema },
      'id_projet',
      {
        type: Sequelize.STRING,
        allowNull: true  // Permet maintenant NULL
      }
    );

    // 4. Ajouter une colonne pour sauvegarder le nom du projet
    await queryInterface.addColumn(
      { tableName: 'projet_deletion_request', schema },
      'projet_nom_cache',
      {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nom du projet au moment de la demande (pour historique)'
      }
    );

    console.log('✅ Contrainte CASCADE corrigée - les demandes de suppression seront conservées même après suppression du projet');
  },

  async down(queryInterface, Sequelize) {
    const schema = 'principale';

    // Supprimer la colonne projet_nom_cache
    await queryInterface.removeColumn(
      { tableName: 'projet_deletion_request', schema },
      'projet_nom_cache'
    );

    // Revenir à l'état précédent
    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}.projet_deletion_request
      DROP CONSTRAINT IF EXISTS projet_deletion_request_id_projet_fkey
    `);

    await queryInterface.changeColumn(
      { tableName: 'projet_deletion_request', schema },
      'id_projet',
      {
        type: Sequelize.STRING,
        allowNull: false
      }
    );

    await queryInterface.sequelize.query(`
      ALTER TABLE ${schema}.projet_deletion_request
      ADD CONSTRAINT projet_deletion_request_id_projet_fkey
      FOREIGN KEY (id_projet)
      REFERENCES ${schema}.projet(id_projet)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);

    console.log('✅ Revenu à l\'ancienne contrainte CASCADE');
  }
};

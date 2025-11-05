// backend/utils/database.js
import sequelize from '../config/database';

/**
 * Exécute une fonction dans une transaction
 * @param {Function} callback - Fonction à exécuter
 * @returns {Promise} Résultat de la fonction
 */
async function withTransaction(callback) {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Crée les liaisons communes pour une géométrie
 * @param {number} id_geom - ID de la géométrie
 * @param {number} id_projet - ID du projet
 * @param {Array} communes - Liste des communes intersectées
 * @param {Object} transaction - Transaction Sequelize
 */
async function createCommuneLiaisons(id_geom, id_projet, communes, transaction) {
  const { ProjetGeometryCommune } = await import('../models/principale');
  
  if (communes.length > 0) {
    const communeLiaisons = communes.map(commune => ({
      id_geom,
      id_projet,
      id_commune: commune.id
    }));

    await ProjetGeometryCommune.bulkCreate(communeLiaisons, { 
      transaction, 
      ignoreDuplicates: true 
    });
  }
}

module.exports = {
  withTransaction,
  createCommuneLiaisons
};
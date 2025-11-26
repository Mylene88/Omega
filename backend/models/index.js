// backend/models/index.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

let modelsInitialized = false;
let models = {};

const initializeModels = () => {
  if (modelsInitialized) {
    return models;
  }

  console.log('🚀 Initializing models...');

  // Import and initialize models once
  const principale = require('./principale')(sequelize, DataTypes);
  const urbanisme = require('./urbanisme')(sequelize, DataTypes, principale);
  const enr = require('./enr')(sequelize, DataTypes, principale);
  const environnement = require('./environnement')(sequelize, DataTypes, principale);
  const risques = require('./risques')(sequelize, DataTypes, principale);
  const autres = require('./autres')(sequelize, DataTypes, principale);
  const externe = require('./externe')(sequelize, DataTypes);

  models = {
    sequelize,
    DataTypes,
    ...principale,
    ...urbanisme,
    ...enr,
    ...autres,
    ...environnement,
    ...risques,
    ...externe,
  };

  modelsInitialized = true;
  console.log('✅ Models initialized successfully');

  return models;
};

// Test connection only once at startup
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// Initialize models and test connection
testConnection()
    .then(() => initializeModels())
    .catch(error => {
      console.error('Failed to initialize models:', error);
      process.exit(1);
    });

module.exports = initializeModels();
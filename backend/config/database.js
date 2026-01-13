// backend/config/database.js - Fixed version
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Sequelize } = require('sequelize');

// Remove the conflicting declaration - you had both 'let sequelize = null' and 'const sequelize = new Sequelize(...)'
let sequelizeInstance = null;

console.log('🔍 Environment variables loaded:', {
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_USR: process.env.POSTGRES_USR,
  POSTGRES_DB: process.env.POSTGRES_DB,
});

const {
  POSTGRES_URL,
  POSTGRES_HOST = 'localhost',
  POSTGRES_USR = 'postgres',
  POSTGRES_PWD = 'postgres',
  POSTGRES_DB = 'omega',
  POSTGRES_PORT = '5432',
} = process.env;

const createConnection = () => {
  // Return existing instance if already created (singleton pattern)
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  const url =
      POSTGRES_URL ||
      `postgres://${POSTGRES_USR}:${POSTGRES_PWD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

  console.log('🔗 Creating new Sequelize connection...');
  console.log('📊 Connection URL:', url.replace(POSTGRES_PWD, '***'));

  sequelizeInstance = new Sequelize(url, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: 'Europe/Paris',  // Configure timezone pour gérer correctement les dates

    // Optimize connection pool to prevent EMFILE errors
    // Configuration adaptée pour VEEAM (système de sauvegarde DDT)
    pool: {
      max: 5,          // Maximum number of connections in pool
      min: 0,          // Minimum number of connections in pool
      acquire: 60000,  // 60s - Augmenté pour les snapshots VEEAM
      idle: 10000,     // Maximum time (ms) a connection can be idle before being released
      evict: 5000,     // Time interval (ms) to check for idle connections
      handleDisconnects: true // Automatically handle disconnects
    },

    // Additional optimizations
    // Timeouts augmentés pour compatibilité VEEAM
    dialectOptions: {
      connectTimeout: 60000, // 60 seconds - Snapshots VEEAM peuvent prendre du temps
      requestTimeout: 60000, // 60 seconds
      statement_timeout: 60000, // PostgreSQL specific
      query_timeout: 60000,     // PostgreSQL specific
      // Enable connection keep-alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    },

    // Retry configuration - Renforcé pour VEEAM
    retry: {
      max: 5, // Augmenté de 3 à 5 pour les snapshots VEEAM
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /EMFILE/,
        /EPIPE/,           // Broken pipe (peut arriver avec VEEAM)
        /PROTOCOL_ERROR/,  // Erreurs protocolaires
        /SequelizeConnectionError/, // Erreurs de connexion Sequelize
      ]
    },

    // Define hook to handle connection errors
    define: {
      charset: 'utf8',
      collate: 'utf8_general_ci',
      timestamps: true
    },

    // Additional Sequelize options for stability
    benchmark: false,
    omitNull: false,
    native: false,
    replication: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

    // Hooks for connection management
    hooks: {
      beforeConnect: (config) => {
        console.log('🔄 Attempting database connection...');
      },
      afterConnect: (connection, config) => {
        console.log('✅ Database connected successfully');
      },
      beforeDisconnect: (connection) => {
        console.log('🔌 Disconnecting from database...');
      }
    }
  });

  // Add error handling for the connection
  sequelizeInstance.authenticate()
      .then(() => {
        console.log('✅ Database connection has been established successfully.');
      })
      .catch(err => {
        console.error('❌ Unable to connect to the database:', err);
        // Reset the instance so it can be retried
        sequelizeInstance = null;
        throw err;
      });

  return sequelizeInstance;
};

// Create and export the singleton instance
const sequelize = createConnection();

// Add graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT. Closing database connection...');
  if (sequelizeInstance) {
    try {
      await sequelizeInstance.close();
      console.log('✅ Database connection closed successfully.');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM. Closing database connection...');
  if (sequelizeInstance) {
    try {
      await sequelizeInstance.close();
      console.log('✅ Database connection closed successfully.');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
  process.exit(0);
});

// Export both the instance and a function to get fresh instance if needed
module.exports = sequelize;

// Also export a function to manually close connections if needed (for testing/debugging)
module.exports.closeConnection = async () => {
  if (sequelizeInstance) {
    await sequelizeInstance.close();
    sequelizeInstance = null;
    console.log('🔌 Database connection closed manually.');
  }
};

// Export function to check connection status
module.exports.isConnected = () => {
  return sequelizeInstance && !sequelizeInstance.connectionManager.pool._draining;
};

// Export function to get connection info (for debugging)
module.exports.getConnectionInfo = () => {
  if (!sequelizeInstance) {
    return { status: 'not_initialized' };
  }

  const pool = sequelizeInstance.connectionManager.pool;
  return {
    status: 'initialized',
    poolSize: pool.size,
    poolUsed: pool.used,
    poolWaiting: pool.pending,
    poolMax: pool.max,
    poolMin: pool.min
  };
};
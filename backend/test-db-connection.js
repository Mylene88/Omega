// Script de test de connexion à la base de données PostgreSQL
// Usage: node test-db-connection.js

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Fonction pour charger le fichier .env manuellement (sans dotenv)
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envProductionPath = path.join(__dirname, '.env.production');
  
  let envFile = envPath;
  if (!fs.existsSync(envPath) && fs.existsSync(envProductionPath)) {
    envFile = envProductionPath;
  }
  
  if (!fs.existsSync(envFile)) {
    console.error('❌ Fichier .env ou .env.production introuvable');
    process.exit(1);
  }
  
  console.log(`📂 Chargement du fichier: ${path.basename(envFile)}\n`);
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

// Charger les variables d'environnement
loadEnvFile();

console.log('🔍 Test de connexion à la base de données PostgreSQL\n');

// Afficher les variables d'environnement (masquer le mot de passe)
console.log('📋 Configuration chargée:');
console.log('   POSTGRES_HOST:', process.env.POSTGRES_HOST || 'NON DÉFINI');
console.log('   POSTGRES_PORT:', process.env.POSTGRES_PORT || 'NON DÉFINI');
console.log('   POSTGRES_DB:', process.env.POSTGRES_DB || 'NON DÉFINI');
console.log('   POSTGRES_USR:', process.env.POSTGRES_USR || 'NON DÉFINI');
console.log('   POSTGRES_PWD:', process.env.POSTGRES_PWD ? '***' + process.env.POSTGRES_PWD.slice(-3) : 'NON DÉFINI');
console.log('');

// Construire l'URL de connexion
const {
  POSTGRES_URL,
  POSTGRES_HOST = 'localhost',
  POSTGRES_USR = 'postgres',
  POSTGRES_PWD = 'postgres',
  POSTGRES_DB = 'omega',
  POSTGRES_PORT = '5432',
} = process.env;

const connectionUrl = POSTGRES_URL || 
  `postgres://${POSTGRES_USR}:${POSTGRES_PWD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

console.log('🔗 URL de connexion:', connectionUrl.replace(POSTGRES_PWD, '***'));
console.log('');

// Créer l'instance Sequelize
const sequelize = new Sequelize(connectionUrl, {
  dialect: 'postgres',
  logging: false, // Désactiver les logs SQL pour plus de clarté
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Fonction de test
async function testConnection() {
  try {
    console.log('⏳ Tentative de connexion...\n');
    
    // Test 1: Authentification
    await sequelize.authenticate();
    console.log('✅ Connexion réussie à PostgreSQL');
    
    // Test 2: Vérifier la version de PostgreSQL
    const [results] = await sequelize.query('SELECT version()');
    console.log('📊 Version PostgreSQL:', results[0].version.split(',')[0]);
    
    // Test 3: Lister les schémas disponibles
    const [schemas] = await sequelize.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `);
    console.log('📁 Schémas disponibles:', schemas.map(s => s.schema_name).join(', '));
    
    // Test 4: Vérifier les tables principales
    const [tables] = await sequelize.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'principale'
      ORDER BY table_name
      LIMIT 10
    `);
    
    if (tables.length > 0) {
      console.log('📋 Tables trouvées dans le schéma "principale":');
      tables.forEach(t => {
        console.log(`   - ${t.table_name}`);
      });
    } else {
      console.log('⚠️  Aucune table trouvée dans le schéma "principale"');
    }
    
    // Test 5: Vérifier la table user
    const [userCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM principale.user
    `);
    console.log(`👥 Nombre d'utilisateurs: ${userCount[0].count}`);
    
    console.log('\n✅ TOUS LES TESTS RÉUSSIS - La base de données est opérationnelle!\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR DE CONNEXION:\n');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔴 Impossible de se connecter au serveur PostgreSQL');
      console.error(`   Vérifiez que PostgreSQL est démarré sur ${POSTGRES_HOST}:${POSTGRES_PORT}`);
    } else if (error.message.includes('authentication failed')) {
      console.error('🔴 Échec d\'authentification');
      console.error('   Vérifiez le nom d\'utilisateur et le mot de passe dans .env.production');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error(`🔴 La base de données "${POSTGRES_DB}" n'existe pas`);
      console.error('   Créez-la avec: CREATE DATABASE omega;');
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('🔴 Tables manquantes dans la base de données');
      console.error('   Exécutez les migrations avec: node scripts/runMigrations.js');
    } else {
      console.error('🔴 Erreur:', error.message);
    }
    
    console.error('\n📝 Détails techniques:');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le test
testConnection();

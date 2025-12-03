// Script pour réinitialiser le mot de passe d'un utilisateur
// Usage: node scripts/reset-password.js <username> <nouveau_mot_de_passe>

const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

// Configuration DB (même que database.js)
const {
  POSTGRES_URL,
  POSTGRES_HOST = 'localhost',
  POSTGRES_USR = 'postgres',
  POSTGRES_PWD = 'postgres',
  POSTGRES_DB = 'omega',
  POSTGRES_PORT = '5432',
} = process.env;

const url = POSTGRES_URL || `postgres://${POSTGRES_USR}:${POSTGRES_PWD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false
});

async function resetPassword(username, newPassword) {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour l'utilisateur
    const [rowsUpdated] = await sequelize.query(`
      UPDATE principale.user
      SET password_hash = :password_hash,
          password_changed_at = NOW(),
          password_expires_at = NOW() + INTERVAL '180 days',
          first_login = false
      WHERE username = :username
    `, {
      replacements: { username, password_hash }
    });

    if (rowsUpdated === 0) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log(`✅ Mot de passe réinitialisé pour l'utilisateur "${username}"`);
    console.log(`📅 Expiration du mot de passe : ${new Date(Date.now() + 180*24*60*60*1000).toLocaleDateString('fr-FR')}`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Récupérer les arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node scripts/reset-password.js <username> <nouveau_mot_de_passe>');
  console.log('');
  console.log('Exemple: node scripts/reset-password.js mylene.yo-gukoua "MonNouveauMdp123!"');
  console.log('');
  console.log('⚠️  Le mot de passe doit respecter la politique de sécurité :');
  console.log('   - Minimum 12 caractères');
  console.log('   - Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial');
  process.exit(1);
}

const [username, newPassword] = args;

// Validation basique du mot de passe
if (newPassword.length < 12) {
  console.error('❌ Le mot de passe doit contenir au moins 12 caractères');
  process.exit(1);
}

if (!/[A-Z]/.test(newPassword)) {
  console.error('❌ Le mot de passe doit contenir au moins une majuscule');
  process.exit(1);
}

if (!/[a-z]/.test(newPassword)) {
  console.error('❌ Le mot de passe doit contenir au moins une minuscule');
  process.exit(1);
}

if (!/[0-9]/.test(newPassword)) {
  console.error('❌ Le mot de passe doit contenir au moins un chiffre');
  process.exit(1);
}

if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(newPassword)) {
  console.error('❌ Le mot de passe doit contenir au moins un caractère spécial');
  process.exit(1);
}

console.log('🔄 Réinitialisation du mot de passe...');
resetPassword(username, newPassword);

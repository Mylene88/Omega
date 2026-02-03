// backend/lib/passwordPolicy.js

/**
 * Politique de sécurité des mots de passe
 * Conforme aux recommandations ANSSI et RGS niveau Standard
 *
 * Exigences :
 * - Minimum 12 caractères (ANSSI recommande 12+ pour usage professionnel)
 * - Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
 * - Pas de mots de passe communs
 * - Pas de répétitions excessives
 */

// Liste des mots de passe couramment utilisés (à bloquer)
const COMMON_PASSWORDS = [
  'password', 'motdepasse', 'admin', 'administrateur',
  'password123', 'admin123', 'welcome', 'bienvenue',
  'azerty', 'qwerty', '123456', '12345678', '1234567890',
  'password1', 'motdepasse1', 'omega', 'omega123'
];

// Mots à éviter dans les mots de passe
const FORBIDDEN_WORDS = [
  'omega', 'ddt', 'eureetloir', 'administration'
];

/**
 * Valide un mot de passe selon la politique de sécurité
 * @param {string} password - Le mot de passe à valider
 * @param {Object} userContext - Contexte utilisateur optionnel (username, prenom, nom)
 * @returns {Object} { valid: boolean, errors: string[], strength: string }
 */
export function validatePassword(password, userContext = {}) {
  const errors = [];
  let strength = 'faible';

  // Vérification 1 : Longueur minimale
  if (!password || password.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères');
  }

  // Vérification 2 : Longueur maximale (protection DoS)
  if (password && password.length > 128) {
    errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
  }

  if (!password) {
    return { valid: false, errors, strength };
  }

  // Vérification 3 : Au moins une minuscule
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule (a-z)');
  }

  // Vérification 4 : Au moins une majuscule
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule (A-Z)');
  }

  // Vérification 5 : Au moins un chiffre
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre (0-9)');
  }

  // Vérification 6 : Au moins un caractère spécial
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)');
  }

  // Vérification 7 : Pas de mots de passe communs
  const lowerPassword = password.toLowerCase();
  const matchedCommon = COMMON_PASSWORDS.find(common =>
    lowerPassword.includes(common.toLowerCase())
  );
  if (matchedCommon) {
    errors.push(`Le mot de passe ne doit pas contenir "${matchedCommon}"`);
  }

  // Vérification 8 : Pas de mots interdits
  const matchedForbidden = FORBIDDEN_WORDS.find(word =>
    lowerPassword.includes(word.toLowerCase())
  );
  if (matchedForbidden) {
    errors.push('Le mot de passe ne doit pas contenir des mots liés à l\'organisation');
  }

  // Vérification 9 : Pas de répétitions excessives (ex: "aaaaaa", "111111")
  if (/(.)\1{4,}/.test(password)) {
    errors.push('Le mot de passe ne doit pas contenir de caractères répétés plus de 4 fois');
  }

  // Vérification 10 : Pas de séquences simples (ex: "abcdef", "123456")
  if (hasSimpleSequence(password)) {
    errors.push('Le mot de passe ne doit pas contenir de séquences simples (abc, 123, etc.)');
  }

  // Vérification 11 : Ne pas contenir le nom d'utilisateur
  if (userContext.username && password.toLowerCase().includes(userContext.username.toLowerCase())) {
    errors.push('Le mot de passe ne doit pas contenir votre nom d\'utilisateur');
  }

  // Vérification 12 : Ne pas contenir le prénom ou nom
  if (userContext.prenom && password.toLowerCase().includes(userContext.prenom.toLowerCase())) {
    errors.push('Le mot de passe ne doit pas contenir votre prénom');
  }
  if (userContext.nom && password.toLowerCase().includes(userContext.nom.toLowerCase())) {
    errors.push('Le mot de passe ne doit pas contenir votre nom');
  }

  // Calcul de la force du mot de passe
  if (errors.length === 0) {
    strength = calculatePasswordStrength(password);
  }

  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Détecte les séquences simples dans un mot de passe
 */
function hasSimpleSequence(password) {
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'azertyuiopqsdfghjklmwxcvbn', // AZERTY français
    'qwertyuiopasdfghjklzxcvbnm'  // QWERTY
  ];

  const lowerPassword = password.toLowerCase();

  for (const sequence of sequences) {
    for (let i = 0; i < sequence.length - 4; i++) {
      const subSeq = sequence.substring(i, i + 5);
      if (lowerPassword.includes(subSeq)) {
        return true;
      }
      // Vérifier aussi la séquence inversée
      if (lowerPassword.includes(subSeq.split('').reverse().join(''))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calcule la force d'un mot de passe valide
 * @returns {string} 'moyen', 'fort', 'très fort'
 */
function calculatePasswordStrength(password) {
  let score = 0;

  // Longueur
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Diversité des caractères
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) score += 1;

  // Bonus pour plusieurs types de caractères spéciaux
  const specialChars = password.match(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/g);
  if (specialChars && specialChars.length >= 3) score += 1;

  // Complexité (mélange de types de caractères)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password);

  if (hasLower && hasUpper && hasDigit && hasSpecial) score += 2;

  // Classification
  if (score <= 5) return 'moyen';
  if (score <= 8) return 'fort';
  return 'très fort';
}

/**
 * Génère un mot de passe aléatoire sécurisé
 * @param {number} length - Longueur souhaitée (min 12)
 * @returns {string} Mot de passe généré
 */
export function generateSecurePassword(length = 16) {
  if (length < 12) length = 12;

  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // sans 'l' pour éviter confusion avec 1
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I, O pour éviter confusion
  const digits = '23456789'; // sans 0, 1 pour éviter confusion
  const special = '!@#$%^&*-_+=';

  // Garantir au moins un de chaque type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Remplir le reste
  const allChars = lowercase + uppercase + digits + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger les caractères
  password = password.split('').sort(() => Math.random() - 0.5).join('');

  return password;
}

/**
 * Vérifie si deux mots de passe sont trop similaires
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {boolean} true si trop similaires
 */
export function areTooSimilar(oldPassword, newPassword) {
  if (!oldPassword || !newPassword) return false;

  // Vérifier si le nouveau est simplement l'ancien avec un suffixe
  if (newPassword.startsWith(oldPassword) || oldPassword.startsWith(newPassword)) {
    return true;
  }

  // Calculer la distance de Levenshtein simplifiée
  const similarity = calculateSimilarity(oldPassword, newPassword);
  return similarity > 0.7; // Plus de 70% de similarité
}

/**
 * Calcule la similarité entre deux chaînes (0 = différent, 1 = identique)
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Configuration de la politique de mots de passe (exportée pour référence)
 */
export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireDigits: true,
  requireSpecialChars: true,
  maxRepeatingChars: 4,
  preventCommonPasswords: true,
  preventUserInfo: true,
  expirationDays: 180, // 6 mois
  historyCount: 5 // Ne pas réutiliser les 5 derniers mots de passe
};

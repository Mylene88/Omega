// backend/lib/inputValidation.js

/**
 * Validation et sanitization des entrées utilisateur
 * Protection contre XSS, SQL injection, et autres attaques
 * Conforme aux recommandations OWASP
 */

/**
 * Nettoie une chaîne de caractères des caractères dangereux
 * @param {*} input - Entrée à nettoyer
 * @param {Object} options - Options de nettoyage
 * @returns {string} Chaîne nettoyée
 */
export function sanitizeInput(input, options = {}) {
  const {
    maxLength = 1000,
    allowHtml = false,
    trim = true
  } = options;

  // Gérer les types non-string
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    input = String(input);
  }

  // Trim si demandé
  if (trim) {
    input = input.trim();
  }

  // Supprimer les caractères de contrôle dangereux
  input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Si HTML n'est pas autorisé, échapper les caractères HTML
  if (!allowHtml) {
    input = escapeHtml(input);
  }

  // Limiter la longueur
  if (input.length > maxLength) {
    input = input.substring(0, maxLength);
  }

  return input;
}

/**
 * Échappe les caractères HTML dangereux
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'\/]/g, (char) => map[char]);
}

/**
 * Valide un nom d'utilisateur
 * @param {string} username
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Le nom d\'utilisateur est requis' };
  }

  // Longueur
  if (username.length < 3) {
    return { valid: false, error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères' };
  }

  // Format : alphanumériques, tirets, underscores, points
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets, underscores et points' };
  }

  // Ne doit pas commencer par un chiffre
  if (/^[0-9]/.test(username)) {
    return { valid: false, error: 'Le nom d\'utilisateur ne peut pas commencer par un chiffre' };
  }

  return { valid: true };
}

/**
 * Valide une adresse email
 * @param {string} email
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'L\'adresse email est requise' };
  }

  // Longueur raisonnable
  if (email.length > 254) {
    return { valid: false, error: 'L\'adresse email est trop longue' };
  }

  // Format email basique (RFC 5322 simplifié)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Format d\'email invalide' };
  }

  // Vérifications supplémentaires
  const [localPart, domain] = email.split('@');

  if (localPart.length > 64) {
    return { valid: false, error: 'La partie locale de l\'email est trop longue' };
  }

  if (domain.length > 255) {
    return { valid: false, error: 'Le domaine de l\'email est trop long' };
  }

  // Caractères dangereux
  if (/[<>()[\]\\,;:\s"]/.test(localPart)) {
    return { valid: false, error: 'L\'email contient des caractères invalides' };
  }

  return { valid: true };
}

/**
 * Valide un numéro de téléphone français
 * @param {string} phone
 * @returns {Object} { valid: boolean, error?: string, normalized?: string }
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Le numéro de téléphone est requis' };
  }

  // Nettoyer le numéro
  const cleaned = phone.replace(/[\s\.\-\(\)]/g, '');

  // Format français : 10 chiffres ou avec indicatif +33
  const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:\d{8})$/;

  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Format de téléphone invalide (format attendu : 0X XX XX XX XX)' };
  }

  // Normaliser au format 0X XX XX XX XX
  let normalized = cleaned;
  if (normalized.startsWith('+33')) {
    normalized = '0' + normalized.substring(3);
  } else if (normalized.startsWith('0033')) {
    normalized = '0' + normalized.substring(4);
  }

  // Ajouter espaces
  normalized = normalized.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  return { valid: true, normalized };
}

/**
 * Valide un identifiant de projet
 * @param {string} projetId
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateProjetId(projetId) {
  if (!projetId || typeof projetId !== 'string') {
    return { valid: false, error: 'L\'identifiant de projet est requis' };
  }

  // Format attendu : PR-YYYY-XXXXX
  const projetIdRegex = /^PR-\d{4}-\d{5}$/;

  if (!projetIdRegex.test(projetId)) {
    return { valid: false, error: 'Format d\'identifiant de projet invalide (format attendu : PR-YYYY-XXXXX)' };
  }

  return { valid: true };
}

/**
 * Valide une URL
 * @param {string} url
 * @param {Object} options
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateUrl(url, options = {}) {
  const {
    allowedProtocols = ['http', 'https', 'file'],
    requireProtocol = true
  } = options;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'L\'URL est requise' };
  }

  if (url.length > 2048) {
    return { valid: false, error: 'L\'URL est trop longue' };
  }

  try {
    const urlObj = new URL(url);

    if (requireProtocol && !urlObj.protocol) {
      return { valid: false, error: 'L\'URL doit inclure un protocole' };
    }

    const protocol = urlObj.protocol.replace(':', '');
    if (allowedProtocols && !allowedProtocols.includes(protocol)) {
      return { valid: false, error: `Protocole non autorisé. Autorisés : ${allowedProtocols.join(', ')}` };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Format d\'URL invalide' };
  }
}

/**
 * Valide une date
 * @param {string|Date} date
 * @param {Object} options
 * @returns {Object} { valid: boolean, error?: string, date?: Date }
 */
export function validateDate(date, options = {}) {
  const {
    minDate = null,
    maxDate = null,
    allowFuture = true,
    allowPast = true
  } = options;

  if (!date) {
    return { valid: false, error: 'La date est requise' };
  }

  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }

  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Format de date invalide' };
  }

  const now = new Date();

  if (!allowFuture && dateObj > now) {
    return { valid: false, error: 'La date ne peut pas être dans le futur' };
  }

  if (!allowPast && dateObj < now) {
    return { valid: false, error: 'La date ne peut pas être dans le passé' };
  }

  if (minDate && dateObj < new Date(minDate)) {
    return { valid: false, error: `La date doit être après ${minDate}` };
  }

  if (maxDate && dateObj > new Date(maxDate)) {
    return { valid: false, error: `La date doit être avant ${maxDate}` };
  }

  return { valid: true, date: dateObj };
}

/**
 * Valide un entier
 * @param {*} value
 * @param {Object} options
 * @returns {Object} { valid: boolean, error?: string, value?: number }
 */
export function validateInteger(value, options = {}) {
  const {
    min = null,
    max = null,
    allowZero = true,
    allowNegative = true
  } = options;

  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'La valeur est requise' };
  }

  const num = Number(value);

  if (!Number.isInteger(num)) {
    return { valid: false, error: 'La valeur doit être un nombre entier' };
  }

  if (!allowZero && num === 0) {
    return { valid: false, error: 'La valeur ne peut pas être zéro' };
  }

  if (!allowNegative && num < 0) {
    return { valid: false, error: 'La valeur ne peut pas être négative' };
  }

  if (min !== null && num < min) {
    return { valid: false, error: `La valeur doit être au moins ${min}` };
  }

  if (max !== null && num > max) {
    return { valid: false, error: `La valeur ne peut pas dépasser ${max}` };
  }

  return { valid: true, value: num };
}

/**
 * Valide un texte libre (description, commentaire, etc.)
 * @param {string} text
 * @param {Object} options
 * @returns {Object} { valid: boolean, error?: string, sanitized?: string }
 */
export function validateText(text, options = {}) {
  const {
    minLength = 0,
    maxLength = 5000,
    allowEmpty = true,
    allowHtml = false
  } = options;

  if (!text && !allowEmpty) {
    return { valid: false, error: 'Le texte est requis' };
  }

  if (!text) {
    return { valid: true, sanitized: '' };
  }

  if (typeof text !== 'string') {
    return { valid: false, error: 'Le texte doit être une chaîne de caractères' };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    return { valid: false, error: `Le texte doit contenir au moins ${minLength} caractères` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Le texte ne peut pas dépasser ${maxLength} caractères` };
  }

  const sanitized = sanitizeInput(text, { allowHtml, maxLength });

  return { valid: true, sanitized };
}

/**
 * Détecte les tentatives d'injection SQL
 * @param {string} input
 * @returns {boolean} true si suspicion d'injection
 */
export function detectSqlInjection(input) {
  if (!input || typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(;|\|\||&&)/,
    /(--|\#|\/\*|\*\/)/,
    /('|"|`)(.*?)(OR|AND)(.*?)('|"|`)/i,
    /(UNION.*SELECT)/i,
    /(xp_cmdshell|sp_executesql)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Détecte les tentatives XSS
 * @param {string} input
 * @returns {boolean} true si suspicion de XSS
 */
export function detectXss(input) {
  if (!input || typeof input !== 'string') return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<object\b/gi,
    /<embed\b/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validation complète d'un objet avec schéma
 * @param {Object} data - Données à valider
 * @param {Object} schema - Schéma de validation
 * @returns {Object} { valid: boolean, errors: Object, sanitized: Object }
 */
export function validateObject(data, schema) {
  const errors = {};
  const sanitized = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Champ requis
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors[field] = `Le champ ${field} est requis`;
      continue;
    }

    // Si vide et non requis, passer
    if (!rules.required && (value === null || value === undefined || value === '')) {
      sanitized[field] = value;
      continue;
    }

    // Validation selon le type
    let result;
    switch (rules.type) {
      case 'string':
        result = validateText(value, rules);
        break;
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'integer':
        result = validateInteger(value, rules);
        break;
      case 'date':
        result = validateDate(value, rules);
        break;
      case 'url':
        result = validateUrl(value, rules);
        break;
      default:
        result = { valid: true, sanitized: value };
    }

    if (!result.valid) {
      errors[field] = result.error;
    } else {
      sanitized[field] = result.sanitized || result.value || result.normalized || value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

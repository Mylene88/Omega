/**
 * Utilitaire pour formater les dates avec le bon fuseau horaire français
 */

/**
 * Formate une date en format français avec timezone Europe/Paris
 * @param {string|Date} dateString - Date à formater (ISO string ou objet Date)
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée
 */
export const formatDateFr = (dateString, options = {}) => {
  if (!dateString) return 'N/A';

  try {
    // Parser la date - toujours traiter comme UTC si c'est une string
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      // Si la date ne contient pas de timezone (pas de 'Z' ni de '+/-' pour offset),
      // on ajoute 'Z' pour indiquer qu'elle est en UTC
      const dateStr = String(dateString);
      if (!dateStr.includes('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        date = new Date(dateStr + 'Z');
      } else {
        date = new Date(dateStr);
      }
    }

    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      console.error('Date invalide:', dateString);
      return 'Date invalide';
    }

    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: options.showSeconds ? '2-digit' : undefined,
      timeZone: 'Europe/Paris',
      hour12: false
    };

    return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(date);
  } catch (error) {
    console.error('Erreur formatage date:', error, dateString);
    return 'Date invalide';
  }
};

/**
 * Formate une date avec affichage des secondes
 * @param {string|Date} dateString
 * @returns {string}
 */
export const formatDateTimeFr = (dateString) => {
  return formatDateFr(dateString, { showSeconds: true });
};

/**
 * Formate uniquement l'heure
 * @param {string|Date} dateString
 * @returns {string}
 */
export const formatTimeFr = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      const dateStr = String(dateString);
      if (!dateStr.includes('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        date = new Date(dateStr + 'Z');
      } else {
        date = new Date(dateStr);
      }
    }

    if (isNaN(date.getTime())) {
      console.error('Date invalide:', dateString);
      return 'Heure invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Paris',
      hour12: false
    }).format(date);
  } catch (error) {
    console.error('Erreur formatage heure:', error, dateString);
    return 'Heure invalide';
  }
};

/**
 * Formate uniquement la date (sans heure)
 * @param {string|Date} dateString
 * @returns {string}
 */
export const formatDateOnlyFr = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      const dateStr = String(dateString);
      if (!dateStr.includes('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
        date = new Date(dateStr + 'Z');
      } else {
        date = new Date(dateStr);
      }
    }

    if (isNaN(date.getTime())) {
      console.error('Date invalide:', dateString);
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Paris'
    }).format(date);
  } catch (error) {
    console.error('Erreur formatage date:', error, dateString);
    return 'Date invalide';
  }
};

export default {
  formatDateFr,
  formatDateTimeFr,
  formatTimeFr,
  formatDateOnlyFr
};

// frontend/src/vizualisation/utils/DateFormat.js

export const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        // Parser la date et s'assurer qu'elle est traitée comme UTC si pas de timezone
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

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';

        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        // Parser la date et s'assurer qu'elle est traitée comme UTC si pas de timezone
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

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';

        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Paris'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDateLong = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        // Parser la date et s'assurer qu'elle est traitée comme UTC si pas de timezone
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

        if (isNaN(date.getTime())) return 'Non renseigné';

        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Europe/Paris'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatTime = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        // Parser la date et s'assurer qu'elle est traitée comme UTC si pas de timezone
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

        if (isNaN(date.getTime())) return 'Non renseigné';

        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
        });
    } catch (error) {
        console.error('Erreur lors du formatage de l\'heure:', error);
        return 'Non renseigné';
    }
};

// frontend/src/utils/DateFormat.js

export const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        const date = new Date(dateString);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';

        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris',
            hour12: false
        }).format(date);
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        const date = new Date(dateString);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) return 'Non renseigné';

        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Paris'
        }).format(date);
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatDateLong = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Non renseigné';

        return new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Europe/Paris'
        }).format(date);
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return 'Non renseigné';
    }
};

export const formatTime = (dateString) => {
    if (!dateString) return 'Non renseigné';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Non renseigné';

        return new Intl.DateTimeFormat('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris',
            hour12: false
        }).format(date);
    } catch (error) {
        console.error('Erreur lors du formatage de l\'heure:', error);
        return 'Non renseigné';
    }
};